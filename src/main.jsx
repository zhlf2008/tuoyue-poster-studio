import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { toBlob } from 'html-to-image'
import QRCode from 'qrcode'
import { save as chooseSavePath } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import {
  createNewPublicImageFile,
  PublicImageDir,
  removeFile as removeAndroidFile,
  scanPublicFile,
  setPublicFilePending,
  writeFile as writeAndroidFile,
} from 'tauri-plugin-android-fs-api'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowUpRight,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  ImagePlus,
  Layers3,
  LayoutGrid,
  LayoutTemplate,
  MoveDown,
  MoveUp,
  Palette,
  PanelTop,
  Plus,
  PlusCircle,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Settings2,
  Sparkles,
  Pencil,
  Check,
  X,
  Trash2,
  Type,
  Undo2,
  Upload,
  Users,
  Monitor,
} from 'lucide-react'
import './styles.css'

const POSTER = { baseWidth: 820, minHeight: 1220, paddingX: 40, columnGap: 22 }
const SAVE_KEY = 'meeting-poster-components-v2'
const PROJECTS_KEY = 'meeting-poster-projects-v1'
const CUSTOM_TEMPLATES_KEY = 'meeting-poster-custom-templates-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const PARTICIPANT_GRID = { width: 348, gap: 3, targetHeight: 1000, maxColumns: 120 }
const DESKTOP_DOWNLOAD_PAGE = 'https://www.ilanzou.com/s/KIIl6Er3'
const ANDROID_DOWNLOAD_PAGE = 'https://www.ilanzou.com/s/jqTl6EOJ'

function getParticipantColumns(count, gap = PARTICIPANT_GRID.gap, gridWidth = PARTICIPANT_GRID.width, targetHeight = PARTICIPANT_GRID.targetHeight) {
  const total = Math.max(1, Number(count) || 1)
  const maxColumns = Math.min(total, PARTICIPANT_GRID.maxColumns)
  let bestColumns = 1
  let bestDistance = Number.POSITIVE_INFINITY
  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const cellWidth = Math.max(1, (gridWidth - gap * (columns - 1)) / columns)
    const cellHeight = cellWidth * 9 / 16
    const rows = Math.ceil(total / columns)
    const gridHeight = rows * cellHeight + Math.max(0, rows - 1) * gap
    const distance = Math.abs(gridHeight - Math.max(120, targetHeight || PARTICIPANT_GRID.targetHeight))
    if (distance < bestDistance) {
      bestDistance = distance
      bestColumns = columns
    }
  }
  return bestColumns
}

function getComponentCardMode(component) {
  if (component.cardMode) return component.cardMode
  if (typeof component.showContainer === 'boolean') return component.showContainer ? 'show' : 'hide'
  return 'inherit'
}

function componentShowsCard(component, presentationMode) {
  const cardMode = getComponentCardMode(component)
  return cardMode === 'show' || (cardMode === 'inherit' && presentationMode === 'cards')
}

function getComponentContentWidth(component, container, containerWidth, presentationMode) {
  const containerInset = presentationMode === 'grouped' ? (container?.style?.padding || 0) * 2 : 0
  const cardInset = componentShowsCard(component, presentationMode) ? 40 : 0
  return Math.max(80, (containerWidth || PARTICIPANT_GRID.width) - containerInset - cardInset)
}

const TYPE_META = {
  rowGroup: { label: '横向组件组', icon: LayoutGrid, description: '2–4 个组件并列排版' },
  hero: { label: '主题标题', icon: Type, description: '主标题与副标题' },
  info: { label: '会议信息', icon: FileText, description: '标题与要点列表' },
  guestGrid: { label: '嘉宾组', icon: CircleUserRound, description: '自动排列照片与身份' },
  mosaic: { label: '参会照片网格', icon: Users, description: '批量上传 16:9 人物照片' },
  imageBlock: { label: '图片区', icon: ImagePlus, description: '单张图片与说明' },
  textBlock: { label: '多行文本', icon: PanelTop, description: '支持换行、字号与行距' },
  brand: { label: '页脚署名', icon: Sparkles, description: '品牌或组织名称' },
}

const CONTENT_CONTAINER_IDS = ['left', 'extra1', 'extra2', 'extra3', 'right']
const STRUCTURE_CONTAINER_IDS = ['header', 'left', 'extra1', 'extra2', 'extra3', 'right', 'footer']

const expandedPosterWidth = (columnWidths) => Math.max(
  POSTER.baseWidth,
  POSTER.paddingX * 2 + columnWidths.reduce((sum, width) => sum + width, 0) + POSTER.columnGap * Math.max(0, columnWidths.length - 1),
)

const LAYOUT_PRESETS = [
  { id: 'classic', label: '经典双栏', note: '326 + 392 px', columnWidths: [326, 392], containerIds: ['left', 'right'], classic: true },
  { id: 'single', label: '单栏通栏', note: '740 px', columnWidths: [740], containerIds: ['left'] },
  { id: 'dualEqual', label: '等宽双栏', note: '392 + 392 px', columnWidths: [392, 392], containerIds: ['left', 'right'] },
  { id: 'dualNarrowWide', label: '窄左宽右', note: '392 + 588 px', columnWidths: [392, 588], containerIds: ['left', 'right'] },
  { id: 'dualWideNarrow', label: '宽左窄右', note: '588 + 392 px', columnWidths: [588, 392], containerIds: ['left', 'right'] },
  { id: 'tripleEqual', label: '等宽三栏', note: '3 × 392 px', columnWidths: [392, 392, 392], containerIds: ['left', 'extra1', 'right'] },
  { id: 'tripleFocus', label: '重点三栏', note: '392 + 588 + 392 px', columnWidths: [392, 588, 392], containerIds: ['left', 'extra1', 'right'] },
  { id: 'tripleLead', label: '主栏三列', note: '588 + 392 + 392 px', columnWidths: [588, 392, 392], containerIds: ['left', 'extra1', 'right'] },
  { id: 'quadEqual', label: '等宽四栏', note: '4 × 392 px', columnWidths: [392, 392, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'right'] },
  { id: 'quadFocus', label: '重点四栏', note: '392 + 588 + 392 + 392 px', columnWidths: [392, 588, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'right'] },
  { id: 'pentaEqual', label: '等宽五栏', note: '5 × 392 px', columnWidths: [392, 392, 392, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'extra3', 'right'] },
  { id: 'pentaFocus', label: '重点五栏', note: '392 + 392 + 588 + 392 + 392 px', columnWidths: [392, 392, 588, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'extra3', 'right'] },
].map((preset) => ({ ...preset, width: expandedPosterWidth(preset.columnWidths) }))

const TEMPLATE_PRESETS = [
  { id: 'classicWarm', name: '暖橙会议纪实', description: '经典双栏，适合会议复盘与班会记录', layout: 'classic', background: 'warmPaper', columns: [1, 1] },
  { id: 'forumTriple', name: '三栏论坛全景', description: '嘉宾、回应与参会画面分栏呈现', layout: 'tripleFocus', background: 'clearSky', columns: [1, 1.5, 1] },
  { id: 'newYearGathering', name: '新春团拜会', description: '红金喜庆氛围，适合年会与团拜活动', layout: 'dualWideNarrow', background: 'newYear', columns: [1.5, 1] },
  { id: 'recognitionCeremony', name: '激励表彰盛典', description: '金色荣誉感，突出获奖人物与现场', layout: 'dualNarrowWide', background: 'recognition', columns: [1, 1.5] },
  { id: 'singleStory', name: '单栏活动长图', description: '按时间顺序纵向叙事，适合移动端分享', layout: 'single', background: 'sunrise', columns: [1] },
]

const BACKGROUND_PRESETS = [
  {
    id: 'warmPaper', label: '暖阳宣纸', note: '温暖、沉静', base: '#f8ead2', accent: '#b93b0d', text: '#6f3825',
    background: 'radial-gradient(circle at 10% 88%, rgba(255,139,56,.30), transparent 31%), radial-gradient(circle at 82% 18%, rgba(255,255,255,.62), transparent 30%), #f8ead2',
  },
  {
    id: 'sunrise', label: '朝霞橙光', note: '热烈、向上', base: '#fff0d8', accent: '#bd3f0d', text: '#713621',
    background: 'radial-gradient(circle at 16% 10%, rgba(255,194,91,.66), transparent 34%), radial-gradient(circle at 88% 34%, rgba(255,120,78,.34), transparent 38%), radial-gradient(circle at 42% 92%, rgba(255,219,142,.55), transparent 35%), #fff0d8',
  },
  {
    id: 'clearSky', label: '晴空万里', note: '清朗、开阔', base: '#eaf5f5', accent: '#bd400e', text: '#315b61',
    background: 'radial-gradient(circle at 18% 14%, rgba(255,222,135,.62), transparent 29%), radial-gradient(circle at 78% 20%, rgba(101,192,221,.38), transparent 40%), radial-gradient(circle at 20% 92%, rgba(120,206,193,.28), transparent 35%), #eaf5f5',
  },
  {
    id: 'springGreen', label: '春生新绿', note: '成长、希望', base: '#eff4df', accent: '#b63f0e', text: '#3f6146',
    background: 'radial-gradient(circle at 12% 18%, rgba(255,226,118,.55), transparent 30%), radial-gradient(circle at 82% 16%, rgba(131,190,124,.34), transparent 37%), radial-gradient(circle at 52% 94%, rgba(183,214,116,.38), transparent 36%), #eff4df',
  },
  {
    id: 'peachBloom', label: '桃李春风', note: '亲和、明亮', base: '#fbe8df', accent: '#b83e18', text: '#754139',
    background: 'radial-gradient(circle at 15% 15%, rgba(255,190,161,.48), transparent 33%), radial-gradient(circle at 86% 22%, rgba(255,222,153,.48), transparent 36%), radial-gradient(circle at 30% 90%, rgba(238,149,136,.28), transparent 35%), #fbe8df',
  },
  {
    id: 'golden', label: '金色庆典', note: '庄重、丰盛', base: '#f6ecd5', accent: '#b53e13', text: '#674326',
    background: 'radial-gradient(circle at 18% 12%, rgba(255,205,92,.58), transparent 29%), radial-gradient(circle at 82% 18%, rgba(219,128,38,.24), transparent 34%), radial-gradient(circle at 62% 88%, rgba(255,224,150,.58), transparent 39%), #f6ecd5',
  },
  {
    id: 'newYear', label: '新春喜庆', note: '红火、团圆', base: '#f7ddd0', accent: '#b5261c', text: '#542923',
    background: 'radial-gradient(circle at 14% 12%, rgba(255,205,88,.58), transparent 28%), radial-gradient(circle at 88% 18%, rgba(210,54,37,.28), transparent 34%), radial-gradient(circle at 52% 94%, rgba(176,27,22,.20), transparent 42%), linear-gradient(145deg, #fbe8d8, #efc4bb)',
  },
  {
    id: 'solemnRedGold', label: '大红鎏金', note: '庄重、典礼', base: '#8f1118', accent: '#f2c766', text: '#5b261e', onBackground: '#ffe6a5',
    background: '#8f1118',
  },
  {
    id: 'recognition', label: '激励表彰', note: '荣耀、奋进', base: '#f4e5bd', accent: '#b72d20', text: '#5e432a',
    background: 'radial-gradient(circle at 16% 10%, rgba(255,210,82,.72), transparent 30%), radial-gradient(circle at 84% 16%, rgba(183,45,32,.28), transparent 34%), radial-gradient(circle at 56% 92%, rgba(226,159,42,.42), transparent 40%), linear-gradient(145deg, #fbf0cf, #ead4a2)',
  },
]

const defaultGuest = (name = '嘉宾姓名', role = '嘉宾身份') => ({ id: uid(), name, role, image: '' })

const DEMO_NAMES = ['林知夏', '周景行', '许安然', '沈明远', '陆星河', '苏清和', '程若谷', '顾言初', '夏闻溪', '江予安', '宋云舟', '叶书宁', '韩嘉树', '乔映雪', '方予晴', '秦慕川']
const DEMO_CLASSES = ['明德共学一班', '知行研修二班', '星火成长三班', '春晖实践一班', '博雅共创二班', '清和进阶班', '致远领航班', '同心研习班']
const DEMO_ROLES = ['组织委员', '班长', '学习委员', '执行班长', '宣传委员', '秘书长', '共创召集人', '课程联络员']

function shuffled(values) {
  return [...values].sort(() => Math.random() - .5)
}

function generateDemoGuests(count) {
  const names = shuffled(DEMO_NAMES)
  const classes = shuffled(DEMO_CLASSES)
  return Array.from({ length: count }, (_, index) => defaultGuest(
    names[index % names.length],
    `${classes[index % classes.length]} · ${DEMO_ROLES[index % DEMO_ROLES.length]}`,
  ))
}

function componentDefaults(type) {
  const base = { id: uid(), type, visible: true, gapAfter: 14, cardMode: 'inherit' }
  switch (type) {
    case 'hero':
      return { ...base, title: '良知班委夜话', subtitle: '义乌地区经典课堂组织委员共创会', titleSize: 48, subtitleSize: 12, subtitleDecoration: 'solid', align: 'center', cardMode: 'hide' }
    case 'info':
      return { ...base, heading: '夜话回顾', rows: ['夜话时间：7月5日 周日晚 20:00', '面向人群：全体经典课堂班委'], cardMode: 'show' }
    case 'guestGrid':
      return { ...base, heading: '嘉宾分享', columns: 2, items: [defaultGuest(), defaultGuest()] }
    case 'mosaic':
      return { ...base, heading: '参会人员', photos: [], count: 20, photoGap: 3 }
    case 'imageBlock':
      return { ...base, heading: '会议现场', image: '', caption: '点击右侧上传图片', fit: 'cover' }
    case 'textBlock':
      return { ...base, heading: '多行文本', body: '在这里输入会议总结、嘉宾金句或活动说明。\n支持输入多行内容，并分别设置字号和行距。', align: 'left', fontSize: 11, lineHeight: 1.72 }
    case 'brand':
      return { ...base, text: '义起发光', note: '', textSize: 25, noteSize: 8, cardMode: 'hide' }
    case 'rowGroup': {
      const text = { ...componentDefaults('textBlock'), heading: '共创要点', body: '在这里填写并列展示的重点内容。', gapAfter: 0 }
      const image = { ...componentDefaults('imageBlock'), heading: '现场画面', gapAfter: 0 }
      return { ...base, columns: 2, ratios: [1, 1], slotGap: 12, children: [text, image], cardMode: 'hide' }
    }
    default:
      return base
  }
}

function createInitialPoster() {
  const demoGuests = generateDemoGuests(10)
  return {
    version: 3,
    projectId: uid(),
    name: '暖橙会议纪实',
    layout: 'classic',
    containerMode: 'preset',
    headerLayoutVersion: 2,
    layoutRatios: {},
    paddingTop: 38,
    paddingBottom: 34,
    backgroundStyle: 'warmPaper',
    background: '#f8ead2',
    accent: '#b93b0d',
    textColor: '#6f3825',
    containers: [
      {
        id: 'header', name: '全局页头', description: '跨栏显示标题与会议信息',
        style: { background: 'transparent', padding: 0, gap: 14, radius: 0 },
        components: [],
      },
      {
        id: 'left', name: '首栏内容', description: '嘉宾、议程与主要正文',
        style: { background: 'rgba(255,253,247,.78)', padding: 22, gap: 16, radius: 22 },
        components: [
          componentDefaults('hero'),
          componentDefaults('info'),
          {
            ...componentDefaults('guestGrid'), heading: '特邀分享 · 回应嘉宾',
            items: demoGuests.slice(0, 6),
          },
          {
            ...componentDefaults('guestGrid'), heading: '提问嘉宾',
            items: demoGuests.slice(6, 8),
          },
          {
            ...componentDefaults('guestGrid'), heading: '答疑砥砺 · 夜话总结',
            items: demoGuests.slice(8, 10),
          },
        ],
      },
      {
        id: 'right', name: '末栏内容', description: '末栏组件与参会照片网格',
        style: { background: 'rgba(255,253,247,.82)', padding: 22, gap: 16, radius: 22 },
        components: [componentDefaults('mosaic')],
      },
      {
        id: 'extra1', name: '中栏内容 A', description: '三至五栏布局的扩展内容',
        style: { background: 'rgba(255,253,247,.80)', padding: 18, gap: 14, radius: 20 },
        components: [],
      },
      {
        id: 'extra2', name: '中栏内容 B', description: '四至五栏布局的第二扩展内容',
        style: { background: 'rgba(255,253,247,.80)', padding: 18, gap: 14, radius: 20 },
        components: [],
      },
      {
        id: 'extra3', name: '中栏内容 C', description: '五栏布局的第三扩展内容',
        style: { background: 'rgba(255,253,247,.80)', padding: 18, gap: 14, radius: 20 },
        components: [],
      },
      {
        id: 'footer', name: '全局页脚', description: '跨栏显示品牌与组织署名',
        style: { background: 'transparent', padding: 0, gap: 8, radius: 0 },
        components: [componentDefaults('brand')],
      },
    ],
  }
}

const deepClone = (value) => structuredClone(value)
const getContainer = (poster, id) => poster.containers.find((container) => container.id === id)

function findComponentContext(list, componentId, parent = null) {
  for (let index = 0; index < (list || []).length; index += 1) {
    const component = list[index]
    if (!component) continue
    if (component.id === componentId) return { component, list, index, parent }
    if (Array.isArray(component.children)) {
      const nested = findComponentContext(component.children, componentId, component)
      if (nested) return nested
    }
  }
  return null
}

const getComponentContext = (poster, containerId, componentId) => findComponentContext(getContainer(poster, containerId)?.components || [], componentId)
const getComponent = (poster, containerId, componentId) => getComponentContext(poster, containerId, componentId)?.component

function visitComponents(components, visitor) {
  ;(components || []).forEach((component) => {
    if (!component) return
    visitor(component)
    if (Array.isArray(component.children)) visitComponents(component.children, visitor)
  })
}

function cloneComponentWithFreshIds(component) {
  const copy = deepClone(component)
  const refresh = (current) => {
    current.id = uid()
    if (Array.isArray(current.items)) current.items = current.items.map((item) => ({ ...item, id: uid() }))
    if (Array.isArray(current.children)) current.children.filter(Boolean).forEach(refresh)
  }
  refresh(copy)
  return copy
}

function ensureColumnHeaderLayout(poster) {
  if (poster.headerLayoutVersion === 2) return
  const header = getContainer(poster, 'header')
  const firstColumn = getContainer(poster, 'left')
  if (header && firstColumn) {
    const pageHeaderComponents = header.components.filter((component) => ['hero', 'info'].includes(component.type))
    if (pageHeaderComponents.length) {
      firstColumn.components.unshift(...pageHeaderComponents)
      header.components = header.components.filter((component) => !pageHeaderComponents.includes(component))
    }
  }
  poster.headerLayoutVersion = 2
}

const LEGACY_CONTAINER_NAMES = {
  header: ['页头容器', '全局页头'],
  left: ['左栏内容容器', '首栏内容'],
  right: ['右栏参会容器', '末栏 · 参会内容', '末栏内容'],
  extra1: ['扩展内容栏 3', '中栏内容 A'],
  extra2: ['扩展内容栏 4', '中栏内容 B'],
  extra3: ['扩展内容栏 5', '中栏内容 C'],
  footer: ['页脚容器', '全局页脚'],
}

function migrateStructureNames(poster) {
  const fresh = createInitialPoster()
  poster.containers.forEach((container) => {
    const acceptedNames = LEGACY_CONTAINER_NAMES[container.id]
    if (acceptedNames?.includes(container.name)) {
      const replacement = getContainer(fresh, container.id)
      container.name = replacement.name
      container.description = replacement.description
    }
  })
}

function buildTemplatePoster(templateId) {
  const template = TEMPLATE_PRESETS.find((item) => item.id === templateId) || TEMPLATE_PRESETS[0]
  const poster = createInitialPoster()
  const background = BACKGROUND_PRESETS.find((item) => item.id === template.background) || BACKGROUND_PRESETS[0]
  poster.projectId = uid()
  poster.name = template.name
  poster.layout = template.layout
  poster.backgroundStyle = background.id
  poster.background = background.base
  poster.accent = background.accent
  poster.textColor = background.text

  const left = getContainer(poster, 'left')
  const right = getContainer(poster, 'right')
  const extra1 = getContainer(poster, 'extra1')
  if (template.id === 'forumTriple') {
    const [hero, info, firstGuest, secondGuest, thirdGuest] = left.components
    left.components = [hero, info, firstGuest]
    extra1.components = [secondGuest, thirdGuest]
  }
  if (template.id === 'newYearGathering') {
    const hero = left.components.find((component) => component.type === 'hero')
    hero.title = '同心迎新 · 共赴新程'
    hero.subtitle = '星火成长班新春团拜共创会'
    hero.subtitleDecoration = 'stars'
  }
  if (template.id === 'recognitionCeremony') {
    const hero = left.components.find((component) => component.type === 'hero')
    hero.title = '向光而行 · 荣耀时刻'
    hero.subtitle = '年度优秀班委激励表彰盛典'
    hero.subtitleDecoration = 'diamonds'
  }
  if (template.id === 'singleStory') {
    left.components.push(...right.components)
    right.components = []
  }
  return poster
}

function readSavedProjects() {
  try {
    const value = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function readCustomTemplates() {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATES_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}

function getPosterTitle(poster) {
  let title = ''
  for (const container of poster?.containers || []) {
    visitComponents(container.components, (component) => {
      if (!title && component.type === 'hero' && component.title?.trim()) title = component.title.trim()
    })
    if (title) break
  }
  return title || poster?.name?.trim() || '未命名海报'
}

async function compressPreviewBlob(blob, maxWidth = 360) {
  const bitmap = await createImageBitmap(blob)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')
  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/webp', .76)
}

function optimizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const image = new Image()
      image.onerror = reject
      image.onload = () => {
        const maxEdge = 1200
        const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight))
        const width = Math.max(1, Math.round(image.naturalWidth * scale))
        const height = Math.max(1, Math.round(image.naturalHeight * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        context.imageSmoothingEnabled = true
        context.imageSmoothingQuality = 'high'
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/webp', .84))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

function IconButton({ label, onClick, disabled, children }) {
  return <button className="icon-button" aria-label={label} title={label} onClick={onClick} disabled={disabled}>{children}</button>
}

function Field({ label, hint, children }) {
  return <label className="field"><span>{label}{hint && <em>{hint}</em>}</span>{children}</label>
}

function PosterMiniPreview({ poster, preview, compact = false }) {
  const layout = LAYOUT_PRESETS.find((item) => item.id === poster?.layout) || LAYOUT_PRESETS[0]
  const background = BACKGROUND_PRESETS.find((item) => item.id === poster?.backgroundStyle)
  const allComponents = poster?.containers?.flatMap((container) => container.components || []) || []
  const hero = allComponents.find((component) => component.type === 'hero')
  const visibleColumns = layout.containerIds.map((id) => getContainer(poster, id)).filter(Boolean)
  if (preview) return <img className="saved-cover-image" src={preview} alt="项目自定义预览图" />
  return (
    <div className={`poster-miniature theme-mini-${background?.id || 'custom'} ${compact ? 'compact' : ''}`} style={{ '--mini-bg': background?.background || poster?.background || '#f4e7d2', '--mini-accent': background?.accent || poster?.accent || '#d95b22', '--mini-text': background?.text || poster?.textColor || '#5d3d2e' }}>
      <div className="poster-miniature-frame">
        <strong>{hero?.title || poster?.name || '会议海报'}</strong>
        <span>{hero?.subtitle || '结构化内容预览'}</span>
        <div className="poster-miniature-columns" style={{ gridTemplateColumns: layout.columnWidths.map((width) => `${width}fr`).join(' ') }}>
          {visibleColumns.map((container) => <i key={container.id}>{(container.components || []).filter((component) => component.visible !== false).slice(0, 5).map((component) => <b key={component.id} className={`mini-component mini-${component.type}`} />)}</i>)}
        </div>
      </div>
    </div>
  )
}

function PropertyNav({ items }) {
  const jumpTo = (sectionId) => {
    const target = document.querySelector(`.right-panel [data-property-section="${sectionId}"]`)
    const scroller = target?.closest('.properties-body')
    if (target && scroller) scroller.scrollTo({ top: Math.max(0, target.offsetTop - 48), behavior: 'smooth' })
  }
  return (
    <nav className="properties-nav" aria-label="属性设置导航">
      {items.map(([id, label]) => <button key={id} onClick={() => jumpTo(id)}>{label}</button>)}
    </nav>
  )
}

function EmptyPhoto({ index = 0 }) {
  return (
    <div className={`empty-photo tone-${index % 5}`}>
      <CircleUserRound size={28} />
      <span>待上传</span>
    </div>
  )
}

function GuestCard({ item, index, selected, onSelect }) {
  return (
    <button className={`poster-guest-card ${selected ? 'selected-item' : ''}`} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <div className="guest-photo">{item.image ? <img src={item.image} alt="" /> : <EmptyPhoto index={index} />}</div>
      <strong>{item.name || '未命名嘉宾'}</strong>
      <span>{item.role || '点击填写身份'}</span>
    </button>
  )
}

function useMeasuredContentWidth(enabled) {
  const elementRef = useRef(null)
  const [contentWidth, setContentWidth] = useState(0)
  useEffect(() => {
    const element = elementRef.current
    if (!enabled || !element) return undefined
    const measure = () => {
      const style = getComputedStyle(element)
      const horizontalPadding = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
      const width = Math.max(0, element.clientWidth - horizontalPadding)
      setContentWidth((current) => Math.abs(current - width) > .5 ? width : current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled])
  return [elementRef, contentWidth]
}

function PosterComponent({ component, container, containerWidth, containerId, selection, onSelect, exporting, presentationMode }) {
  const [mosaicRef, measuredMosaicWidth] = useMeasuredContentWidth(component.type === 'mosaic')
  if (!component.visible) return null
  const selected = !exporting && selection?.kind === 'component' && selection.componentId === component.id
  const selectComponent = (event) => {
    event.stopPropagation()
    onSelect({ kind: 'component', containerId, componentId: component.id })
  }
  const showContainer = componentShowsCard(component, presentationMode)
  const hasHeading = typeof component.heading === 'string' ? component.heading.trim().length > 0 : null
  const className = `poster-component component-${component.type} ${showContainer ? 'has-container' : 'no-container'} ${hasHeading === null ? '' : hasHeading ? 'has-heading' : 'no-heading'} ${selected ? 'selected-component' : ''}`

  if (component.type === 'rowGroup') {
    const columns = Math.max(2, Math.min(4, component.columns || 2))
    const ratios = Array.from({ length: columns }, (_, index) => Math.max(1, Math.min(5, Number(component.ratios?.[index]) || 1)))
    const slotGap = component.slotGap ?? 12
    const groupWidth = getComponentContentWidth(component, container, containerWidth, presentationMode)
    const usableWidth = Math.max(80, groupWidth - slotGap * (columns - 1))
    const ratioTotal = ratios.reduce((sum, ratio) => sum + ratio, 0)
    return (
      <section className={className} style={{ marginBottom: component.gapAfter }} onClick={selectComponent}>
        <div className="row-component-grid" style={{ gridTemplateColumns: ratios.map((ratio) => `${ratio}fr`).join(' '), gap: slotGap }}>
          {Array.from({ length: columns }, (_, index) => {
            const child = component.children?.[index]
            const slotWidth = usableWidth * ratios[index] / ratioTotal
            return <div className={`row-component-slot ${child ? 'has-child' : 'is-empty'}`} key={child?.id || `slot-${index}`}>{child ? <PosterComponent component={child} container={container} containerWidth={slotWidth} containerId={containerId} selection={selection} onSelect={onSelect} exporting={exporting} presentationMode={presentationMode} /> : !exporting && <div className="row-empty-slot"><Plus size={16} /><span>空位置 {index + 1}</span></div>}</div>
          })}
        </div>
      </section>
    )
  }

  if (component.type === 'hero') {
    return (
      <section className={className} style={{ textAlign: component.align, marginBottom: component.gapAfter }} onClick={selectComponent}>
        <h1 style={{ fontSize: component.titleSize }}>{component.title}</h1>
        {component.subtitle?.trim() && <div className={`hero-subtitle decoration-${component.subtitleDecoration || 'solid'}`} style={{ fontSize: component.subtitleSize ?? 12 }}><i /><span>{component.subtitle}</span><i /></div>}
      </section>
    )
  }

  if (component.type === 'info') {
    return (
      <section className={className} style={{ marginBottom: component.gapAfter }} onClick={selectComponent}>
        {hasHeading && <div className="poster-pill">{component.heading}</div>}
        <ul>{component.rows.map((row, index) => <li key={`${component.id}-${index}`}>{row}</li>)}</ul>
      </section>
    )
  }

  if (component.type === 'guestGrid') {
    return (
      <section className={className} style={{ marginBottom: component.gapAfter }} onClick={selectComponent}>
        {hasHeading && <div className="poster-pill">{component.heading}</div>}
        <div className="guest-grid" style={{ gridTemplateColumns: `repeat(${component.columns}, minmax(0, 1fr))` }}>
          {component.items.map((item, index) => (
            <GuestCard key={item.id} item={item} index={index} selected={!exporting && selection?.kind === 'item' && selection.componentId === component.id && selection.itemId === item.id} onSelect={() => onSelect({ kind: 'item', containerId, componentId: component.id, itemId: item.id })} />
          ))}
        </div>
      </section>
    )
  }

  if (component.type === 'mosaic') {
    const photos = component.photos || []
    const total = Math.max(1, Math.min(300, Math.max(component.count || 0, photos.length)))
    const photoGap = component.photoGap ?? 3
    const gridWidth = measuredMosaicWidth || getComponentContentWidth(component, container, containerWidth, presentationMode)
    const gridHeight = PARTICIPANT_GRID.targetHeight
    const columns = getParticipantColumns(total, photoGap, gridWidth, gridHeight)
    const cells = Array.from({ length: total })
    return (
      <section ref={mosaicRef} className={className} style={{ marginBottom: component.gapAfter }} onClick={selectComponent}>
        {hasHeading && <div className="poster-pill">{component.heading}</div>}
        <div className="participant-grid" data-columns={columns} data-gap={photoGap} data-grid-width={gridWidth} data-grid-height={gridHeight} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: photoGap }}>
          {cells.map((_, index) => (
            <div className="participant-cell" key={index}>
              {photos[index] ? <img src={photos[index]} alt={`参会人员 ${index + 1}`} /> : <div className="participant-empty"><CircleUserRound size={15} /><span>待上传</span></div>}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (component.type === 'imageBlock') {
    return (
      <section className={className} style={{ marginBottom: component.gapAfter }} onClick={selectComponent}>
        {hasHeading && <div className="poster-pill">{component.heading}</div>}
        <div className="poster-image-block">{component.image ? <img src={component.image} alt="" style={{ objectFit: component.fit }} /> : <div><ImagePlus size={28} /><span>上传图片</span></div>}</div>
        {component.caption && <p>{component.caption}</p>}
      </section>
    )
  }

  if (component.type === 'textBlock') {
    return (
      <section className={className} style={{ marginBottom: component.gapAfter, textAlign: component.align }} onClick={selectComponent}>
        {hasHeading && <div className="poster-pill">{component.heading}</div>}
        <p className="poster-body-text" style={{ fontSize: component.fontSize ?? 11, lineHeight: component.lineHeight ?? 1.72 }}>{component.body}</p>
      </section>
    )
  }

  if (component.type === 'brand') {
    return <section className={className} onClick={selectComponent}><strong className="poster-brand" style={{ fontSize: component.textSize ?? 25 }}>{component.text}</strong>{component.note && <span className="poster-brand-note" style={{ fontSize: component.noteSize ?? 8 }}>{component.note}</span>}</section>
  }
  return null
}

function PosterContainer({ container, containerWidth, poster, selection, onSelect, exporting, presentationMode }) {
  const selected = !exporting && selection?.kind === 'container' && selection.containerId === container.id
  const style = {
    background: container.style.background,
    padding: container.style.padding,
    gap: container.style.gap,
    borderRadius: container.style.radius,
    '--container-bg': container.style.background,
    '--container-padding': `${container.style.padding}px`,
    '--container-radius': `${container.style.radius}px`,
  }
  return (
    <div className={`poster-container zone-${container.id} ${presentationMode}-mode ${selected ? 'selected-container' : ''}`} style={style} onClick={(event) => { event.stopPropagation(); onSelect({ kind: 'container', containerId: container.id }) }}>
      {!exporting && <span className="container-tag">{container.name}</span>}
      {container.components.map((component) => <PosterComponent key={component.id} component={component} container={container} containerWidth={containerWidth} containerId={container.id} selection={selection} onSelect={onSelect} exporting={exporting} poster={poster} presentationMode={presentationMode} />)}
      {!exporting && container.components.length === 0 && <div className="empty-container-message"><Plus size={18} /><span>空内容栏</span><em>从组件库添加内容</em></div>}
    </div>
  )
}

function StructureComponentNode({ component, index, containerId, selection, onSelect, nested = false }) {
  const Icon = TYPE_META[component.type].icon
  const label = component.type === 'hero' ? component.title : component.heading || component.text || TYPE_META[component.type].label
  return <div className={nested ? 'tree-nested-node' : ''}>
    <button className={`tree-component ${nested ? 'nested' : ''} ${selection?.componentId === component.id ? 'active' : ''}`} onClick={() => onSelect({ kind: 'component', containerId, componentId: component.id })}><span className="tree-index">{nested ? '↳' : index + 1}</span><Icon size={14} /><em>{label}</em>{component.visible ? <Eye size={12} /> : <EyeOff size={12} />}</button>
    {component.type === 'rowGroup' && <div className="tree-nested-components">{(component.children || []).slice(0, component.columns || 2).filter(Boolean).map((child, childIndex) => <StructureComponentNode key={child.id} component={child} index={childIndex} containerId={containerId} selection={selection} onSelect={onSelect} nested />)}</div>}
  </div>
}

function DownloadQrCode({ value }) {
  const [source, setSource] = useState('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(value, { width: 180, margin: 1, color: { dark: '#45251b', light: '#fff9ed' } })
      .then((url) => { if (active) setSource(url) })
      .catch(() => { if (active) setSource('') })
    return () => { active = false }
  }, [value])

  return <div className="platform-qr" aria-label="扫码打开下载页">
    <div className="platform-qr-frame">{source ? <img src={source} alt="安卓下载二维码" /> : <span>二维码</span>}</div>
    <span>扫码下载</span>
  </div>
}

function BrandPortal({ onStart, onTemplates, onProjects }) {
  return <main className="brand-portal">
    <div className="portal-grain" aria-hidden="true" />
    <section className="portal-hero">
      <div className="portal-hero-copy">
        <div className="portal-kicker"><span className="portal-kicker-mark" />STRUCTURED POSTER ATELIER<span className="portal-kicker-line" /></div>
        <h1>把一场会议，<br /><em>排成一幅作品。</em></h1>
        <p className="portal-lede">橐龠海报工坊把复杂的会议内容拆成可复用组件，让标题、人物与信息在每一次编辑中都保持秩序与气韵。</p>
        <div className="portal-hero-actions"><button className="portal-primary-cta" onClick={onStart}>开始创作 <ArrowUpRight size={17} /></button><button className="portal-text-cta" onClick={onTemplates}>浏览版式 <span>01</span></button></div>
        <div className="portal-proof"><div><strong>01</strong><span>组件化排版</span></div><i /><div><strong>03</strong><span>端上自由创作</span></div><i /><div><strong>∞</strong><span>风格可沉淀</span></div></div>
      </div>
      <div className="portal-hero-art">
        <div className="portal-orbit orbit-one" /><div className="portal-orbit orbit-two" />
        <div className="portal-seal"><img src="/brand-logo.png" alt="橐龠品牌标志" /><span>橐龠<br />海报工坊</span></div>
        <div className="portal-poster-card"><div className="portal-poster-meta">YI QI · 2026</div><div className="portal-poster-title">良知班委夜话</div><div className="portal-poster-rule" /><div className="portal-poster-subtitle">让每一次相遇，都值得被记录</div><div className="portal-poster-grid">{Array.from({ length: 9 }).map((_, index) => <i key={index} style={{ '--delay': `${index * 80}ms` }} />)}</div><div className="portal-poster-footer">STRUCTURED BY TUOYUE</div></div>
        <div className="portal-art-caption"><span>EDITORIAL<br />ATELIER</span><i /><b>卷首 · 01</b></div>
      </div>
    </section>

    <section className="portal-platforms" id="download">
      <div className="portal-section-intro"><span>ONE SYSTEM · THREE DOORS</span><h2>在适合你的地方，<em>继续创作。</em></h2><p>同一套组件与排版逻辑，覆盖浏览器、桌面端与 Android。先在线试用，喜欢再带走。</p></div>
      <div className="platform-grid">
        <button className="platform-card platform-card-main" onClick={onStart}><span className="platform-index">01 / WEB</span><Globe2 size={21} /><h3>在线工作台</h3><p>无需安装，打开即用。适合快速起稿、协作与导出。</p><strong>进入编辑器 <ArrowUpRight size={15} /></strong></button>
        <a className="platform-card" href={DESKTOP_DOWNLOAD_PAGE} target="_blank" rel="noreferrer"><span className="platform-index">02 / DESKTOP</span><Monitor size={21} /><h3>桌面端</h3><p>单文件免安装，前往蓝奏云下载页获取最新便携版。</p><strong>打开下载页 <ArrowUpRight size={15} /></strong></a>
        <a className="platform-card platform-card-android" href={ANDROID_DOWNLOAD_PAGE} target="_blank" rel="noreferrer"><span className="platform-index">03 / ANDROID</span><Smartphone size={21} /><h3>Android</h3><p>点击卡片打开蓝奏云下载页，也可以使用右侧二维码扫码下载。</p><div className="platform-card-footer"><strong>打开下载页 <ArrowUpRight size={15} /></strong><DownloadQrCode value={ANDROID_DOWNLOAD_PAGE} /></div></a>
      </div>
    </section>

    <section className="portal-manifesto"><div className="manifesto-mark">「</div><div><span>OUR METHOD</span><p>先把内容理顺，<br /><em>再让美感自然发生。</em></p></div><div className="manifesto-note">从会议信息到参会照片，每个模块都有自己的位置。<br />不靠散落图层，靠清晰的结构持续生长。</div></section>
    <footer className="portal-footer"><div className="portal-footer-brand"><img src="/brand-logo.png" alt="橐龠品牌标志" /><span><strong>橐龠</strong><small>海报工坊</small></span></div><nav><button onClick={onStart}>在线编辑</button><button onClick={onTemplates}>模板中心</button><button onClick={onProjects}>我的项目</button></nav><span>© 2026 TUOYUE POSTER STUDIO</span></footer>
  </main>
}

function App() {
  const initial = useMemo(() => createInitialPoster(), [])
  const [poster, setPoster] = useState(initial)
  const [appView, setAppView] = useState(() => window.location.pathname === '/portal' ? 'portal' : 'editor')
  const [mobilePanel, setMobilePanel] = useState(null)
  const [savedProjects, setSavedProjects] = useState(() => readSavedProjects())
  const [customTemplates, setCustomTemplates] = useState(() => readCustomTemplates())
  const [renamingProjectId, setRenamingProjectId] = useState(null)
  const [projectNameDraft, setProjectNameDraft] = useState('')
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState('')
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [templateDraft, setTemplateDraft] = useState({ name: '', description: '' })
  const [selection, setSelection] = useState({ kind: 'component', containerId: 'left', componentId: getContainer(initial, 'left').components[0].id })
  const [activeTab, setActiveTab] = useState('structure')
  const [addTarget, setAddTarget] = useState('left')
  const [zoom, setZoom] = useState(.55)
  const [posterHeight, setPosterHeight] = useState(POSTER.minHeight)
  const [exportScale, setExportScale] = useState(3)
  const [toast, setToast] = useState('结构化模板已就绪')
  const [savedAt, setSavedAt] = useState('')
  const [exporting, setExporting] = useState(false)
  const [historyUi, setHistoryUi] = useState({ canUndo: false, canRedo: false })
  const [expanded, setExpanded] = useState({ header: true, left: true, right: true, footer: true })
  const posterRef = useRef(null)
  const viewportRef = useRef(null)
  const fileInputRef = useRef(null)
  const uploadTargetRef = useRef(null)
  const historyRef = useRef({ items: [JSON.stringify(initial)], index: 0 })

  const selectedContainer = getContainer(poster, selection?.containerId)
  const selectedComponentContext = selection?.componentId ? getComponentContext(poster, selection.containerId, selection.componentId) : null
  const selectedComponent = selection?.componentId ? getComponent(poster, selection.containerId, selection.componentId) : null
  const selectedItem = selection?.kind === 'item' ? selectedComponent?.items?.find((item) => item.id === selection.itemId) : null
  const globalHeader = getContainer(poster, 'header')
  const showGlobalHeader = globalHeader?.components.some((component) => component.visible)
  const activeLayout = LAYOUT_PRESETS.find((preset) => preset.id === poster.layout) || LAYOUT_PRESETS[0]
  const activeRatioBase = Math.min(...activeLayout.columnWidths)
  const savedRatios = poster.layoutRatios?.[activeLayout.id]
  const activeRatios = Array.isArray(savedRatios) && savedRatios.length === activeLayout.columnWidths.length
    ? savedRatios
    : activeLayout.columnWidths.map((width) => Number((width / activeRatioBase).toFixed(2)))
  const activeColumnWidths = Array.isArray(savedRatios) && savedRatios.length === activeLayout.columnWidths.length
    ? activeRatios.map((ratio) => Math.round(activeRatioBase * Math.max(1, Math.min(5, Number(ratio) || 1))))
    : activeLayout.columnWidths
  const posterWidth = expandedPosterWidth(activeColumnWidths)
  const presentationMode = poster.containerMode === 'grouped' || poster.containerMode === 'cards'
    ? poster.containerMode
    : activeLayout.classic ? 'grouped' : 'cards'
  const paddingTop = poster.paddingTop ?? 38
  const paddingBottom = poster.paddingBottom ?? 34
  const layoutMinHeight = Math.max(0, POSTER.minHeight - paddingTop - paddingBottom)
  const getRenderContainerWidth = (containerId) => {
    if (['header', 'footer'].includes(containerId)) return posterWidth - POSTER.paddingX * 2
    if (activeLayout.classic && ['header', 'left'].includes(containerId)) return activeColumnWidths[0]
    if (activeLayout.classic && containerId === 'right') return activeColumnWidths[1]
    const index = activeLayout.containerIds.indexOf(containerId)
    return index >= 0 ? activeColumnWidths[index] : PARTICIPANT_GRID.width
  }
  const activeBackground = BACKGROUND_PRESETS.find((preset) => preset.id === poster.backgroundStyle) || { id: 'custom', label: '自定义底色', base: poster.background, background: poster.background, accent: poster.accent, text: poster.textColor }
  const activeStructureContainerIds = ['header', ...activeLayout.containerIds, 'footer']

  const propertyBackLabel = selection?.kind === 'item'
    ? TYPE_META[selectedComponent?.type]?.label || '组件'
    : selectedComponentContext?.parent
      ? TYPE_META[selectedComponentContext.parent.type]?.label || '上级组件'
      : selectedContainer?.name || '容器'

  const goBackProperty = () => {
    if (!selection || selection.kind === 'container') return
    if (selection.kind === 'item') {
      setSelection({ kind: 'component', containerId: selection.containerId, componentId: selection.componentId })
      return
    }
    if (selectedComponentContext?.parent) {
      setSelection({ kind: 'component', containerId: selection.containerId, componentId: selectedComponentContext.parent.id })
      return
    }
    setSelection({ kind: 'container', containerId: selection.containerId })
  }

  const notify = useCallback((message) => {
    setToast(message)
    window.clearTimeout(notify.timer)
    notify.timer = window.setTimeout(() => setToast(''), 2200)
  }, [])

  const commit = useCallback((mutator) => {
    setPoster((current) => {
      const next = deepClone(current)
      mutator(next)
      const serialized = JSON.stringify(next)
      const history = historyRef.current
      if (history.items[history.index] !== serialized) {
        history.items = history.items.slice(0, history.index + 1)
        history.items.push(serialized)
        if (history.items.length > 60) history.items.shift()
        history.index = history.items.length - 1
      }
      setHistoryUi({ canUndo: history.index > 0, canRedo: history.index < history.items.length - 1 })
      return next
    })
  }, [])

  const travelHistory = (direction) => {
    const history = historyRef.current
    const nextIndex = history.index + direction
    if (nextIndex < 0 || nextIndex >= history.items.length) return
    history.index = nextIndex
    setPoster(JSON.parse(history.items[nextIndex]))
    setSelection(null)
    setHistoryUi({ canUndo: nextIndex > 0, canRedo: nextIndex < history.items.length - 1 })
  }

  useEffect(() => {
    const fit = () => {
      const viewport = viewportRef.current
      if (!viewport) return
      const value = Math.min((viewport.clientWidth - 76) / posterWidth, (viewport.clientHeight - 92) / POSTER.minHeight, .8)
      setZoom(Math.max(.2, value))
    }
    fit()
    const observer = new ResizeObserver(fit)
    if (viewportRef.current) observer.observe(viewportRef.current)
    return () => observer.disconnect()
  }, [posterWidth])

  useEffect(() => {
    const element = posterRef.current
    if (!element) return
    const measure = () => setPosterHeight(Math.max(POSTER.minHeight, Math.ceil(element.offsetHeight)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handler = (event) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target?.tagName)
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing) {
        event.preventDefault(); travelHistory(event.shiftKey ? 1 : -1)
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y' && !typing) {
        event.preventDefault(); travelHistory(1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const updateContainer = (patch) => commit((draft) => Object.assign(getContainer(draft, selection.containerId), patch))
  const updateContainerStyle = (patch) => commit((draft) => Object.assign(getContainer(draft, selection.containerId).style, patch))
  const updateComponent = (patch) => commit((draft) => Object.assign(getComponent(draft, selection.containerId, selection.componentId), patch))
  const updateItem = (patch) => commit((draft) => Object.assign(getComponent(draft, selection.containerId, selection.componentId).items.find((item) => item.id === selection.itemId), patch))

  const reorderMosaicPhoto = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    commit((draft) => {
      const component = getComponent(draft, selection.containerId, selection.componentId)
      if (!component?.photos?.[fromIndex] || toIndex >= component.photos.length) return
      const [photo] = component.photos.splice(fromIndex, 1)
      component.photos.splice(toIndex, 0, photo)
    })
    notify(`照片已移动到第 ${toIndex + 1} 位`)
  }

  const removeMosaicPhoto = (index) => {
    commit((draft) => {
      const component = getComponent(draft, selection.containerId, selection.componentId)
      component.photos.splice(index, 1)
      component.count = Math.max(1, component.photos.length)
    })
    notify('已移除一张参会照片')
  }

  const updateInfoRow = (index, value) => commit((draft) => { getComponent(draft, selection.containerId, selection.componentId).rows[index] = value })
  const removeInfoRow = (index) => commit((draft) => { getComponent(draft, selection.containerId, selection.componentId).rows.splice(index, 1) })
  const addInfoRow = () => commit((draft) => { getComponent(draft, selection.containerId, selection.componentId).rows.push('新增信息内容') })

  const updateRowGroupColumns = (columns) => commit((draft) => {
    const group = getComponent(draft, selection.containerId, selection.componentId)
    group.columns = columns
    group.ratios = Array.from({ length: columns }, (_, index) => group.ratios?.[index] || 1)
    if (!Array.isArray(group.children)) group.children = []
  })

  const updateRowGroupRatio = (index, value) => commit((draft) => {
    const group = getComponent(draft, selection.containerId, selection.componentId)
    group.ratios[index] = Math.max(1, Math.min(5, Number(value) || 1))
  })

  const setRowGroupSlotType = (index, type) => {
    const child = { ...componentDefaults(type), gapAfter: 0 }
    commit((draft) => {
      const group = getComponent(draft, selection.containerId, selection.componentId)
      while (group.children.length <= index) group.children.push(null)
      group.children[index] = child
    })
    setSelection({ kind: 'component', containerId: selection.containerId, componentId: child.id })
    notify(`第 ${index + 1} 个位置已切换为${TYPE_META[type].label}`)
  }

  const clearRowGroupSlot = (index) => commit((draft) => {
    const group = getComponent(draft, selection.containerId, selection.componentId)
    group.children[index] = null
  })

  const addComponent = (type) => {
    const component = componentDefaults(type)
    commit((draft) => getContainer(draft, addTarget).components.push(component))
    setSelection({ kind: 'component', containerId: addTarget, componentId: component.id })
    setExpanded((value) => ({ ...value, [addTarget]: true }))
    notify(`${TYPE_META[type].label}已加入${getContainer(poster, addTarget).name}`)
  }

  const applyLayoutPreset = (presetId) => {
    const preset = LAYOUT_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    commit((draft) => {
      ensureColumnHeaderLayout(draft)
      const allComponents = CONTENT_CONTAINER_IDS.flatMap((id) => getContainer(draft, id)?.components || [])
      CONTENT_CONTAINER_IDS.forEach((id) => { const container = getContainer(draft, id); if (container) container.components = [] })
      const targets = preset.containerIds
      if (preset.classic) {
        const mosaics = allComponents.filter((component) => component.type === 'mosaic')
        const regular = allComponents.filter((component) => component.type !== 'mosaic')
        getContainer(draft, 'left').components = regular
        getContainer(draft, 'right').components = mosaics
      } else if (targets.length === 1) {
        getContainer(draft, targets[0]).components = allComponents
      } else {
        const mosaics = allComponents.filter((component) => component.type === 'mosaic')
        const columnHeaders = allComponents.filter((component) => ['hero', 'info'].includes(component.type))
        const regular = allComponents.filter((component) => component.type !== 'mosaic' && !['hero', 'info'].includes(component.type))
        getContainer(draft, targets[0]).components.push(...columnHeaders)
        if (mosaics.length) {
          const regularTargets = targets.slice(0, -1)
          regular.forEach((component, index) => getContainer(draft, regularTargets[index % regularTargets.length]).components.push(component))
          mosaics.forEach((component) => getContainer(draft, targets[targets.length - 1]).components.push(component))
        } else {
          regular.forEach((component, index) => getContainer(draft, targets[index % targets.length]).components.push(component))
        }
      }
      draft.layout = preset.id
    })
    setSelection(null)
    setAddTarget(preset.containerIds[0])
    notify(`已切换为${preset.label}，全部组件已重新排布`)
  }

  const applyBackgroundPreset = (presetId) => {
    const preset = BACKGROUND_PRESETS.find((item) => item.id === presetId)
    if (!preset) return
    commit((draft) => {
      draft.backgroundStyle = preset.id
      draft.background = preset.base
      draft.accent = preset.accent
      draft.textColor = preset.text
    })
    notify(`已应用${preset.label}背景`)
  }

  const setActiveLayoutRatios = (ratios) => {
    commit((draft) => {
      if (!draft.layoutRatios) draft.layoutRatios = {}
      draft.layoutRatios[activeLayout.id] = ratios.map((ratio) => Math.max(1, Math.min(5, Number(ratio) || 1)))
    })
  }

  const updateColumnRatio = (index, value) => {
    const next = [...activeRatios]
    next[index] = Number(value)
    setActiveLayoutRatios(next)
  }

  const resetColumnRatios = () => commit((draft) => {
    if (draft.layoutRatios) delete draft.layoutRatios[activeLayout.id]
  })

  const addGuest = () => {
    const guest = defaultGuest()
    const adjusted = selectedComponent.items.length >= 6 && selectedComponent.columns === 2
    commit((draft) => {
      const component = getComponent(draft, selection.containerId, selection.componentId)
      component.items.push(guest)
      if (component.items.length > 6 && component.columns === 2) {
        component.columns = 3
      }
    })
    setSelection({ ...selection, kind: 'item', itemId: guest.id })
    notify(adjusted ? '已增加嘉宾，并自动调整为 3 列' : '已增加一个嘉宾卡片')
  }

  const deleteSelected = () => {
    if (!selection || selection.kind === 'container') return
    if (selection.kind === 'item') {
      commit((draft) => {
        const component = getComponent(draft, selection.containerId, selection.componentId)
        component.items = component.items.filter((item) => item.id !== selection.itemId)
      })
      setSelection({ kind: 'component', containerId: selection.containerId, componentId: selection.componentId })
      notify('嘉宾卡片已删除')
      return
    }
    commit((draft) => {
      const context = getComponentContext(draft, selection.containerId, selection.componentId)
      if (!context) return
      if (context.parent?.type === 'rowGroup') context.list[context.index] = null
      else context.list.splice(context.index, 1)
    })
    setSelection({ kind: 'container', containerId: selection.containerId })
    notify('组件已删除')
  }

  const duplicateSelected = () => {
    if (!selectedComponent) return
    if (selection.kind === 'item') {
      const copy = { ...deepClone(selectedItem), id: uid(), name: `${selectedItem.name} 副本` }
      commit((draft) => getComponent(draft, selection.containerId, selection.componentId).items.push(copy))
      setSelection({ ...selection, itemId: copy.id })
      return
    }
    const copy = cloneComponentWithFreshIds(selectedComponent)
    if (selectedComponentContext?.parent?.type === 'rowGroup') {
      const visibleSlots = selectedComponentContext.parent.columns || 2
      const emptyIndex = Array.from({ length: visibleSlots }).findIndex((_, index) => !selectedComponentContext.parent.children?.[index])
      if (emptyIndex < 0) return notify('当前横向组件组没有空位置')
      commit((draft) => {
        const context = getComponentContext(draft, selection.containerId, selection.componentId)
        context.parent.children[emptyIndex] = copy
      })
      setSelection({ kind: 'component', containerId: selection.containerId, componentId: copy.id })
      return notify('组件已复制到组内空位置')
    }
    commit((draft) => {
      const context = getComponentContext(draft, selection.containerId, selection.componentId)
      if (context) context.list.splice(context.index + 1, 0, copy)
    })
    setSelection({ kind: 'component', containerId: selection.containerId, componentId: copy.id })
    notify('组件已复制')
  }

  const moveComponent = (direction) => {
    if (!selectedComponent || selection.kind === 'item') return
    commit((draft) => {
      const context = getComponentContext(draft, selection.containerId, selection.componentId)
      if (!context) return
      const next = context.index + direction
      if (next < 0 || next >= context.list.length) return
      if (context.parent?.type === 'rowGroup') {
        ;[context.list[context.index], context.list[next]] = [context.list[next], context.list[context.index]]
        return
      }
      const [item] = context.list.splice(context.index, 1)
      context.list.splice(next, 0, item)
    })
  }

  const resetTemplate = () => {
    if (!window.confirm('重新载入模板会清空当前编辑，确定继续吗？')) return
    const fresh = createInitialPoster()
    setPoster(fresh)
    historyRef.current = { items: [JSON.stringify(fresh)], index: 0 }
    setHistoryUi({ canUndo: false, canRedo: false })
    setSelection({ kind: 'component', containerId: 'left', componentId: getContainer(fresh, 'left').components[0].id })
    notify('模板已重新载入')
  }

  const capturePosterPreview = async () => {
    const element = posterRef.current
    if (!element) return ''
    element.classList.add('is-exporting')
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    try {
      const blob = await toBlob(element, { pixelRatio: .5, cacheBust: true, backgroundColor: activeBackground.base })
      return blob ? await compressPreviewBlob(blob) : ''
    } catch (error) {
      console.warn('项目预览图生成失败', error)
      return ''
    } finally {
      element.classList.remove('is-exporting')
    }
  }

  const persistProject = async (nextPoster, message = '项目已保存') => {
    try {
      const savedAtIso = new Date().toISOString()
      const previous = savedProjects.find((item) => item.id === nextPoster.projectId)
      const actualPreview = await capturePosterPreview()
      const hasCustomPreview = previous?.previewMode === 'custom' || (!previous?.autoPreview && Boolean(previous?.preview))
      const record = {
        id: nextPoster.projectId,
        name: nextPoster.name,
        savedAt: savedAtIso,
        preview: hasCustomPreview ? previous.preview : '',
        previewMode: hasCustomPreview ? 'custom' : 'auto',
        autoPreview: actualPreview || previous?.autoPreview || '',
        poster: deepClone(nextPoster),
      }
      const projects = [record, ...savedProjects.filter((item) => item.id !== record.id)]
      localStorage.setItem(SAVE_KEY, JSON.stringify(nextPoster))
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
      setSavedProjects(projects)
      setPoster(nextPoster)
      const time = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
      setSavedAt(time)
      notify(`${message} · ${time}`)
      return true
    } catch (error) {
      console.error('项目保存失败', error)
      notify('存档空间不足，请减少图片后重试')
      return false
    }
  }

  const saveProject = () => {
    const name = poster.projectNameCustom ? poster.name : getPosterTitle(poster)
    return persistProject({ ...deepClone(poster), projectId: poster.projectId || uid(), name }, '项目已保存（覆盖当前项目）')
  }

  const openSaveAs = () => {
    setSaveAsName(`${getPosterTitle(poster)} 副本`)
    setSaveAsOpen(true)
  }

  const saveProjectAs = async () => {
    const name = saveAsName.trim()
    if (!name) return notify('请先填写新项目名称')
    const next = { ...deepClone(poster), projectId: uid(), name, projectNameCustom: true }
    if (await persistProject(next, '已另存为新项目')) setSaveAsOpen(false)
  }

  const beginRenameProject = (record) => {
    setRenamingProjectId(record.id)
    setProjectNameDraft(record.name)
  }

  const renameProject = (record) => {
    const name = projectNameDraft.trim()
    if (!name) return notify('项目名称不能为空')
    const projects = savedProjects.map((item) => item.id === record.id ? { ...item, name, poster: { ...item.poster, name, projectNameCustom: true } } : item)
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    setSavedProjects(projects)
    if (poster.projectId === record.id) {
      const next = { ...poster, name, projectNameCustom: true }
      setPoster(next)
      localStorage.setItem(SAVE_KEY, JSON.stringify(next))
    }
    setRenamingProjectId(null)
    notify('项目名称已更新')
  }

  const duplicateProject = (record) => {
    const name = `${record.name} 副本`
    const nextPoster = { ...deepClone(record.poster), projectId: uid(), name, projectNameCustom: true }
    const recordCopy = { ...record, id: nextPoster.projectId, name, savedAt: new Date().toISOString(), poster: nextPoster }
    const projects = [recordCopy, ...savedProjects]
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    setSavedProjects(projects)
    notify('已创建项目副本')
  }

  const deleteProject = (record) => {
    if (!window.confirm(`确定删除“${record.name}”吗？此操作无法撤销。`)) return
    const projects = savedProjects.filter((item) => item.id !== record.id)
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    setSavedProjects(projects)
    if (poster.projectId === record.id) {
      const detached = { ...poster, projectId: uid() }
      setPoster(detached)
      setSavedAt('')
      localStorage.setItem(SAVE_KEY, JSON.stringify(detached))
    }
    notify('项目已删除')
  }

  const resetProjectPreview = (record) => {
    const projects = savedProjects.map((item) => item.id === record.id ? { ...item, preview: '', previewMode: 'auto' } : item)
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
    setSavedProjects(projects)
    notify('已恢复真实海报预览')
  }

  const openTemplateDialog = () => {
    setTemplateDraft({ name: `${getPosterTitle(poster)}模板`, description: '基于当前海报结构创建，可重复使用并继续编辑。' })
    setTemplateDialogOpen(true)
  }

  const createCustomTemplate = () => {
    const name = templateDraft.name.trim()
    if (!name) return notify('请填写模板名称')
    const templatePoster = deepClone(poster)
    const record = { id: `custom-${uid()}`, name, description: templateDraft.description.trim() || '个人自定义海报模板', createdAt: new Date().toISOString(), poster: templatePoster }
    const templates = [record, ...customTemplates]
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates))
    setCustomTemplates(templates)
    setTemplateDialogOpen(false)
    notify('模板已加入模板中心')
  }

  const useCustomTemplate = (record) => {
    const next = { ...deepClone(record.poster), projectId: uid(), name: record.name }
    setPoster(next)
    historyRef.current = { items: [JSON.stringify(next)], index: 0 }
    setHistoryUi({ canUndo: false, canRedo: false })
    setSelection(null)
    setSavedAt('')
    setAppView('editor')
    notify(`已使用个人模板：${record.name}`)
  }

  const deleteCustomTemplate = (record) => {
    if (!window.confirm(`确定删除模板“${record.name}”吗？`)) return
    const templates = customTemplates.filter((item) => item.id !== record.id)
    localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates))
    setCustomTemplates(templates)
    notify('个人模板已删除')
  }

  const loadProject = () => {
    const saved = localStorage.getItem(SAVE_KEY)
    if (!saved) return notify('还没有结构化项目存档')
    try {
      const next = JSON.parse(saved)
      const fresh = createInitialPoster()
      ;['extra1', 'extra2', 'extra3'].forEach((id) => {
        if (!getContainer(next, id)) next.containers.splice(next.containers.length - 1, 0, deepClone(getContainer(fresh, id)))
      })
      if (!next.layout) next.layout = 'classic'
      if (!next.containerMode) next.containerMode = 'preset'
      if (!next.layoutRatios || typeof next.layoutRatios !== 'object') next.layoutRatios = {}
      if (typeof next.paddingTop !== 'number') next.paddingTop = 38
      if (typeof next.paddingBottom !== 'number') next.paddingBottom = 34
      if (!next.backgroundStyle) next.backgroundStyle = 'warmPaper'
      ensureColumnHeaderLayout(next)
      migrateStructureNames(next)
      next.containers.forEach((container) => visitComponents(container.components, (component) => {
        if (!component.cardMode) {
          if (typeof component.showContainer === 'boolean') component.cardMode = component.showContainer ? 'show' : 'hide'
          else if (component.type === 'hero' || component.type === 'brand') component.cardMode = 'hide'
          else if (component.type === 'info') component.cardMode = 'show'
          else component.cardMode = 'inherit'
        }
        delete component.showContainer
        if (component.type === 'hero') {
          if (!component.subtitleSize) component.subtitleSize = 12
          if (!component.subtitleDecoration) component.subtitleDecoration = 'solid'
        }
        if (component.type === 'textBlock') {
          if (!component.fontSize) component.fontSize = 11
          if (!component.lineHeight) component.lineHeight = 1.72
        }
        if (component.type === 'brand') {
          if (!component.textSize) component.textSize = 25
          if (!component.noteSize) component.noteSize = 8
        }
        if (component.type === 'mosaic') {
          if (!Array.isArray(component.photos)) component.photos = []
          if (typeof component.photoGap !== 'number') component.photoGap = 3
          delete component.columns
        }
        if (component.type === 'rowGroup') {
          if (!component.columns) component.columns = 2
          if (!Array.isArray(component.ratios)) component.ratios = Array(component.columns).fill(1)
          if (!Array.isArray(component.children)) component.children = []
          if (typeof component.slotGap !== 'number') component.slotGap = 12
        }
      }))
      next.version = 3
      setPoster(next)
      historyRef.current = { items: [JSON.stringify(next)], index: 0 }
      setHistoryUi({ canUndo: false, canRedo: false })
      setSelection(null)
      notify('已恢复本地项目')
    } catch { notify('存档格式无效') }
  }

  const useTemplate = (templateId) => {
    const next = buildTemplatePoster(templateId)
    setPoster(next)
    historyRef.current = { items: [JSON.stringify(next)], index: 0 }
    setHistoryUi({ canUndo: false, canRedo: false })
    setSelection({ kind: 'component', containerId: 'left', componentId: getContainer(next, 'left').components[0].id })
    setSavedAt('')
    setAppView('editor')
    notify(`已使用模板：${next.name}`)
  }

  const openSavedProject = (record) => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(record.poster))
    loadProject()
    setSavedAt(new Date(record.savedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    setAppView('editor')
  }

  const triggerImageUpload = (target, multiple = false) => {
    uploadTargetRef.current = target
    if (fileInputRef.current) fileInputRef.current.multiple = multiple
    fileInputRef.current?.click()
  }

  const handleImages = async (fileList) => {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'))
    if (!files.length) return notify('请选择图片文件')
    const target = uploadTargetRef.current
    try {
      const optimized = await Promise.all(files.map(optimizeImageFile))
      if (target.kind === 'projectPreview') {
        const projects = savedProjects.map((item) => item.id === target.projectId ? { ...item, preview: optimized[0], previewMode: 'custom' } : item)
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects))
        setSavedProjects(projects)
        notify('项目预览图已更新')
      } else if (target.kind === 'mosaicBatch') {
        commit((draft) => {
          const component = getComponent(draft, target.containerId, target.componentId)
          component.photos = optimized
          component.count = optimized.length
        })
        notify(`已导入 ${optimized.length} 张 16:9 参会照片`)
      } else if (target.kind === 'item') {
        commit((draft) => { getComponent(draft, target.containerId, target.componentId).items.find((item) => item.id === target.itemId).image = optimized[0] })
        notify('照片已优化并替换，显示比例为 16:9')
      } else {
        commit((draft) => { getComponent(draft, target.containerId, target.componentId).image = optimized[0] })
        notify('图片已优化并替换，排版保持不变')
      }
    } catch {
      notify('图片读取失败，请更换文件')
    }
  }

  const exportPoster = async () => {
    if (!posterRef.current) return
    setExporting(true)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    try {
      const blob = await toBlob(posterRef.current, { pixelRatio: exportScale, cacheBust: true, backgroundColor: activeBackground.base })
      if (!blob) throw new Error('无法生成图片')
      const fileName = `会议海报-${new Date().toISOString().slice(0, 10)}.png`
      const isTauriDesktop = Boolean(window.__TAURI_INTERNALS__) && !/Android/i.test(navigator.userAgent)
      const isTauriAndroid = Boolean(window.__TAURI_INTERNALS__) && /Android/i.test(navigator.userAgent)
      if (isTauriAndroid) {
        let publicUri
        try {
          // MediaStore-backed public storage keeps the PNG visible in Gallery/Photos,
          // instead of the app-private Android/data directory used by BaseDirectory.Picture.
          publicUri = await createNewPublicImageFile(
            PublicImageDir.Pictures,
            `橐龠海报工坊/${fileName}`,
            'image/png',
            { isPending: true },
          )
          await writeAndroidFile(publicUri, new Uint8Array(await blob.arrayBuffer()))
          await setPublicFilePending(publicUri, false)
          await scanPublicFile(publicUri).catch(() => {})
          notify('海报已保存到系统相册：图片 / Pictures / 橐龠海报工坊')
        } catch (error) {
          if (publicUri) await removeAndroidFile(publicUri).catch(() => {})
          throw error
        }
      } else if (isTauriDesktop) {
        const path = await chooseSavePath({
          title: '保存会议海报',
          defaultPath: fileName,
          filters: [{ name: 'PNG 图片', extensions: ['png'] }],
        })
        if (!path) {
          notify('已取消导出')
          return
        }
        await writeFile(path, new Uint8Array(await blob.arrayBuffer()))
        notify(`海报已保存到 ${path}`)
      } else if ('showSaveFilePicker' in window) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{ description: 'PNG 图片', accept: { 'image/png': ['.png'] } }],
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
        notify('海报已保存到你选择的位置')
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        notify('海报已导出到浏览器下载目录')
      }
      const currentHeight = Math.ceil(posterRef.current.offsetHeight)
      if (isTauriAndroid || isTauriDesktop || 'showSaveFilePicker' in window) notify(`已导出 ${posterWidth * exportScale}×${currentHeight * exportScale} PNG`)
    } catch (error) {
      if (error?.name === 'AbortError') {
        notify('已取消导出')
        return
      }
      console.error(error)
      notify('导出失败，请降低清晰度重试')
    } finally { setExporting(false) }
  }

  const renderProperties = () => {
    if (!selection) return <div className="empty-properties"><div><Settings2 size={24} /></div><b>选择一个容器或组件</b><p>左侧选择结构节点，或直接点击海报中的组件。</p></div>

    if (selection.kind === 'container') {
      return (
        <div className="properties-body">
          <PropertyNav items={[["container", "容器设置"]]} />
          <div className="form-section" data-property-section="container"><h3>容器设置</h3>
            <Field label="容器名称"><input value={selectedContainer.name} onChange={(event) => updateContainer({ name: event.target.value })} /></Field>
            <Field label="背景颜色"><div className="color-input"><input type="color" value={selectedContainer.style.background.startsWith('#') ? selectedContainer.style.background : '#fffdf7'} onChange={(event) => updateContainerStyle({ background: event.target.value })} /><code>{selectedContainer.style.background}</code></div></Field>
            <div className="field-grid">
              <Field label="内边距"><input type="number" min="0" max="60" value={selectedContainer.style.padding} onChange={(event) => updateContainerStyle({ padding: Number(event.target.value) })} /></Field>
              <Field label="组件间距"><input type="number" min="0" max="60" value={selectedContainer.style.gap} onChange={(event) => updateContainerStyle({ gap: Number(event.target.value) })} /></Field>
              <Field label="圆角"><input type="number" min="0" max="60" value={selectedContainer.style.radius} onChange={(event) => updateContainerStyle({ radius: Number(event.target.value) })} /></Field>
              <Field label="组件数量"><input disabled value={selectedContainer.components.length} /></Field>
            </div>
          </div>
        </div>
      )
    }

    if (selection.kind === 'item') {
      return (
        <div className="properties-body">
          <PropertyNav items={[["content", "嘉宾内容"]]} />
          <div className="quick-actions"><button onClick={duplicateSelected}><Copy size={14} />复制嘉宾</button><button className="danger" onClick={deleteSelected}><Trash2 size={14} />删除</button></div>
          <div className="form-section" data-property-section="content"><h3>嘉宾内容</h3>
            <div className="image-setting"><div className="image-thumb">{selectedItem.image ? <img src={selectedItem.image} alt="" /> : <EmptyPhoto />}</div><button onClick={() => triggerImageUpload({ ...selection })}><Upload size={14} />替换照片</button></div>
            <Field label="嘉宾姓名"><input value={selectedItem.name} onChange={(event) => updateItem({ name: event.target.value })} /></Field>
            <Field label="身份说明"><textarea rows="3" value={selectedItem.role} onChange={(event) => updateItem({ role: event.target.value })} /></Field>
          </div>
          <div className="context-note">照片尺寸、圆角和文字位置由“嘉宾组”组件统一控制，不需要逐个对齐。</div>
        </div>
      )
    }

    const contentNavLabel = {
      rowGroup: '排列设置', hero: '标题内容', info: '会议信息', guestGrid: '嘉宾设置',
      mosaic: '照片网格', imageBlock: '图片内容', textBlock: '文本内容', brand: '页脚署名',
    }[selectedComponent.type] || '内容设置'

    return (
      <div className="properties-body">
        <PropertyNav items={[["content", contentNavLabel], ["display", "显示与间距"]]} />
        <div className="quick-actions">
          <button onClick={() => moveComponent(-1)}><MoveUp size={14} />上移</button>
          <button onClick={() => moveComponent(1)}><MoveDown size={14} />下移</button>
          <button onClick={duplicateSelected}><Copy size={14} />复制</button>
          <button className="danger" onClick={deleteSelected}><Trash2 size={14} /></button>
        </div>

        {selectedComponent.type === 'rowGroup' && <div className="form-section" data-property-section="content"><h3>横向排列设置</h3>
          <Field label="并列数量"><div className="segmented row-count-control">{[2, 3, 4].map((number) => <button key={number} className={selectedComponent.columns === number ? 'active' : ''} onClick={() => updateRowGroupColumns(number)}>{number} 个</button>)}</div></Field>
          <div className="row-ratio-editor">{Array.from({ length: selectedComponent.columns || 2 }, (_, index) => <Field key={index} label={`位置 ${index + 1}`} hint={`${selectedComponent.ratios?.[index] || 1} 份`}><input aria-label={`位置 ${index + 1} 宽度比例`} type="number" min="1" max="5" step=".25" value={selectedComponent.ratios?.[index] || 1} onChange={(event) => updateRowGroupRatio(index, event.target.value)} /></Field>)}</div>
          <Field label="组件间距" hint={`${selectedComponent.slotGap ?? 12}px`}><input type="range" min="0" max="40" value={selectedComponent.slotGap ?? 12} onChange={(event) => updateComponent({ slotGap: Number(event.target.value) })} /></Field>
          <div className="row-slot-editor">{Array.from({ length: selectedComponent.columns || 2 }, (_, index) => { const child = selectedComponent.children?.[index]; return <div className="row-slot-editor-item" key={index}><span>{index + 1}</span><select aria-label={`位置 ${index + 1} 组件类型`} value={child?.type || ''} onChange={(event) => event.target.value ? setRowGroupSlotType(index, event.target.value) : clearRowGroupSlot(index)}><option value="">空位置</option>{Object.entries(TYPE_META).filter(([type]) => type !== 'rowGroup').map(([type, meta]) => <option key={type} value={type}>{meta.label}</option>)}</select>{child && <button onClick={() => setSelection({ kind: 'component', containerId: selection.containerId, componentId: child.id })}>编辑</button>}</div> })}</div>
          <div className="auto-layout-note">每个位置都是独立组件。先选择类型，再直接点击海报中的子组件编辑文字、图片和卡片样式。</div>
        </div>}

        {selectedComponent.type === 'hero' && <div className="form-section" data-property-section="content"><h3>标题内容</h3>
          <Field label="主标题"><input value={selectedComponent.title} onChange={(event) => updateComponent({ title: event.target.value })} /></Field>
          <Field label="副标题"><textarea rows="2" value={selectedComponent.subtitle} onChange={(event) => updateComponent({ subtitle: event.target.value })} /></Field>
          <div className="field-grid"><Field label="标题字号"><input type="number" min="24" max="80" value={selectedComponent.titleSize} onChange={(event) => updateComponent({ titleSize: Number(event.target.value) })} /></Field><Field label="副标题字号"><input type="number" min="8" max="36" value={selectedComponent.subtitleSize ?? 12} onChange={(event) => updateComponent({ subtitleSize: Number(event.target.value) })} /></Field></div>
          <Field label="标题对齐"><div className="align-buttons">{[['left', AlignLeft, '左', '左对齐'], ['center', AlignCenter, '中', '居中'], ['right', AlignRight, '右', '右对齐']].map(([value, Icon, text, label]) => <button key={value} aria-label={label} title={label} className={selectedComponent.align === value ? 'active' : ''} onClick={() => updateComponent({ align: value })}><Icon size={15} /><span>{text}</span></button>)}</div></Field>
          <Field label="副标题装饰"><div className="decoration-options">{[['solid', '实线'], ['double', '双线'], ['dashed', '虚线'], ['fade', '渐隐'], ['stars', '五角星'], ['diamonds', '菱形'], ['dots', '圆点'], ['none', '无']].map(([value, label]) => <button key={value} className={(selectedComponent.subtitleDecoration || 'solid') === value ? 'active' : ''} onClick={() => updateComponent({ subtitleDecoration: value })}><i className={`decoration-sample sample-${value}`} />{label}</button>)}</div></Field>
        </div>}

        {selectedComponent.type === 'info' && <div className="form-section" data-property-section="content"><h3>会议信息</h3>
          <Field label="组件标题"><input value={selectedComponent.heading} onChange={(event) => updateComponent({ heading: event.target.value })} /></Field>
          <div className="repeat-list">{selectedComponent.rows.map((row, index) => <div className="repeat-row" key={index}><input value={row} onChange={(event) => updateInfoRow(index, event.target.value)} /><button onClick={() => removeInfoRow(index)}><Trash2 size={13} /></button></div>)}</div>
          <button className="add-row" onClick={addInfoRow}><Plus size={14} />添加一条信息</button>
        </div>}

        {selectedComponent.type === 'guestGrid' && <div className="form-section" data-property-section="content"><h3>嘉宾组设置</h3>
          <Field label="分区标题"><input value={selectedComponent.heading} onChange={(event) => updateComponent({ heading: event.target.value })} /></Field>
          <Field label="每行列数"><div className="segmented">{[1, 2, 3].map((number) => <button key={number} className={selectedComponent.columns === number ? 'active' : ''} onClick={() => updateComponent({ columns: number })}>{number} 列</button>)}</div></Field>
          <div className="guest-editor-list">{selectedComponent.items.map((item, index) => <button key={item.id} className={selection.itemId === item.id ? 'active' : ''} onClick={() => setSelection({ ...selection, kind: 'item', itemId: item.id })}><span>{index + 1}</span><div><b>{item.name}</b><em>{item.role}</em></div><ChevronRight size={14} /></button>)}</div>
          <button className="add-row" onClick={addGuest}><Plus size={14} />增加嘉宾</button>
        </div>}

        {selectedComponent.type === 'mosaic' && <div className="form-section" data-property-section="content"><h3>参会照片网格</h3>
          <Field label="分区标题"><input value={selectedComponent.heading} onChange={(event) => updateComponent({ heading: event.target.value })} /></Field>
          <div className="image-setting large"><div className="image-thumb">{selectedComponent.photos?.[0] ? <img src={selectedComponent.photos[0]} alt="" /> : <Users size={25} />}</div><div><button onClick={() => triggerImageUpload({ ...selection, kind: 'mosaicBatch' }, true)}><Upload size={14} />批量上传照片</button>{selectedComponent.photos?.length > 0 && <button className="text-button" onClick={() => updateComponent({ photos: [], count: 20 })}>清空并恢复占位</button>}</div></div>
          {selectedComponent.photos?.length > 0 && <div className="mosaic-photo-manager">
            <div className="mosaic-photo-manager-head"><b>照片顺序</b><span>{selectedComponent.photos.length} 张 · 可拖拽调整</span></div>
            <div className="mosaic-photo-list">{selectedComponent.photos.map((photo, index) => <div className="mosaic-photo-item" key={`${photo.slice(-24)}-${index}`} draggable onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)) }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={(event) => { event.preventDefault(); reorderMosaicPhoto(Number(event.dataTransfer.getData('text/plain')), index) }}>
              <span>{index + 1}</span><img src={photo} alt={`参会照片 ${index + 1}`} />
              <div><button aria-label={`第 ${index + 1} 张照片前移`} title="前移" disabled={index === 0} onClick={() => reorderMosaicPhoto(index, index - 1)}><MoveUp size={12} /></button><button aria-label={`第 ${index + 1} 张照片后移`} title="后移" disabled={index === selectedComponent.photos.length - 1} onClick={() => reorderMosaicPhoto(index, index + 1)}><MoveDown size={12} /></button><button className="danger" aria-label={`移除第 ${index + 1} 张照片`} title="移除" onClick={() => removeMosaicPhoto(index)}><Trash2 size={12} /></button></div>
            </div>)}</div>
          </div>}
          <div className="upload-hint">可一次选择多张图片；每张照片会自动填入独立的 16:9 网格，不会合并成一张截图。</div>
          <div className="field-grid"><Field label="照片位数量"><input type="number" min="1" max="300" value={selectedComponent.count} onChange={(event) => updateComponent({ count: Number(event.target.value) })} /></Field><Field label="动态列数" hint="随栏宽比例"><input disabled value={`${getParticipantColumns(Math.max(selectedComponent.count || 0, selectedComponent.photos?.length || 0), selectedComponent.photoGap ?? 3, getComponentContentWidth(selectedComponent, selectedContainer, getRenderContainerWidth(selection.containerId), presentationMode))} 列`} /></Field></div>
          <Field label="照片间距" hint={`${selectedComponent.photoGap ?? 3}px`}><input type="range" min="0" max="20" step="1" value={selectedComponent.photoGap ?? 3} onChange={(event) => updateComponent({ photoGap: Number(event.target.value) })} /></Field>
          <div className="auto-layout-note">系统读取栏目真实宽度并比较所有可用排法，尽量铺满当前区域；照片间距严格使用上方设置值，无法铺满的余量统一保留在底部，照片始终保持 16:9。</div>
        </div>}

        {selectedComponent.type === 'imageBlock' && <div className="form-section" data-property-section="content"><h3>图片区</h3>
          <Field label="标题"><input value={selectedComponent.heading} onChange={(event) => updateComponent({ heading: event.target.value })} /></Field>
          <div className="image-setting large"><div className="image-thumb">{selectedComponent.image ? <img src={selectedComponent.image} alt="" /> : <ImagePlus size={25} />}</div><button onClick={() => triggerImageUpload({ kind: 'component', ...selection })}><Upload size={14} />上传图片</button></div>
          <Field label="图片说明"><textarea rows="2" value={selectedComponent.caption} onChange={(event) => updateComponent({ caption: event.target.value })} /></Field>
          <Field label="图片适应"><select value={selectedComponent.fit} onChange={(event) => updateComponent({ fit: event.target.value })}><option value="cover">铺满裁切</option><option value="contain">完整显示</option></select></Field>
        </div>}

        {selectedComponent.type === 'textBlock' && <div className="form-section" data-property-section="content"><h3>多行文本</h3>
          <Field label="标题"><input value={selectedComponent.heading} onChange={(event) => updateComponent({ heading: event.target.value })} /></Field>
          <Field label="正文" hint="支持换行"><textarea rows="8" value={selectedComponent.body} onChange={(event) => updateComponent({ body: event.target.value })} /></Field>
          <div className="field-grid"><Field label="正文字号"><input type="number" min="8" max="40" value={selectedComponent.fontSize ?? 11} onChange={(event) => updateComponent({ fontSize: Number(event.target.value) })} /></Field><Field label="行距"><input type="number" min="1" max="3" step="0.1" value={selectedComponent.lineHeight ?? 1.72} onChange={(event) => updateComponent({ lineHeight: Number(event.target.value) })} /></Field></div>
          <Field label="文本对齐"><div className="align-buttons">{[['left', AlignLeft, '左', '左对齐'], ['center', AlignCenter, '中', '居中'], ['right', AlignRight, '右', '右对齐']].map(([value, Icon, text, label]) => <button key={value} aria-label={label} title={label} className={selectedComponent.align === value ? 'active' : ''} onClick={() => updateComponent({ align: value })}><Icon size={15} /><span>{text}</span></button>)}</div></Field>
        </div>}

        {selectedComponent.type === 'brand' && <div className="form-section" data-property-section="content"><h3>页脚署名</h3>
          <Field label="品牌文字"><input value={selectedComponent.text} onChange={(event) => updateComponent({ text: event.target.value })} /></Field>
          <Field label="附加说明"><input value={selectedComponent.note} onChange={(event) => updateComponent({ note: event.target.value })} /></Field>
          <div className="field-grid"><Field label="署名字号"><input type="number" min="10" max="72" value={selectedComponent.textSize ?? 25} onChange={(event) => updateComponent({ textSize: Number(event.target.value) })} /></Field><Field label="说明字号"><input type="number" min="6" max="40" value={selectedComponent.noteSize ?? 8} onChange={(event) => updateComponent({ noteSize: Number(event.target.value) })} /></Field></div>
        </div>}

        <div className="form-section" data-property-section="display"><h3>组件显示</h3>
          <div className="visibility-row"><span>在海报中显示</span><button className={selectedComponent.visible ? 'on' : ''} onClick={() => updateComponent({ visible: !selectedComponent.visible })}>{selectedComponent.visible ? <Eye size={14} /> : <EyeOff size={14} />}{selectedComponent.visible ? '显示' : '隐藏'}</button></div>
          <Field label="组件卡片"><div className="segmented card-mode-control">{[['inherit', '跟随布局'], ['show', '显示'], ['hide', '隐藏']].map(([value, label]) => <button key={value} className={(selectedComponent.cardMode || 'inherit') === value ? 'active' : ''} onClick={() => updateComponent({ cardMode: value })}>{label}</button>)}</div></Field>
          <div className="auto-layout-note">“跟随布局”会使用布局面板的承载方式；显示或隐藏可作为当前组件的独立例外。</div>
          <Field label="组件下间距"><input type="range" min="0" max="50" value={selectedComponent.gapAfter} onChange={(event) => updateComponent({ gapAfter: Number(event.target.value) })} /></Field>
        </div>
      </div>
    )
  }

  const propertyTitle = selection?.kind === 'container' ? selectedContainer?.name : selection?.kind === 'item' ? selectedItem?.name : selectedComponent ? TYPE_META[selectedComponent.type].label : '属性设置'
  const propertySub = selection?.kind === 'container'
    ? '容器设置'
    : selection?.kind === 'item'
      ? `${selectedContainer?.name} / ${TYPE_META[selectedComponent?.type]?.label || '组件'} / 内容项`
      : selectedComponent
        ? `${selectedContainer?.name}${selectedComponentContext?.parent ? ` / ${TYPE_META[selectedComponentContext.parent.type]?.label || '上级组件'}` : ''} / 组件`
        : '选择海报中的内容开始编辑'

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={() => setAppView('portal')} aria-label="返回品牌首页"><div className="brand-mark"><img src="/brand-logo.png" alt="" /></div><div><strong>橐龠</strong><span>海报工坊</span></div></button>
        <nav className="page-nav"><button className={appView === 'portal' ? 'active' : ''} onClick={() => setAppView('portal')}>品牌首页</button><button className={appView === 'editor' ? 'active' : ''} onClick={() => setAppView('editor')}>海报编辑</button><button className={appView === 'templates' ? 'active' : ''} onClick={() => setAppView('templates')}>模板中心</button><button className={appView === 'projects' ? 'active' : ''} onClick={() => setAppView('projects')}>我的项目{savedProjects.length > 0 && <span>{savedProjects.length}</span>}</button></nav>
        {appView === 'editor' ? <div className="top-actions">
          <div className="history-actions"><IconButton label="撤销" disabled={!historyUi.canUndo} onClick={() => travelHistory(-1)}><Undo2 size={17} /></IconButton><IconButton label="重做" disabled={!historyUi.canRedo} onClick={() => travelHistory(1)}><Redo2 size={17} /></IconButton></div>
          <span className="save-state">{savedAt ? `已保存 ${savedAt}` : '结构自动排版中'}</span>
          <button className="template-save-button" onClick={openTemplateDialog}><LayoutTemplate size={15} /><span>存为模板</span></button>
          <div className="save-actions"><button className="button ghost" onClick={saveProject}><Save size={16} />保存</button><button className="save-as-button" onClick={openSaveAs}>另存为</button></div>
          <div className="export-control"><select value={exportScale} onChange={(event) => setExportScale(Number(event.target.value))}><option value="2">高清 2×</option><option value="3">超清 3×</option><option value="4">印刷 4×</option></select><button className="button primary" onClick={exportPoster} disabled={exporting}><Download size={16} />{exporting ? '生成中…' : '导出 PNG'}</button></div>
        </div> : <div className="library-state"><Sparkles size={15} />{appView === 'portal' ? '品牌门户' : appView === 'templates' ? `${TEMPLATE_PRESETS.length + customTemplates.length} 个可用模板` : `${savedProjects.length} 个浏览器本地项目`}</div>}
      </header>

      {appView === 'portal' ? <BrandPortal onStart={() => setAppView('editor')} onTemplates={() => setAppView('templates')} onProjects={() => setAppView('projects')} /> : appView === 'editor' ? <main className="workspace">
        <aside className={`left-panel panel-surface ${mobilePanel === 'tools' ? 'mobile-open' : ''}`}>
          <button className="mobile-panel-close" aria-label="关闭编辑工具" onClick={() => setMobilePanel(null)}><X size={17} /></button>
          <nav className="tool-tabs"><button className={activeTab === 'structure' ? 'active' : ''} onClick={() => setActiveTab('structure')}><Layers3 size={18} />结构</button><button className={activeTab === 'layout' ? 'active' : ''} onClick={() => setActiveTab('layout')}><PanelTop size={18} />布局</button><button className={activeTab === 'components' ? 'active' : ''} onClick={() => setActiveTab('components')}><LayoutGrid size={18} />组件</button><button className={activeTab === 'theme' ? 'active' : ''} onClick={() => setActiveTab('theme')}><Palette size={18} />背景</button></nav>
          <div className="left-content">
            {activeTab === 'structure' && <>
              <div className="section-heading"><div><b>海报结构</b><span>容器决定区域，组件决定内容</span></div><button className="mini-link" onClick={resetTemplate}><RotateCcw size={13} />重置</button></div>
              <div className="structure-tree">
                {activeStructureContainerIds.map((id) => getContainer(poster, id)).filter(Boolean).map((container) => <div className="tree-group" key={container.id}>
                  <button className={`tree-container ${selection?.kind === 'container' && selection.containerId === container.id ? 'active' : ''}`} onClick={() => setSelection({ kind: 'container', containerId: container.id })}><span onClick={(event) => { event.stopPropagation(); setExpanded((value) => ({ ...value, [container.id]: !value[container.id] })) }}>{expanded[container.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span><Box size={15} /><div><b>{container.name}</b><em>{container.components.length} 个组件</em></div></button>
                  {expanded[container.id] && <div className="tree-components">{container.components.map((component, index) => <StructureComponentNode key={component.id} component={component} index={index} containerId={container.id} selection={selection} onSelect={setSelection} />)}</div>}
                </div>)}
              </div>
              <div className="structure-tip"><Sparkles size={15} /><p><b>稳定排版</b>增删嘉宾或修改长文字时，组件会在所属容器中自动重排。</p></div>
              <button className="button secondary wide" onClick={loadProject}>恢复本地存档</button>
            </>}

            {activeTab === 'layout' && <>
              <div className="section-heading"><div><b>版式布局</b><span>标题信息归入首栏，全局页头按需跨栏</span></div></div>
              <div className="layout-presets">{LAYOUT_PRESETS.map((preset) => <button key={preset.id} className={activeLayout.id === preset.id ? 'active' : ''} onClick={() => applyLayoutPreset(preset.id)}><div className="layout-mini" style={{ gridTemplateColumns: preset.columnWidths.map((width) => `${width}fr`).join(' ') }}>{preset.containerIds.map((id, index) => <i key={`${id}-${index}`} />)}</div><span><b>{preset.label}</b><em>{preset.note} · 画布 {preset.width}px</em></span>{activeLayout.id === preset.id && <strong>当前</strong>}</button>)}</div>
              <div className="layout-control-block"><div className="control-title"><b>内容承载方式</b><span>当前：{presentationMode === 'grouped' ? '大容器分组' : '独立组件卡片'}</span></div><div className="segmented container-mode-control">{[['preset', '跟随布局'], ['grouped', '大容器'], ['cards', '独立卡片']].map(([value, label]) => <button key={value} className={(poster.containerMode || 'preset') === value ? 'active' : ''} onClick={() => commit((draft) => { draft.containerMode = value })}>{label}</button>)}</div></div>
              {activeLayout.containerIds.length > 1 && <div className="layout-control-block"><div className="control-title"><b>栏宽比例</b><button className="mini-link" onClick={resetColumnRatios}><RotateCcw size={12} />恢复预设</button></div>{activeLayout.containerIds.length === 2 && <div className="ratio-presets">{[[1, 1], [1, 1.5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 1], [3, 1], [4, 1], [5, 1]].map((ratios) => <button key={ratios.join(':')} className={activeRatios.every((ratio, index) => Math.abs(ratio - ratios[index]) < .01) ? 'active' : ''} onClick={() => setActiveLayoutRatios(ratios)}>{ratios.join(':')}</button>)}</div>}<div className="ratio-inputs">{activeRatios.map((ratio, index) => <Field key={index} label={`第 ${index + 1} 栏`} hint={`${activeColumnWidths[index]}px`}><input aria-label={`第 ${index + 1} 栏比例`} type="number" min="1" max="5" step="0.25" value={ratio} onChange={(event) => updateColumnRatio(index, event.target.value)} /></Field>)}</div><div className="ratio-summary">1 份 = {activeRatioBase}px · 当前画布 {posterWidth}px</div></div>}
              <div className="layout-control-block spacing-control"><div className="control-title"><b>画布上下留白</b><span>控制内容与海报边缘的距离</span></div><Field label="顶部留白" hint={`${paddingTop}px`}><input type="range" min="0" max="160" step="2" value={paddingTop} onChange={(event) => commit((draft) => { draft.paddingTop = Number(event.target.value) })} /></Field><Field label="底部留白" hint={`${paddingBottom}px`}><input type="range" min="0" max="160" step="2" value={paddingBottom} onChange={(event) => commit((draft) => { draft.paddingBottom = Number(event.target.value) })} /></Field></div>
              <div className="structure-tip"><LayoutGrid size={15} /><p><b>首栏为默认内容起点</b>主标题和会议信息在所有版式中都位于第一栏。全局页头默认留空；需要跨栏内容时，可从组件库添加到“全局页头”。栏宽增大或栏目增加时，画布会同步扩宽。</p></div>
            </>}

            {activeTab === 'components' && <>
              <div className="section-heading"><div><b>组件库</b><span>选择容器后添加组件</span></div></div>
              <Field label="添加到"><select value={addTarget} onChange={(event) => setAddTarget(event.target.value)}>{STRUCTURE_CONTAINER_IDS.map((id) => getContainer(poster, id)).filter((container) => container && (['header', 'footer'].includes(container.id) || activeLayout.containerIds.includes(container.id))).map((container) => <option key={container.id} value={container.id}>{container.name}</option>)}</select></Field>
              <div className="component-library">{Object.entries(TYPE_META).map(([type, meta]) => { const Icon = meta.icon; return <button key={type} onClick={() => addComponent(type)}><div><Icon size={19} /></div><span><b>{meta.label}</b><em>{meta.description}</em></span><PlusCircle size={15} /></button> })}</div>
            </>}

            {activeTab === 'theme' && <>
              <div className="section-heading"><div><b>正能量弥散背景</b><span>每套包含协调的底色、强调色和正文色</span></div></div>
              <div className="background-presets">{BACKGROUND_PRESETS.map((preset) => <button key={preset.id} className={`theme-option-${preset.id} ${activeBackground.id === preset.id ? 'active' : ''}`} onClick={() => applyBackgroundPreset(preset.id)}><i style={{ background: preset.background }} /><span><b>{preset.label}</b><em>{preset.note}</em></span>{activeBackground.id === preset.id && <strong>✓</strong>}</button>)}</div>
              <div className="theme-form"><Field label="自定义底色"><div className="color-input"><input type="color" value={poster.background} onChange={(event) => commit((draft) => { draft.backgroundStyle = 'custom'; draft.background = event.target.value })} /><code>{poster.background}</code></div></Field><Field label="强调色"><div className="color-input"><input type="color" value={poster.accent} onChange={(event) => commit((draft) => { draft.accent = event.target.value })} /><code>{poster.accent}</code></div></Field><Field label="正文颜色"><div className="color-input"><input type="color" value={poster.textColor} onChange={(event) => commit((draft) => { draft.textColor = event.target.value })} /><code>{poster.textColor}</code></div></Field></div>
            </>}
          </div>
        </aside>

        <section className="canvas-area" ref={viewportRef}>
              <div className="canvas-toolbar"><div><b>{poster.name}</b><span>{posterWidth} × {posterHeight}px · 宽高自适应</span></div><div className="canvas-mode"><Box size={13} />固定栏宽 · 16:9 图片</div><div className="mobile-canvas-actions"><button aria-label="打开编辑工具" onClick={() => setMobilePanel('tools')}><Layers3 size={15} /><span>工具</span></button><button aria-label="打开属性设置" onClick={() => setMobilePanel('properties')}><Settings2 size={15} /><span>属性</span></button></div><div className="zoom-control"><button aria-label="缩小画布" title="缩小画布" onClick={() => setZoom((value) => Math.max(.2, value - .08))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="放大画布" title="最大 200%" onClick={() => setZoom((value) => Math.min(2, value + .08))}>＋</button></div></div>
          <div className="stage-scroll">
            <div className="stage-size" style={{ width: posterWidth * zoom, height: posterHeight * zoom }}>
              <div className="poster-transform" style={{ width: posterWidth, height: posterHeight, transform: `scale(${zoom})` }}>
                <article ref={posterRef} data-layout-width={posterWidth} className={`poster-page theme-${activeBackground.id} ${exporting ? 'is-exporting' : ''}`} style={{ width: posterWidth, padding: `${paddingTop}px ${POSTER.paddingX}px ${paddingBottom}px`, '--poster-bg': activeBackground.base, '--accent': poster.accent, '--poster-text': poster.textColor, '--poster-on-background': activeBackground.onBackground || poster.textColor, background: activeBackground.background }} onClick={() => setSelection(null)}>
                  {activeLayout.classic ? <div className="poster-layout classic-layout" style={{ minHeight: layoutMinHeight }}>
                    {showGlobalHeader && <PosterContainer container={globalHeader} containerWidth={posterWidth - POSTER.paddingX * 2} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} />}
                    <div className="classic-content-grid" style={{ gridTemplateColumns: activeColumnWidths.map((width) => `${width}px`).join(' ') }}><PosterContainer container={getContainer(poster, 'left')} containerWidth={activeColumnWidths[0]} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} /><PosterContainer container={getContainer(poster, 'right')} containerWidth={activeColumnWidths[1]} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} /></div>
                    <PosterContainer container={getContainer(poster, 'footer')} containerWidth={posterWidth - POSTER.paddingX * 2} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} />
                  </div> : <div className="poster-layout flexible-layout" style={{ minHeight: layoutMinHeight }}>
                    {showGlobalHeader && <PosterContainer container={globalHeader} containerWidth={posterWidth - POSTER.paddingX * 2} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} />}
                    <div className="adaptive-content-grid" style={{ gridTemplateColumns: activeColumnWidths.map((width) => `${width}px`).join(' ') }}>{activeLayout.containerIds.map((id, index) => <PosterContainer key={id} container={getContainer(poster, id)} containerWidth={activeColumnWidths[index]} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} />)}</div>
                    <PosterContainer container={getContainer(poster, 'footer')} containerWidth={posterWidth - POSTER.paddingX * 2} poster={poster} selection={selection} onSelect={setSelection} exporting={exporting} presentationMode={presentationMode} />
                  </div>}
                </article>
              </div>
            </div>
          </div>
          {toast && <div className="toast"><span>✓</span>{toast}</div>}
        </section>

        <aside className={`right-panel panel-surface ${mobilePanel === 'properties' ? 'mobile-open' : ''}`}>
          <button className="mobile-panel-close" aria-label="关闭属性设置" onClick={() => setMobilePanel(null)}><X size={17} /></button>
          <div className="properties-head">
            {selection && selection.kind !== 'container' && <button className="property-back" aria-label={`返回${propertyBackLabel}`} title={`返回${propertyBackLabel}`} onClick={goBackProperty}><ChevronLeft size={17} /></button>}
            <div className="properties-title"><b>{propertyTitle}</b><span>{propertySub}</span></div>
          </div>
          {renderProperties()}
          <div className="keyboard-hint"><span>容器管理布局</span><span>组件承载内容</span><span>表单修改文字与图片</span></div>
        </aside>
      </main> : appView === 'templates' ? <main className="library-page">
        <section className="library-hero library-hero-row"><div><span>LAYOUT RECIPES</span><h1>模板中心</h1><p>使用内置方案快速开始，也可以把当前海报沉淀为自己的可复用模板。</p></div><button className="library-create-button" onClick={openTemplateDialog}><LayoutTemplate size={17} />创建当前海报模板</button></section>
        {customTemplates.length > 0 && <><div className="library-section-title"><div><span>MY RECIPES</span><h2>我的模板</h2></div><em>{customTemplates.length} 个个人模板</em></div><section className="template-grid custom-template-grid">{customTemplates.map((template) => <article className="template-card custom-template-card" key={template.id} style={{ '--card-accent': template.poster?.accent || '#d45b20' }}><div className="template-poster-preview custom-preview"><PosterMiniPreview poster={template.poster} compact /></div><div className="template-card-copy"><span>个人模板</span><h2>{template.name}</h2><p>{template.description}</p><div><em>{new Date(template.createdAt).toLocaleDateString('zh-CN')}</em><span className="template-card-actions"><button className="template-delete" aria-label={`删除模板 ${template.name}`} onClick={() => deleteCustomTemplate(template)}><Trash2 size={13} /></button><button onClick={() => useCustomTemplate(template)}>使用此模板</button></span></div></div></article>)}</section></>}
        <div className="library-section-title"><div><span>CURATED RECIPES</span><h2>精选模板</h2></div><em>{TEMPLATE_PRESETS.length} 套结构方案</em></div>
        <section className="template-grid">{TEMPLATE_PRESETS.map((template, index) => { const background = BACKGROUND_PRESETS.find((item) => item.id === template.background); return <article className="template-card" key={template.id} style={{ '--card-accent': background?.accent || '#e55b18' }}><div className="template-poster-preview" style={{ background: background?.background }}><div className="template-preview-title" /><div className="template-preview-subtitle" /><div className="template-preview-columns" style={{ gridTemplateColumns: template.columns.map((ratio) => `${ratio}fr`).join(' ') }}>{template.columns.map((_, columnIndex) => <i key={columnIndex}><b /><b /><b /></i>)}</div></div><div className="template-card-copy"><span>模板 {String(index + 1).padStart(2, '0')}</span><h2>{template.name}</h2><p>{template.description}</p><div><em>{LAYOUT_PRESETS.find((item) => item.id === template.layout)?.label}</em><button onClick={() => useTemplate(template.id)}>使用此模板</button></div></div></article> })}</section>
      </main> : <main className="library-page projects-page">
        <section className="library-hero library-hero-row"><div><span>LOCAL ARCHIVE</span><h1>我的项目</h1><p>“保存”会覆盖当前项目；需要保留一个新版本时，请使用“另存为”。项目数据保存在当前浏览器中。</p></div><button className="library-create-button secondary-create" onClick={() => setAppView('editor')}><Plus size={17} />继续创作</button></section>
        {savedProjects.length ? <section className="project-grid">{savedProjects.map((record) => { const layout = LAYOUT_PRESETS.find((item) => item.id === record.poster.layout); const isCurrent = poster.projectId === record.id; return <article className={`project-card ${isCurrent ? 'current-project' : ''}`} key={record.id}>
          <div className="project-swatch"><PosterMiniPreview poster={record.poster} preview={record.previewMode === 'custom' ? record.preview : record.autoPreview || record.preview} /><div className="cover-actions"><button onClick={() => triggerImageUpload({ kind: 'projectPreview', projectId: record.id })}><ImagePlus size={12} />更换预览图</button>{record.previewMode === 'custom' && <button aria-label={`恢复 ${record.name} 自动预览`} onClick={() => resetProjectPreview(record)}><RotateCcw size={12} /></button>}</div></div>
          <div className="project-card-content"><div className="project-meta"><span>{new Date(record.savedAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>{isCurrent && <b>当前项目</b>}</div>
            {renamingProjectId === record.id ? <div className="project-name-editor"><input aria-label="项目名称" autoFocus value={projectNameDraft} onChange={(event) => setProjectNameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') renameProject(record); if (event.key === 'Escape') setRenamingProjectId(null) }} /><button aria-label="确认修改名称" onClick={() => renameProject(record)}><Check size={14} /></button><button aria-label="取消修改名称" onClick={() => setRenamingProjectId(null)}><X size={14} /></button></div> : <div className="project-title-row"><h2 title={record.name}>{record.name}</h2><button aria-label={`修改项目名称 ${record.name}`} onClick={() => beginRenameProject(record)}><Pencil size={13} /></button></div>}
            <p>{layout?.label || '自定义布局'} · {record.poster.containers.reduce((sum, container) => sum + container.components.length, 0)} 个组件</p>
            <div className="project-card-actions"><button className="project-open" onClick={() => openSavedProject(record)}>打开继续编辑</button><button aria-label={`创建 ${record.name} 副本`} title="创建副本" onClick={() => duplicateProject(record)}><Copy size={14} /></button><button className="danger" aria-label={`删除项目 ${record.name}`} title="删除项目" onClick={() => deleteProject(record)}><Trash2 size={14} /></button></div>
          </div>
        </article> })}</section> : <section className="empty-projects"><Save size={28} /><h2>还没有保存的项目</h2><p>返回海报编辑器，点击右上角“保存”，作品就会出现在这里。</p><button onClick={() => setAppView('editor')}>返回编辑器</button></section>}
      </main>}
      {mobilePanel && <button className="mobile-panel-backdrop" aria-label="关闭面板" onClick={() => setMobilePanel(null)} />}
      <input ref={fileInputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { handleImages(event.target.files); event.target.value = ''; event.target.multiple = false }} />
      {saveAsOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSaveAsOpen(false) }}><section className="asset-dialog" role="dialog" aria-modal="true" aria-labelledby="save-as-title"><button className="dialog-close" aria-label="关闭另存为" onClick={() => setSaveAsOpen(false)}><X size={17} /></button><span>CREATE A VERSION</span><h2 id="save-as-title">另存为新项目</h2><p>新项目会成为当前编辑版本，原项目保持不变。</p><Field label="新项目名称"><input autoFocus value={saveAsName} onChange={(event) => setSaveAsName(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && saveProjectAs()} /></Field><div className="dialog-actions"><button onClick={() => setSaveAsOpen(false)}>取消</button><button className="primary-dialog-action" onClick={saveProjectAs}><Copy size={14} />创建新项目</button></div></section></div>}
      {templateDialogOpen && <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTemplateDialogOpen(false) }}><section className="asset-dialog template-dialog" role="dialog" aria-modal="true" aria-labelledby="template-dialog-title"><button className="dialog-close" aria-label="关闭创建模板" onClick={() => setTemplateDialogOpen(false)}><X size={17} /></button><div className="dialog-template-preview"><PosterMiniPreview poster={poster} compact /></div><div className="dialog-template-form"><span>BUILD A RECIPE</span><h2 id="template-dialog-title">创建个人模板</h2><p>保存当前布局、组件和风格。以后使用时会自动创建独立项目，不影响模板本身。</p><Field label="模板名称"><input autoFocus value={templateDraft.name} onChange={(event) => setTemplateDraft((current) => ({ ...current, name: event.target.value }))} /></Field><Field label="模板说明"><textarea rows="3" value={templateDraft.description} onChange={(event) => setTemplateDraft((current) => ({ ...current, description: event.target.value }))} /></Field><div className="dialog-actions"><button onClick={() => setTemplateDialogOpen(false)}>取消</button><button className="primary-dialog-action" onClick={createCustomTemplate}><LayoutTemplate size={14} />保存到模板中心</button></div></div></section></div>}
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
