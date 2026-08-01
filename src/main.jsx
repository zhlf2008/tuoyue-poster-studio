import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { toBlob } from 'html-to-image'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
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
} from 'lucide-react'
import './styles.css'

const POSTER = { baseWidth: 820, minHeight: 1220, paddingX: 40, columnGap: 22 }
const SAVE_KEY = 'meeting-poster-components-v2'
const PROJECTS_KEY = 'meeting-poster-projects-v1'
const CUSTOM_TEMPLATES_KEY = 'meeting-poster-custom-templates-v1'
const uid = () => Math.random().toString(36).slice(2, 9)
const PARTICIPANT_GRID = { width: 348, gap: 3, targetHeight: 1000, maxColumns: 120 }

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
  rowGroup: { label: 'æ¨ªå‘ç»„ä»¶ç»„', icon: LayoutGrid, description: '2â€“4 ä¸ªç»„ä»¶å¹¶åˆ—æ’ç‰ˆ' },
  hero: { label: 'ä¸»é¢˜æ ‡é¢˜', icon: Type, description: 'ä¸»æ ‡é¢˜ä¸å‰¯æ ‡é¢˜' },
  info: { label: 'ä¼šè®®ä¿¡æ¯', icon: FileText, description: 'æ ‡é¢˜ä¸è¦ç‚¹åˆ—è¡¨' },
  guestGrid: { label: 'å˜‰å®¾ç»„', icon: CircleUserRound, description: 'è‡ªåŠ¨æ’åˆ—ç…§ç‰‡ä¸èº«ä»½' },
  mosaic: { label: 'å‚ä¼šç…§ç‰‡ç½‘æ ¼', icon: Users, description: 'æ‰¹é‡ä¸Šä¼  16:9 äººç‰©ç…§ç‰‡' },
  imageBlock: { label: 'å›¾ç‰‡åŒº', icon: ImagePlus, description: 'å•å¼ å›¾ç‰‡ä¸è¯´æ˜' },
  textBlock: { label: 'å¤šè¡Œæ–‡æœ¬', icon: PanelTop, description: 'æ”¯æŒæ¢è¡Œã€å­—å·ä¸è¡Œè·' },
  brand: { label: 'é¡µè„šç½²å', icon: Sparkles, description: 'å“ç‰Œæˆ–ç»„ç»‡åç§°' },
}

const CONTENT_CONTAINER_IDS = ['left', 'extra1', 'extra2', 'extra3', 'right']
const STRUCTURE_CONTAINER_IDS = ['header', 'left', 'extra1', 'extra2', 'extra3', 'right', 'footer']

const expandedPosterWidth = (columnWidths) => Math.max(
  POSTER.baseWidth,
  POSTER.paddingX * 2 + columnWidths.reduce((sum, width) => sum + width, 0) + POSTER.columnGap * Math.max(0, columnWidths.length - 1),
)

const LAYOUT_PRESETS = [
  { id: 'classic', label: 'ç»å…¸åŒæ ', note: '326 + 392 px', columnWidths: [326, 392], containerIds: ['left', 'right'], classic: true },
  { id: 'single', label: 'å•æ é€šæ ', note: '740 px', columnWidths: [740], containerIds: ['left'] },
  { id: 'dualEqual', label: 'ç­‰å®½åŒæ ', note: '392 + 392 px', columnWidths: [392, 392], containerIds: ['left', 'right'] },
  { id: 'dualNarrowWide', label: 'çª„å·¦å®½å³', note: '392 + 588 px', columnWidths: [392, 588], containerIds: ['left', 'right'] },
  { id: 'dualWideNarrow', label: 'å®½å·¦çª„å³', note: '588 + 392 px', columnWidths: [588, 392], containerIds: ['left', 'right'] },
  { id: 'tripleEqual', label: 'ç­‰å®½ä¸‰æ ', note: '3 Ã— 392 px', columnWidths: [392, 392, 392], containerIds: ['left', 'extra1', 'right'] },
  { id: 'tripleFocus', label: 'é‡ç‚¹ä¸‰æ ', note: '392 + 588 + 392 px', columnWidths: [392, 588, 392], containerIds: ['left', 'extra1', 'right'] },
  { id: 'tripleLead', label: 'ä¸»æ ä¸‰åˆ—', note: '588 + 392 + 392 px', columnWidths: [588, 392, 392], containerIds: ['left', 'extra1', 'right'] },
  { id: 'quadEqual', label: 'ç­‰å®½å››æ ', note: '4 Ã— 392 px', columnWidths: [392, 392, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'right'] },
  { id: 'quadFocus', label: 'é‡ç‚¹å››æ ', note: '392 + 588 + 392 + 392 px', columnWidths: [392, 588, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'right'] },
  { id: 'pentaEqual', label: 'ç­‰å®½äº”æ ', note: '5 Ã— 392 px', columnWidths: [392, 392, 392, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'extra3', 'right'] },
  { id: 'pentaFocus', label: 'é‡ç‚¹äº”æ ', note: '392 + 392 + 588 + 392 + 392 px', columnWidths: [392, 392, 588, 392, 392], containerIds: ['left', 'extra1', 'extra2', 'extra3', 'right'] },
].map((preset) => ({ ...preset, width: expandedPosterWidth(preset.columnWidths) }))

const TEMPLATE_PRESETS = [
  { id: 'classicWarm', name: 'æš–æ©™ä¼šè®®çºªå®', description: 'ç»å…¸åŒæ ï¼Œé€‚åˆä¼šè®®å¤ç›˜ä¸ç­ä¼šè®°å½•', layout: 'classic', background: 'warmPaper', columns: [1, 1] },
  { id: 'forumTriple', name: 'ä¸‰æ è®ºå›å…¨æ™¯', description: 'å˜‰å®¾ã€å›åº”ä¸å‚ä¼šç”»é¢åˆ†æ å‘ˆç°', layout: 'tripleFocus', background: 'clearSky', columns: [1, 1.5, 1] },
  { id: 'newYearGathering', name: 'æ–°æ˜¥å›¢æ‹œä¼š', description: 'çº¢é‡‘å–œåº†æ°›å›´ï¼Œé€‚åˆå¹´ä¼šä¸å›¢æ‹œæ´»åŠ¨', layout: 'dualWideNarrow', background: 'newYear', columns: [1.5, 1] },
  { id: 'recognitionCeremony', name: 'æ¿€åŠ±è¡¨å½°ç››å…¸', description: 'é‡‘è‰²è£èª‰æ„Ÿï¼Œçªå‡ºè·å¥–äººç‰©ä¸ç°åœº', layout: 'dualNarrowWide', background: 'recognition', columns: [1, 1.5] },
  { id: 'singleStory', name: 'å•æ æ´»åŠ¨é•¿å›¾', description: 'æŒ‰æ—¶é—´é¡ºåºçºµå‘å™äº‹ï¼Œé€‚åˆç§»åŠ¨ç«¯åˆ†äº«', layout: 'single', background: 'sunrise', columns: [1] },
]

const BACKGROUND_PRESETS = [
  {
    id: 'warmPaper', label: 'æš–é˜³å®£çº¸', note: 'æ¸©æš–ã€æ²‰é™', base: '#f8ead2', accent: '#b93b0d', text: '#6f3825',
    background: 'radial-gradient(circle at 10% 88%, rgba(255,139,56,.30), transparent 31%), radial-gradient(circle at 82% 18%, rgba(255,255,255,.62), transparent 30%), #f8ead2',
  },
  {
    id: 'sunrise', label: 'æœéœæ©™å…‰', note: 'çƒ­çƒˆã€å‘ä¸Š', base: '#fff0d8', accent: '#bd3f0d', text: '#713621',
    background: 'radial-gradient(circle at 16% 10%, rgba(255,194,91,.66), transparent 34%), radial-gradient(circle at 88% 34%, rgba(255,120,78,.34), transparent 38%), radial-gradient(circle at 42% 92%, rgba(255,219,142,.55), transparent 35%), #fff0d8',
  },
  {
    id: 'clearSky', label: 'æ™´ç©ºä¸‡é‡Œ', note: 'æ¸…æœ—ã€å¼€é˜”', base: '#eaf5f5', accent: '#bd400e', text: '#315b61',
    background: 'radial-gradient(circle at 18% 14%, rgba(255,222,135,.62), transparent 29%), radial-gradient(circle at 78% 20%, rgba(101,192,221,.38), transparent 40%), radial-gradient(circle at 20% 92%, rgba(120,206,193,.28), transparent 35%), #eaf5f5',
  },
  {
    id: 'springGreen', label: 'æ˜¥ç”Ÿæ–°ç»¿', note: 'æˆé•¿ã€å¸Œæœ›', base: '#eff4df', accent: '#b63f0e', text: '#3f6146',
    background: 'radial-gradient(circle at 12% 18%, rgba(255,226,118,.55), transparent 30%), radial-gradient(circle at 82% 16%, rgba(131,190,124,.34), transparent 37%), radial-gradient(circle at 52% 94%, rgba(183,214,116,.38), transparent 36%), #eff4df',
  },
  {
    id: 'peachBloom', label: 'æ¡ƒææ˜¥é£', note: 'äº²å’Œã€æ˜äº®', base: '#fbe8df', accent: '#b83e18', text: '#754139',
    background: 'radial-gradient(circle at 15% 15%, rgba(255,190,161,.48), transparent 33%), radial-gradient(circle at 86% 22%, rgba(255,222,153,.48), transparent 36%), radial-gradient(circle at 30% 90%, rgba(238,149,136,.28), transparent 35%), #fbe8df',
  },
  {
    id: 'golden', label: 'é‡‘è‰²åº†å…¸', note: 'åº„é‡ã€ä¸°ç››', base: '#f6ecd5', accent: '#b53e13', text: '#674326',
    background: 'radial-gradient(circle at 18% 12%, rgba(255,205,92,.58), transparent 29%), radial-gradient(circle at 82% 18%, rgba(219,128,38,.24), transparent 34%), radial-gradient(circle at 62% 88%, rgba(255,224,150,.58), transparent 39%), #f6ecd5',
  },
  {
    id: 'newYear', label: 'æ–°æ˜¥å–œåº†', note: 'çº¢ç«ã€å›¢åœ†', base: '#f7ddd0', accent: '#b5261c', text: '#542923',
    background: 'radial-gradient(circle at 14% 12%, rgba(255,205,88,.58), transparent 28%), radial-gradient(circle at 88% 18%, rgba(210,54,37,.28), transparent 34%), radial-gradient(circle at 52% 94%, rgba(176,27,22,.20), transparent 42%), linear-gradient(145deg, #fbe8d8, #efc4bb)',
  },
  {
    id: 'solemnRedGold', label: 'å¤§çº¢éé‡‘', note: 'åº„é‡ã€å…¸ç¤¼', base: '#8f1118', accent: '#f2c766', text: '#5b261e', onBackground: '#ffe6a5',
    background: '#8f1118',
  },
  {
    id: 'recognition', label: 'æ¿€åŠ±è¡¨å½°', note: 'è£è€€ã€å¥‹è¿›', base: '#f4e5bd', accent: '#b72d20', text: '#5e432a',
    background: 'radial-gradient(circle at 16% 10%, rgba(255,210,82,.72), transparent 30%), radial-gradient(circle at 84% 16%, rgba(183,45,32,.28), transparent 34%), radial-gradient(circle at 56% 92%, rgba(226,159,42,.42), transparent 40%), linear-gradient(145deg, #fbf0cf, #ead4a2)',
  },
]

const defaultGuest = (name = 'å˜‰å®¾å§“å', role = 'å˜‰å®¾èº«ä»½') => ({ id: uid(), name, role, image: '' })

const DEMO_NAMES = ['æ—çŸ¥å¤', 'å‘¨æ™¯è¡Œ', 'è®¸å®‰ç„¶', 'æ²ˆæ˜è¿œ', 'é™†æ˜Ÿæ²³', 'è‹æ¸…å’Œ', 'ç¨‹è‹¥è°·', 'é¡¾è¨€åˆ', 'å¤é—»æºª', 'æ±Ÿäºˆå®‰', 'å®‹äº‘èˆŸ', 'å¶ä¹¦å®', 'éŸ©å˜‰æ ‘', 'ä¹”æ˜ é›ª', 'æ–¹äºˆæ™´', 'ç§¦æ…•å·']
const DEMO_CLASSES = ['æ˜å¾·å…±å­¦ä¸€ç­', 'çŸ¥è¡Œç ”ä¿®äºŒç­', 'æ˜Ÿç«æˆé•¿ä¸‰ç­', 'æ˜¥æ™–å®è·µä¸€ç­', 'åšé›…å…±åˆ›äºŒç­', 'æ¸…å’Œè¿›é˜¶ç­', 'è‡´è¿œé¢†èˆªç­', 'åŒå¿ƒç ”ä¹ ç­']
const DEMO_ROLES = ['ç»„ç»‡å§”å‘˜', 'ç­é•¿', 'å­¦ä¹ å§”å‘˜', 'æ‰§è¡Œç­é•¿', 'å®£ä¼ å§”å‘˜', 'ç§˜ä¹¦é•¿', 'å…±åˆ›å¬é›†äºº', 'è¯¾ç¨‹è”ç»œå‘˜']

function shuffled(values) {
  return [...values].sort(() => Math.random() - .5)
}

function generateDemoGuests(count) {
  const names = shuffled(DEMO_NAMES)
  const classes = shuffled(DEMO_CLASSES)
  return Array.from({ length: count }, (_, index) => defaultGuest(
    names[index % names.length],
    `${classes[index % classes.length]} Â· ${DEMO_ROLES[index % DEMO_ROLES.length]}`,
  ))
}

function componentDefaults(type) {
  const base = { id: uid(), type, visible: true, gapAfter: 14, cardMode: 'inherit' }
  switch (type) {
    case 'hero':
      return { ...base, title: 'è‰¯çŸ¥ç­å§”å¤œè¯', subtitle: 'ä¹‰ä¹Œåœ°åŒºç»å…¸è¯¾å ‚ç»„ç»‡å§”å‘˜å…±åˆ›ä¼š', titleSize: 48, subtitleSize: 12, subtitleDecoration: 'solid', align: 'center', cardMode: 'hide' }
    case 'info':
      return { ...base, heading: 'å¤œè¯å›é¡¾', rows: ['å¤œè¯æ—¶é—´ï¼š7æœˆ5æ—¥ å‘¨æ—¥æ™š 20:00', 'é¢å‘äººç¾¤ï¼šå…¨ä½“ç»å…¸è¯¾å ‚ç­å§”'], cardMode: 'show' }
    case 'guestGrid':
      return { ...base, heading: 'å˜‰å®¾åˆ†äº«', columns: 2, items: [defaultGuest(), defaultGuest()] }
    case 'mosaic':
      return { ...base, heading: 'å‚ä¼šäººå‘˜', photos: [], count: 20, photoGap: 3 }
    case 'imageBlock':
      return { ...base, heading: 'ä¼šè®®ç°åœº', image: '', caption: 'ç‚¹å‡»å³ä¾§ä¸Šä¼ å›¾ç‰‡', fit: 'cover' }
    case 'textBlock':
      return { ...base, heading: 'å¤šè¡Œæ–‡æœ¬', body: 'åœ¨è¿™é‡Œè¾“å…¥ä¼šè®®æ€»ç»“ã€å˜‰å®¾é‡‘å¥æˆ–æ´»åŠ¨è¯´æ˜ã€‚\næ”¯æŒè¾“å…¥å¤šè¡Œå†…å®¹ï¼Œå¹¶åˆ†åˆ«è®¾ç½®å­—å·å’Œè¡Œè·ã€‚', align: 'left', fontSize: 11, lineHeight: 1.72 }
    case 'brand':
      return { ...base, text: 'ä¹‰èµ·å‘å…‰', note: '', textSize: 25, noteSize: 8, cardMode: 'hide' }
    case 'rowGroup': {
      const text = { ...componentDefaults('textBlock'), heading: 'å…±åˆ›è¦ç‚¹', body: 'åœ¨è¿™é‡Œå¡«å†™å¹¶åˆ—å±•ç¤ºçš„é‡ç‚¹å†…å®¹ã€‚', gapAfter: 0 }
      const image = { ...componentDefaults('imageBlock'), heading: 'ç°åœºç”»é¢', gapAfter: 0 }
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
    name: 'æš–æ©™ä¼šè®®çºªå®',
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
        id: 'header', name: 'å…¨å±€é¡µå¤´', description: 'è·¨æ æ˜¾ç¤ºæ ‡é¢˜ä¸ä¼šè®®ä¿¡æ¯',
        style: { background: 'transparent', padding: 0, gap: 14, radius: 0 },
        components: [],
      },
      {
        id: 'left', name: 'é¦–æ å†…å®¹', description: 'å˜‰å®¾ã€è®®ç¨‹ä¸ä¸»è¦æ­£æ–‡',
        style: { background: 'rgba(255,253,247,.78)', padding: 22, gap: 16, radius: 22 },
        components: [
          componentDefaults('hero'),
          componentDefaults('info'),
          {
            ...componentDefaults('guestGrid'), heading: 'ç‰¹é‚€åˆ†äº« Â· å›åº”å˜‰å®¾',
            items: demoGuests.slice(0, 6),
          },
          {
            ...componentDefaults('guestGrid'), heading: 'æé—®å˜‰å®¾',
            items: demoGuests.slice(6, 8),
          },
          {
            ...componentDefaults('guestGrid'), heading: 'ç­”ç–‘ç ¥ç º Â· å¤œè¯æ€»ç»“',
            items: demoGuests.slice(8, 10),
          },
        ],
      },
      {
        id: 'right', name: 'æœ«æ å†…å®¹', description: 'æœ«æ ç»„ä»¶ä¸å‚ä¼šç…§ç‰‡ç½‘æ ¼',
        style: { background: 'rgba(255,253,247,.82)', padding: 22, gap: 16, radius: 22 },
        components: [componentDefaults('mosaic')],
      },
      {
        id: 'extra1', name: 'ä¸­æ å†…å®¹ A', description: 'ä¸‰è‡³äº”æ å¸ƒå±€çš„æ‰©å±•å†…å®¹',
        style: { background: 'rgba(255,253,247,.80)', padding: 18, gap: 14, radius: 20 },
        components: [],
      },
      {
        id: 'extra2', name: 'ä¸­æ å†…å®¹ B', description: 'å››è‡³äº”æ å¸ƒå±€çš„ç¬¬äºŒæ‰©å±•å†…å®¹',
        style: { background: 'rgba(255,253,247,.80)', padding: 18, gap: 14, radius: 20 },
        components: [],
      },
      {
        id: 'extra3', name: 'ä¸­æ å†…å®¹ C', description: 'äº”æ å¸ƒå±€çš„ç¬¬ä¸‰æ‰©å±•å†…å®¹',
        style: { background: 'rgba(255,253,247,.80)', paÛ­<âÚ$z{-®éÜj×÷6VÆV7CãÂôf–VÆCà¢ÆF—b6Æ74æÖSÒ&6ö×öæVçBÖÆ–'&'’#ç´ö&¦V7BæVçG&–W2…E•UôÔUD’æÖ‚…·G—RÂÖWFÒ’Óâ²6öç7B–6öâÒÖWFæ–6öã²&WGW&âÆ'WGFöâ¶W“×·G—WÒöä6Æ–6³×²‚’ÓâFD6ö×öæVçB‡G—R—ÓãÆF—cãÄ–6öâ6—¦S×³—ÒóãÂöF—cãÇ7ããÆ#ç¶ÖWFæÆ&VÇÓÂö#ãÆVÓç¶ÖWFæFW67&—F–öçÓÂöVÓãÂ÷7ããÅÇW46—&6ÆR6—¦S×³WÒóãÂö'WGFöãâÒ—ÓÂöF—cà¢ÂóçĞ ¢¶7F—fUF"ÓÓÒwF†VÖRrbbÃà¢ÆF—b6Æ74æÖSÒ'6V7F–öâÖ†VF–ær#ãÆF—cãÆ#îjÚ>ˆ;Ş˜xş[Ê^iZ>ˆ8ÎišóÂö#ãÇ7ãîjøşZY~XÈ^Y
¾XØş‹>y¨N[©^ˆ›.8[Ë®‹>ˆ›.Y(ÎjÚ>ih~ˆ›#Â÷7ããÂöF—cãÂöF—cà¢ÆF—b6Æ74æÖSÒ&&6¶w&÷VæB×&W6WG2#ç´$4´u$õTäEõ$U4UE2æÖ‚‡&W6WB’ÓâÆ'WGFöâ¶W“×·&W6WBæ–GÒ6Æ74æÖS×¶F†VÖRÖ÷F–öâÒG·&W6WBæ–GÒG¶7F—fT&6¶w&÷VæBæ–BÓÓÒ&W6WBæ–Bòv7F—fRr¢rwÖÒöä6Æ–6³×²‚’ÓâÇ”&6¶w&÷VæE&W6WB‡&W6WBæ–B—ÓãÆ’7G–ÆS×·²&6¶w&÷VæC¢&W6WBæ&6¶w&÷VæB×ÒóãÇ7ããÆ#ç·&W6WBæÆ&VÇÓÂö#ãÆVÓç·&W6WBææ÷FWÓÂöVÓãÂ÷7ãç¶7F—fT&6¶w&÷VæBæ–BÓÓÒ&W6WBæ–BbbÇ7G&öæsî)É3Â÷7G&öæsçÓÂö'WGFöãâ—ÓÂöF—cà¢ÆF—b6Æ74æÖSÒ'F†VÖRÖf÷&Ò#ãÄf–VÆBÆ&VÃÒ.ˆz®Zé®K˜[©^ˆ›"#ãÆF—b6Æ74æÖSÒ&6öÆ÷"Ö–çWB#ãÆ–çWBG—SÒ&6öÆ÷""fÇVS×·÷7FW"æ&6¶w&÷VæGÒöä6†ævS×²†WfVçB’Óâ6öÖÖ—B‚†G&gB’Óâ²G&gBæ&6¶w&÷VæE7G–ÆRÒv7W7FöÒs²G&gBæ&6¶w&÷VæBÒWfVçBçF&vWBçfÇVRÒ—ÒóãÆ6öFSç·÷7FW"æ&6¶w&÷VæGÓÂö6öFSãÂöF—cãÂôf–VÆCãÄf–VÆBÆ&VÃÒ.[Ë®‹>ˆ›"#ãÆF—b6Æ74æÖSÒ&6öÆ÷"Ö–çWB#ãÆ–çWBG—SÒ&6öÆ÷""fÇVS×·÷7FW"æ66VçGÒöä6†ævS×²†WfVçB’Óâ6öÖÖ—B‚†G&gB’Óâ²G&gBæ66VçBÒWfVçBçF&vWBçfÇVRÒ—ÒóãÆ6öFSç·÷7FW"æ66VçGÓÂö6öFSãÂöF—cãÂôf–VÆCãÄf–VÆBÆ&VÃÒ.jÚ>ih~š)Îˆ›"#ãÆF—b6Æ74æÖSÒ&6öÆ÷"Ö–çWB#ãÆ–çWBG—SÒ&6öÆ÷""fÇVS×·÷7FW"çFW‡D6öÆ÷'Òöä6†ævS×²†WfVçB’Óâ6öÖÖ—B‚†G&gB’Óâ²G&gBçFW‡D6öÆ÷"ÒWfVçBçF&vWBçfÇVRÒ—ÒóãÆ6öFSç·÷7FW"çFW‡D6öÆ÷'ÓÂö6öFSãÂöF—cãÂôf–VÆCãÂöF—cà¢ÂóçĞ¢ÂöF—cà¢Âö6–FSà ¢Ç6V7F–öâ6Æ74æÖSÒ&6çf2Ö&V"&Vc×·f–Ww÷'E&VgÓà¢ÆF—b6Æ74æÖSÒ&6çf2×FööÆ&"#ãÆF—cãÆ#ç·÷7FW"ææÖWÓÂö#ãÇ7ãç·÷7FW%v–GF‡Ò9r·÷7FW$†V–v‡G×‚+rZëŞš¹ˆz®˜.[©CÂ÷7ããÂöF—cãÆF—b6Æ74æÖSÒ&6çf2ÖÖöFR#ãÄ&÷‚6—¦S×³7ÒóîY»®Zé®jşZëÒ+rc£’Y»îx˜sÂöF—cãÆF—b6Æ74æÖSÒ'¦ööÒÖ6öçG&öÂ#ãÆ'WGFöâ&–ÖÆ&VÃÒ.{Ê[şyK¾[ˆ2"F—FÆSÒ.{Ê[şyK¾[ˆ2"öä6Æ–6³×²‚’Óâ6WE¦ööÒ‚‡fÇVR’ÓâÖF‚æÖ‚‚ã"ÂfÇVRÒã‚’—Óî(‰#Âö'WGFöããÇ7ãç´ÖF‚ç&÷VæB‡¦ööÒ¢—ÒSÂ÷7ããÆ'WGFöâ&–ÖÆ&VÃÒ.iKîZJ~yK¾[ˆ2"F—FÆSÒ.iÈZJr#R"öä6Æ–6³×²‚’Óâ6WE¦ööÒ‚‡fÇVR’ÓâÖF‚æÖ–âƒ"ÂfÇVR²ã‚’—ÓîûÈ³Âö'WGFöããÂöF—cãÂöF—cà¢ÆF—b6Æ74æÖSÒ'7FvR×67&öÆÂ#à¢ÆF—b6Æ74æÖSÒ'7FvR×6—¦R"7G–ÆS×·²v–GFƒ¢÷7FW%v–GF‚¢¦ööÒÂ†V–v‡C¢÷7FW$†V–v‡B¢¦ööÒ×Óà¢ÆF—b6Æ74æÖSÒ'÷7FW"×G&ç6f÷&Ò"7G–ÆS×·²v–GFƒ¢÷7FW%v–GF‚Â†V–v‡C¢÷7FW$†V–v‡BÂG&ç6f÷&Ó¢66ÆR‚G·¦öö×Ò–×Óà¢Æ'F–6ÆR&Vc×·÷7FW%&VgÒFFÖÆ–÷WB×v–GFƒ×·÷7FW%v–GF‡Ò6Æ74æÖS×¶÷7FW"×vRF†VÖRÒG¶7F—fT&6¶w&÷VæBæ–GÒG¶W‡÷'F–æròv—2ÖW‡÷'F–ærr¢rwÖÒ7G–ÆS×·²v–GFƒ¢÷7FW%v–GF‚ÂFF–æs¢G·FF–æuF÷×‚Gµõ5DU"çFF–æu‡×‚G·FF–æt&÷GFö××†ÂrÒ×÷7FW"Ö&rs¢7F—fT&6¶w&÷VæBæ&6RÂrÒÖ66VçBs¢÷7FW"æ66VçBÂrÒ×÷7FW"×FW‡Bs¢÷7FW"çFW‡D6öÆ÷"ÂrÒ×÷7FW"ÖöâÖ&6¶w&÷VæBs¢7F—fT&6¶w&÷VæBæöä&6¶w&÷VæBÇÂ÷7FW"çFW‡D6öÆ÷"Â&6¶w&÷VæC¢7F—fT&6¶w&÷VæBæ&6¶w&÷VæB×Òöä6Æ–6³×²‚’Óâ6WE6VÆV7F–öâ†çVÆÂ—Óà¢¶7F—fTÆ–÷WBæ6Æ76–2òÆF—b6Æ74æÖSÒ'÷7FW"ÖÆ–÷WB6Æ76–2ÖÆ–÷WB"7G–ÆS×·²Ö–ä†V–v‡C¢Æ–÷WDÖ–ä†V–v‡B×Óà¢·6†÷tvÆö&Ä†VFW"bbÅ÷7FW$6öçF–æW"6öçF–æW#×¶vÆö&Ä†VFW'Ò6öçF–æW%v–GFƒ×·÷7FW%v–GF‚Òõ5DU"çFF–æu‚¢'Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóçĞ¢ÆF—b6Æ74æÖSÒ&6Æ76–2Ö6öçFVçBÖw&–B"7G–ÆS×·²w&–EFV×ÆFT6öÇVÖç3¢7F—fT6öÇVÖåv–GF‡2æÖ‚‡v–GF‚’ÓâG·v–GF‡×†’æ¦ö–â‚rr’×ÓãÅ÷7FW$6öçF–æW"6öçF–æW#×¶vWD6öçF–æW"‡÷7FW"ÂvÆVgBr—Ò6öçF–æW%v–GFƒ×¶7F—fT6öÇVÖåv–GF‡5³×Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóãÅ÷7FW$6öçF–æW"6öçF–æW#×¶vWD6öçF–æW"‡÷7FW"Âw&–v‡Br—Ò6öçF–æW%v–GFƒ×¶7F—fT6öÇVÖåv–GF‡5³×Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóãÂöF—cà¢Å÷7FW$6öçF–æW"6öçF–æW#×¶vWD6öçF–æW"‡÷7FW"Âvfö÷FW"r—Ò6öçF–æW%v–GFƒ×·÷7FW%v–GF‚Òõ5DU"çFF–æu‚¢'Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóà¢ÂöF—câ¢ÆF—b6Æ74æÖSÒ'÷7FW"ÖÆ–÷WBfÆW†–&ÆRÖÆ–÷WB"7G–ÆS×·²Ö–ä†V–v‡C¢Æ–÷WDÖ–ä†V–v‡B×Óà¢·6†÷tvÆö&Ä†VFW"bbÅ÷7FW$6öçF–æW"6öçF–æW#×¶vÆö&Ä†VFW'Ò6öçF–æW%v–GFƒ×·÷7FW%v–GF‚Òõ5DU"çFF–æu‚¢'Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóçĞ¢ÆF—b6Æ74æÖSÒ&FF—fRÖ6öçFVçBÖw&–B"7G–ÆS×·²w&–EFV×ÆFT6öÇVÖç3¢7F—fT6öÇVÖåv–GF‡2æÖ‚‡v–GF‚’ÓâG·v–GF‡×†’æ¦ö–â‚rr’×Óç¶7F—fTÆ–÷WBæ6öçF–æW$–G2æÖ‚†–BÂ–æFW‚’ÓâÅ÷7FW$6öçF–æW"¶W“×¶–GÒ6öçF–æW#×¶vWD6öçF–æW"‡÷7FW"Â–B—Ò6öçF–æW%v–GFƒ×¶7F—fT6öÇVÖåv–GF‡5¶–æFW…×Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóâ—ÓÂöF—cà¢Å÷7FW$6öçF–æW"6öçF–æW#×¶vWD6öçF–æW"‡÷7FW"Âvfö÷FW"r—Ò6öçF–æW%v–GFƒ×·÷7FW%v–GF‚Òõ5DU"çFF–æu‚¢'Ò÷7FW#×·÷7FW'Ò6VÆV7F–öã×·6VÆV7F–öçÒöå6VÆV7C×·6WE6VÆV7F–öçÒW‡÷'F–æs×¶W‡÷'F–æwÒ&W6VçFF–öäÖöFS×·&W6VçFF–öäÖöFWÒóà¢ÂöF—cçĞ¢Âö'F–6ÆSà¢ÂöF—cà¢ÂöF—cà¢ÂöF—cà¢·Fö7BbbÆF—b6Æ74æÖSÒ'Fö7B#ãÇ7ãî)É3Â÷7ãç·Fö7GÓÂöF—cçĞ¢Â÷6V7F–öãà ¢Æ6–FR6Æ74æÖSÒ'&–v‡B×æVÂæVÂ×7W&f6R#à¢ÆF—b6Æ74æÖSÒ'&÷W'F–W2Ö†VB#à¢·6VÆV7F–öâbb6VÆV7F–öâæ¶–æBÓÒv6öçF–æW"rbbÆ'WGFöâ6Æ74æÖSÒ'&÷W'G’Ö&6²"&–ÖÆ&VÃ×¶‹ùNY¹âG·&÷W'G”&6´Æ&VÇÖÒF—FÆS×¶‹ùNY¹âG·&÷W'G”&6´Æ&VÇÖÒöä6Æ–6³×¶vô&6µ&÷W'G—ÓãÄ6†Wg&öäÆVgB6—¦S×³wÒóãÂö'WGFöãçĞ¢ÆF—b6Æ74æÖSÒ'&÷W'F–W2×F—FÆR#ãÆ#ç·&÷W'G•F—FÆWÓÂö#ãÇ7ãç·&÷W'G•7V'ÓÂ÷7ããÂöF—cà¢ÂöF—cà¢·&VæFW%&÷W'F–W2‚—Ğ¢ÆF—b6Æ74æÖSÒ&¶W–&ö&BÖ†–çB#ãÇ7ãîZëYšzêyn[ˆ>[Â÷7ããÇ7ãî{¸NK»nh›ş‹ÛŞXh^Zë“Â÷7ããÇ7ãîŠXÙ^KúîiKih~ZÙ~KˆîY»îx˜sÂ÷7ããÂöF—cà¢Âö6–FSà¢ÂöÖ–ãâ¢f–WrÓÓÒwFV×ÆFW2ròÆÖ–â6Æ74æÖSÒ&Æ–'&'’×vR#à¢Ç6V7F–öâ6Æ74æÖSÒ&Æ–'&'’Ö†W&òÆ–'&'’Ö†W&ò×&÷r#ãÆF—cãÇ7ãäÄ”õUB$T4•U3Â÷7ããÆƒîjŠiÛşKŠŞ[ø3ÂöƒãÇîKÛşyJXh^{Úîikj[ú¾˜	ş[ÈZx¾ûÈÎK™şXúşKº^h¨®[Ù>X˜Şk[~hª^k(kxK‹®ˆz®[{y¨NXúşZHŞyJjŠiÛş8#Â÷ãÂöF—cãÆ'WGFöâ6Æ74æÖSÒ&Æ–'&'’Ö7&VFRÖ'WGFöâ"öä6Æ–6³×¶÷VåFV×ÆFTF–ÆöwÓãÄÆ–÷WEFV×ÆFR6—¦S×³wÒóîX‰¾[»®[Ù>X˜Şk[~hª^jŠiÛóÂö'WGFöããÂ÷6V7F–öãà¢¶7W7FöÕFV×ÆFW2æÆVæwF‚âbbÃãÆF—b6Æ74æÖSÒ&Æ–'&'’×6V7F–öâ×F—FÆR#ãÆF—cãÇ7ãäÕ’$T4•U3Â÷7ããÆƒ#îh‰y¨NjŠiÛóÂöƒ#ãÂöF—cãÆVÓç¶7W7FöÕFV×ÆFW2æÆVæwF‡ÒKŠ®KŠ®K«®jŠiÛóÂöVÓãÂöF—cãÇ6V7F–öâ6Æ74æÖSÒ'FV×ÆFRÖw&–B7W7FöÒ×FV×ÆFRÖw&–B#ç¶7W7FöÕFV×ÆFW2æÖ‚‡FV×ÆFR’ÓâÆ'F–6ÆR6Æ74æÖSÒ'FV×ÆFRÖ6&B7W7FöÒ×FV×ÆFRÖ6&B"¶W“×·FV×ÆFRæ–GÒ7G–ÆS×·²rÒÖ6&BÖ66VçBs¢FV×ÆFRç÷7FW#òæ66VçBÇÂr6CCV##r×ÓãÆF—b6Æ74æÖSÒ'FV×ÆFR×÷7FW"×&Wf–Wr7W7FöÒ×&Wf–Wr#ãÅ÷7FW$Ö–æ•&Wf–Wr÷7FW#×·FV×ÆFRç÷7FW'Ò6ö×7BóãÂöF—cãÆF—b6Æ74æÖSÒ'FV×ÆFRÖ6&BÖ6÷’#ãÇ7ãîKŠ®K«®jŠiÛóÂ÷7ããÆƒ#ç·FV×ÆFRææÖWÓÂöƒ#ãÇç·FV×ÆFRæFW67&—F–öçÓÂ÷ãÆF—cãÆVÓç¶æWrFFR‡FV×ÆFRæ7&VFVDB’çFôÆö6ÆTFFU7G&–ær‚w¦‚Ô4âr—ÓÂöVÓãÇ7â6Æ74æÖSÒ'FV×ÆFRÖ6&BÖ7F–öç2#ãÆ'WGFöâ6Æ74æÖSÒ'FV×ÆFRÖFVÆWFR"&–ÖÆ&VÃ×¶XŠ™šNjŠiÛòG·FV×ÆFRææÖWÖÒöä6Æ–6³×²‚’ÓâFVÆWFT7W7FöÕFV×ÆFR‡FV×ÆFR—ÓãÅG&6ƒ"6—¦S×³7ÒóãÂö'WGFöããÆ'WGFöâöä6Æ–6³×²‚’ÓâW6T7W7FöÕFV×ÆFR‡FV×ÆFR—ÓîKÛşyJjÚNjŠiÛóÂö'WGFöããÂ÷7ããÂöF—cãÂöF—cãÂö'F–6ÆSâ—ÓÂ÷6V7F–öããÂóçĞ¢ÆF—b6Æ74æÖSÒ&Æ–'&'’×6V7F–öâ×F—FÆR#ãÆF—cãÇ7ãä5U$DTB$T4•U3Â÷7ããÆƒ#î{+î˜jŠiÛóÂöƒ#ãÂöF—cãÆVÓçµDTÕÄDUõ$U4UE2æÆVæwF‡ÒZY~{¹>ièNikjƒÂöVÓãÂöF—cà¢Ç6V7F–öâ6Æ74æÖSÒ'FV×ÆFRÖw&–B#çµDTÕÄDUõ$U4UE2æÖ‚‡FV×ÆFRÂ–æFW‚’Óâ²6öç7B&6¶w&÷VæBÒ$4´u$õTäEõ$U4UE2æf–æB‚†—FVÒ’Óâ—FVÒæ–BÓÓÒFV×ÆFRæ&6¶w&÷VæB“²&WGW&âÆ'F–6ÆR6Æ74æÖSÒ'FV×ÆFRÖ6&B"¶W“×·FV×ÆFRæ–GÒ7G–ÆS×·²rÒÖ6&BÖ66VçBs¢&6¶w&÷VæCòæ66VçBÇÂr6SSV#‚r×ÓãÆF—b6Æ74æÖSÒ'FV×ÆFR×÷7FW"×&Wf–Wr"7G–ÆS×·²&6¶w&÷VæC¢&6¶w&÷VæCòæ&6¶w&÷VæB×ÓãÆF—b6Æ74æÖSÒ'FV×ÆFR×&Wf–Wr×F—FÆR"óãÆF—b6Æ74æÖSÒ'FV×ÆFR×&Wf–Wr×7V'F—FÆR"óãÆF—b6Æ74æÖSÒ'FV×ÆFR×&Wf–WrÖ6öÇVÖç2"7G–ÆS×·²w&–EFV×ÆFT6öÇVÖç3¢FV×ÆFRæ6öÇVÖç2æÖ‚‡&F–ò’ÓâG·&F–÷Ög&’æ¦ö–â‚rr’×Óç·FV×ÆFRæ6öÇVÖç2æÖ‚…òÂ6öÇVÖä–æFW‚’ÓâÆ’¶W“×¶6öÇVÖä–æFW‡ÓãÆ"óãÆ"óãÆ"óãÂö“â—ÓÂöF—cãÂöF—cãÆF—b6Æ74æÖSÒ'FV×ÆFRÖ6&BÖ6÷’#ãÇ7ãîjŠiÛòµ7G&–ær†–æFW‚²’çE7F'Bƒ"Âsr—ÓÂ÷7ããÆƒ#ç·FV×ÆFRææÖWÓÂöƒ#ãÇç·FV×ÆFRæFW67&—F–öçÓÂ÷ãÆF—cãÆVÓç´Ä”õUEõ$U4UE2æf–æB‚†—FVÒ’Óâ—FVÒæ–BÓÓÒFV×ÆFRæÆ–÷WB“òæÆ&VÇÓÂöVÓãÆ'WGFöâöä6Æ–6³×²‚’ÓâW6UFV×ÆFR‡FV×ÆFRæ–B—ÓîKÛşyJjÚNjŠiÛóÂö'WGFöããÂöF—cãÂöF—cãÂö'F–6ÆSâÒ—ÓÂ÷6V7F–öãà¢ÂöÖ–ãâ¢ÆÖ–â6Æ74æÖSÒ&Æ–'&'’×vR&ö¦V7G2×vR#à¢Ç6V7F–öâ6Æ74æÖSÒ&Æ–'&'’Ö†W&òÆ–'&'’Ö†W&ò×&÷r#ãÆF—cãÇ7ãäÄô4Â$4„•dSÂ÷7ããÆƒîh‰y¨NšyºãÂöƒãÇî(	ÎKùŞZÙ(	ŞKÉ®Šhny¹n[Ù>X˜ŞšyºîûÉ¾™ÈŠhKùŞyYKˆKŠ®ikx˜iÊÎi{nûÈÎŠû~KÛşyJ(	ÎXúnZÙK‹®(	Ş8.šyºîi[hÚîKùŞZÙYÊ[Ù>X˜ŞkXşŠxYšKŠŞ8#Â÷ãÂöF—cãÆ'WGFöâ6Æ74æÖSÒ&Æ–'&'’Ö7&VFRÖ'WGFöâ6V6öæF'’Ö7&VFR"öä6Æ–6³×²‚’Óâ6WDf–Wr‚vVF—F÷"r—ÓãÅÇW26—¦S×³wÒóî{º~{ºŞX‰¾KÙÃÂö'WGFöããÂ÷6V7F–öãà¢·6fVE&ö¦V7G2æÆVæwF‚òÇ6V7F–öâ6Æ74æÖSÒ'&ö¦V7BÖw&–B#ç·6fVE&ö¦V7G2æÖ‚‡&V6÷&B’Óâ²6öç7BÆ–÷WBÒÄ”õUEõ$U4UE2æf–æB‚†—FVÒ’Óâ—FVÒæ–BÓÓÒ&V6÷&Bç÷7FW"æÆ–÷WB“²6öç7B—47W'&VçBÒ÷7FW"ç&ö¦V7D–BÓÓÒ&V6÷&Bæ–C²&WGW&âÆ'F–6ÆR6Æ74æÖS×¶&ö¦V7BÖ6&BG¶—47W'&VçBòv7W'&VçB×&ö¦V7Br¢rwÖÒ¶W“×·&V6÷&Bæ–GÓà¢ÆF—b6Æ74æÖSÒ'&ö¦V7B×7vF6‚#ãÅ÷7FW$Ö–æ•&Wf–Wr÷7FW#×·&V6÷&Bç÷7FW'Ò&Wf–Ws×·&V6÷&Bç&Wf–WtÖöFRÓÓÒv7W7FöÒrò&V6÷&Bç&Wf–Wr¢&V6÷&BæWFõ&Wf–WrÇÂ&V6÷&Bç&Wf–WwÒóãÆF—b6Æ74æÖSÒ&6÷fW"Ö7F–öç2#ãÆ'WGFöâöä6Æ–6³×²‚’ÓâG&–vvW$–ÖvUWÆöB‡²¶–æC¢w&ö¦V7E&Wf–WrrÂ&ö¦V7D–C¢&V6÷&Bæ–BÒ—ÓãÄ–ÖvUÇW26—¦S×³'Òóîi»NhÚ.š(NŠxY»ãÂö'WGFöãç·&V6÷&Bç&Wf–WtÖöFRÓÓÒv7W7FöÒrbbÆ'WGFöâ&–ÖÆ&VÃ×¶h.ZHÒG·&V6÷&BææÖWÒˆz®Xªš(NŠx†Òöä6Æ–6³×²‚’Óâ&W6WE&ö¦V7E&Wf–Wr‡&V6÷&B—ÓãÅ&÷FFT67r6—¦S×³'ÒóãÂö'WGFöãçÓÂöF—cãÂöF—cà¢ÆF—b6Æ74æÖSÒ'&ö¦V7BÖ6&BÖ6öçFVçB#ãÆF—b6Æ74æÖSÒ'&ö¦V7BÖÖWF#ãÇ7ãç¶æWrFFR‡&V6÷&Bç6fVDB’çFôÆö6ÆU7G&–ær‚w¦‚Ô4ârÂ²ÖöçFƒ¢vçVÖW&–2rÂF“¢vçVÖW&–2rÂ†÷W#¢s"ÖF–v—BrÂÖ–çWFS¢s"ÖF–v—BrÒ—ÓÂ÷7ãç¶—47W'&VçBbbÆ#î[Ù>X˜ŞšyºãÂö#çÓÂöF—cà¢·&VæÖ–æu&ö¦V7D–BÓÓÒ&V6÷&Bæ–BòÆF—b6Æ74æÖSÒ'&ö¦V7BÖæÖRÖVF—F÷"#ãÆ–çWB&–ÖÆ&VÃÒ.šyºîYŞz{"WFôfö7W2fÇVS×·&ö¦V7DæÖTG&gGÒöä6†ævS×²†WfVçB’Óâ6WE&ö¦V7DæÖTG&gB†WfVçBçF&vWBçfÇVR—Òöä¶W”F÷vã×²†WfVçB’Óâ²–b†WfVçBæ¶W’ÓÓÒtVçFW"r’&VæÖU&ö¦V7B‡&V6÷&B“²–b†WfVçBæ¶W’ÓÓÒtW66Rr’6WE&VæÖ–æu&ö¦V7D–B†çVÆÂ’×ÒóãÆ'WGFöâ&–ÖÆ&VÃÒ.zîŠêNKúîiKYŞz{"öä6Æ–6³×²‚’Óâ&VæÖU&ö¦V7B‡&V6÷&B—ÓãÄ6†V6²6—¦S×³GÒóãÂö'WGFöããÆ'WGFöâ&–ÖÆ&VÃÒ.XùnkhKúîiKYŞz{"öä6Æ–6³×²‚’Óâ6WE&VæÖ–æu&ö¦V7D–B†çVÆÂ—ÓãÅ‚6—¦S×³GÒóãÂö'WGFöããÂöF—câ¢ÆF—b6Æ74æÖSÒ'&ö¦V7B×F—FÆR×&÷r#ãÆƒ"F—FÆS×·&V6÷&BææÖWÓç·&V6÷&BææÖWÓÂöƒ#ãÆ'WGFöâ&–ÖÆ&VÃ×¶KúîiKšyºîYŞz{G·&V6÷&BææÖWÖÒöä6Æ–6³×²‚’Óâ&Vv–å&VæÖU&ö¦V7B‡&V6÷&B—ÓãÅVæ6–Â6—¦S×³7ÒóãÂö'WGFöããÂöF—cçĞ¢Çç¶Æ–÷WCòæÆ&VÂÇÂ~ˆz®Zé®K˜[ˆ>[wÒ+r·&V6÷&Bç÷7FW"æ6öçF–æW'2ç&VGV6R‚‡7VÒÂ6öçF–æW"’Óâ7VÒ²6öçF–æW"æ6ö×öæVçG2æÆVæwF‚Â—ÒKŠ®{¸NK»cÂ÷à¢ÆF—b6Æ74æÖSÒ'&ö¦V7BÖ6&BÖ7F–öç2#ãÆ'WGFöâ6Æ74æÖSÒ'&ö¦V7BÖ÷Vâ"öä6Æ–6³×²‚’Óâ÷Vå6fVE&ö¦V7B‡&V6÷&B—Óîh™>[È{º~{ºŞ{Én‹éÂö'WGFöããÆ'WGFöâ&–ÖÆ&VÃ×¶X‰¾[»¢G·&V6÷&BææÖWÒXšşiÊÆÒF—FÆSÒ.X‰¾[»®XšşiÊÂ"öä6Æ–6³×²‚’ÓâGWÆ–6FU&ö¦V7B‡&V6÷&B—ÓãÄ6÷’6—¦S×³GÒóãÂö'WGFöããÆ'WGFöâ6Æ74æÖSÒ&FævW""&–ÖÆ&VÃ×¶XŠ™šNšyºâG·&V6÷&BææÖWÖÒF—FÆSÒ.XŠ™šNšyºâ"öä6Æ–6³×²‚’ÓâFVÆWFU&ö¦V7B‡&V6÷&B—ÓãÅG&6ƒ"6—¦S×³GÒóãÂö'WGFöããÂöF—cà¢ÂöF—cà¢Âö'F–6ÆSâÒ—ÓÂ÷6V7F–öãâ¢Ç6V7F–öâ6Æ74æÖSÒ&V×G’×&ö¦V7G2#ãÅ6fR6—¦S×³#‡ÒóãÆƒ#î‹ùk*iÈKùŞZÙy¨NšyºãÂöƒ#ãÇî‹ùNY¹îk[~hª^{Én‹éYšûÈÎx+X{¾Xû>Kˆ®Šy.(	ÎKùŞZÙ(	ŞûÈÎKÙÎY8[KÉ®X{®xëYÊ‹ù˜xÎ8#Â÷ãÆ'WGFöâöä6Æ–6³×²‚’Óâ6WDf–Wr‚vVF—F÷"r—Óî‹ùNY¹î{Én‹éYšƒÂö'WGFöããÂ÷6V7F–öãçĞ¢ÂöÖ–ãçĞ¢Æ–çWB&Vc×¶f–ÆT–çWE&VgÒ†–FFVâG—SÒ&f–ÆR"66WCÒ&–ÖvR÷ærÆ–ÖvRö§VrÆ–ÖvR÷vV'"öä6†ævS×²†WfVçB’Óâ²†æFÆT–ÖvW2†WfVçBçF&vWBæf–ÆW2“²WfVçBçF&vWBçfÇVRÒrs²WfVçBçF&vWBæ×VÇF—ÆRÒfÇ6R×Òóà¢·6fT4÷VâbbÆF—b6Æ74æÖSÒ&F–ÆörÖ&6¶G&÷"&öÆSÒ'&W6VçFF–öâ"öäÖ÷W6TF÷vã×²†WfVçB’Óâ²–b†WfVçBçF&vWBÓÓÒWfVçBæ7W'&VçEF&vWB’6WE6fT4÷Vâ†fÇ6R’×ÓãÇ6V7F–öâ6Æ74æÖSÒ&76WBÖF–Æör"&öÆSÒ&F–Æör"&–ÖÖöFÃÒ'G'VR"&–ÖÆ&VÆÆVF'“Ò'6fRÖ2×F—FÆR#ãÆ'WGFöâ6Æ74æÖSÒ&F–ÆörÖ6Æ÷6R"&–ÖÆ&VÃÒ.X[>™zŞXúnZÙK‹¢"öä6Æ–6³×²‚’Óâ6WE6fT4÷Vâ†fÇ6R—ÓãÅ‚6—¦S×³wÒóãÂö'WGFöããÇ7ãä5$TDRdU%4”ôãÂ÷7ããÆƒ"–CÒ'6fRÖ2×F—FÆR#îXúnZÙK‹®ikšyºãÂöƒ#ãÇîikšyºîKÉ®h‰K‹®[Ù>X˜Ş{Én‹éx˜iÊÎûÈÎXéşšyºîKùŞhÈKˆŞXù8#Â÷ãÄf–VÆBÆ&VÃÒ.ikšyºîYŞz{#ãÆ–çWBWFôfö7W2fÇVS×·6fT4æÖWÒöä6†ævS×²†WfVçB’Óâ6WE6fT4æÖR†WfVçBçF&vWBçfÇVR—Òöä¶W”F÷vã×²†WfVçB’ÓâWfVçBæ¶W’ÓÓÒtVçFW"rbb6fU&ö¦V7D2‚—ÒóãÂôf–VÆCãÆF—b6Æ74æÖSÒ&F–ÆörÖ7F–öç2#ãÆ'WGFöâöä6Æ–6³×²‚’Óâ6WE6fT4÷Vâ†fÇ6R—ÓîXùnkhƒÂö'WGFöããÆ'WGFöâ6Æ74æÖSÒ'&–Ö'’ÖF–ÆörÖ7F–öâ"öä6Æ–6³×·6fU&ö¦V7D7ÓãÄ6÷’6—¦S×³GÒóîX‰¾[»®ikšyºãÂö'WGFöããÂöF—cãÂ÷6V7F–öããÂöF—cçĞ¢·FV×ÆFTF–Æöt÷VâbbÆF—b6Æ74æÖSÒ&F–ÆörÖ&6¶G&÷"&öÆSÒ'&W6VçFF–öâ"öäÖ÷W6TF÷vã×²†WfVçB’Óâ²–b†WfVçBçF&vWBÓÓÒWfVçBæ7W'&VçEF&vWB’6WEFV×ÆFTF–Æöt÷Vâ†fÇ6R’×ÓãÇ6V7F–öâ6Æ74æÖSÒ&76WBÖF–ÆörFV×ÆFRÖF–Æör"&öÆSÒ&F–Æör"&–ÖÖöFÃÒ'G'VR"&–ÖÆ&VÆÆVF'“Ò'FV×ÆFRÖF–Æör×F—FÆR#ãÆ'WGFöâ6Æ74æÖSÒ&F–ÆörÖ6Æ÷6R"&–ÖÆ&VÃÒ.X[>™zŞX‰¾[»®jŠiÛò"öä6Æ–6³×²‚’Óâ6WEFV×ÆFTF–Æöt÷Vâ†fÇ6R—ÓãÅ‚6—¦S×³wÒóãÂö'WGFöããÆF—b6Æ74æÖSÒ&F–Æör×FV×ÆFR×&Wf–Wr#ãÅ÷7FW$Ö–æ•&Wf–Wr÷7FW#×·÷7FW'Ò6ö×7BóãÂöF—cãÆF—b6Æ74æÖSÒ&F–Æör×FV×ÆFRÖf÷&Ò#ãÇ7ãä%T”ÄB$T4•SÂ÷7ããÆƒ"–CÒ'FV×ÆFRÖF–Æör×F—FÆR#îX‰¾[»®KŠ®K«®jŠiÛóÂöƒ#ãÇîKùŞZÙ[Ù>X˜Ş[ˆ>[8{¸NK»nY(Îš8îjÎ8.Kº^YîKÛşyJi{nKÉ®ˆz®XªX‰¾[»®xºÎz¸¾šyºîûÈÎKˆŞ[ÛY8ŞjŠiÛşiÊÎ‹ª¾8#Â÷ãÄf–VÆBÆ&VÃÒ.jŠiÛşYŞz{#ãÆ–çWBWFôfö7W2fÇVS×·FV×ÆFTG&gBææÖWÒöä6†ævS×²†WfVçB’Óâ6WEFV×ÆFTG&gB‚†7W'&VçB’Óâ‡²ââæ7W'&VçBÂæÖS¢WfVçBçF&vWBçfÇVRÒ’—ÒóãÂôf–VÆCãÄf–VÆBÆ&VÃÒ.jŠiÛşŠûNiˆâ#ãÇFW‡F&V&÷w3Ò#2"fÇVS×·FV×ÆFTG&gBæFW67&—F–öçÒöä6†ævS×²†WfVçB’Óâ6WEFV×ÆFTG&gB‚†7W'&VçB’Óâ‡²ââæ7W'&VçBÂFW67&—F–öã¢WfVçBçF&vWBçfÇVRÒ’—ÒóãÂôf–VÆCãÆF—b6Æ74æÖSÒ&F–ÆörÖ7F–öç2#ãÆ'WGFöâöä6Æ–6³×²‚’Óâ6WEFV×ÆFTF–Æöt÷Vâ†fÇ6R—ÓîXùnkhƒÂö'WGFöããÆ'WGFöâ6Æ74æÖSÒ'&–Ö'’ÖF–ÆörÖ7F–öâ"öä6Æ–6³×¶7&VFT7W7FöÕFV×ÆFWÓãÄÆ–÷WEFV×ÆFR6—¦S×³GÒóîKùŞZÙX‹jŠiÛşKŠŞ[ø3Âö'WGFöããÂöF—cãÂöF—cãÂ÷6V7F–öããÂöF—cçĞ¢ÂöF—cà¢§Ğ ¦7&VFU&ö÷B†Fö7VÖVçBævWDVÆVÖVçD'”–B‚w&ö÷Br’’ç&VæFW"ƒÄóâ 