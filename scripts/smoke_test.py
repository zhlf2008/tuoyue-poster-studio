from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts"
ARTIFACTS.mkdir(exist_ok=True)
EDITOR_SCREENSHOT = ARTIFACTS / "component-editor.png"
POSTER_SCREENSHOT = ARTIFACTS / "component-poster-preview.png"
EXPORT_FILE = ARTIFACTS / "component-poster-export.png"
SECOND_UPLOAD = ARTIFACTS / "second-participant-photo.png"
LAYOUT_SCREENSHOT = ARTIFACTS / "layout-background-presets.png"
LAYOUT_EXPORT_FILE = ARTIFACTS / "expanded-layout-export.png"
LAYOUT_CONTROLS_SCREENSHOT = ARTIFACTS / "layout-controls.png"
SPACING_CONTROLS_SCREENSHOT = ARTIFACTS / "spacing-controls.png"
TEMPLATE_CENTER_SCREENSHOT = ARTIFACTS / "template-center.png"
PROJECTS_SCREENSHOT = ARTIFACTS / "saved-projects.png"
RED_GOLD_SCREENSHOT = ARTIFACTS / "solemn-red-gold.png"
RED_GOLD_CLASSIC_SCREENSHOT = ARTIFACTS / "solemn-red-gold-classic.png"
RED_GOLD_GUEST_HOVER_SCREENSHOT = ARTIFACTS / "solemn-red-gold-guest-hover.png"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 960}, accept_downloads=True)
    errors = []
    page.on("console", lambda msg: errors.append(f"console:{msg.type}:{msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda exc: errors.append(f"pageerror:{exc}"))

    page.goto("http://127.0.0.1:5173", wait_until="networkidle")
    page.locator(".poster-page").wait_for(state="visible")
    assert page.title() == "橐龠海报工坊"
    assert page.get_by_text("橐龠", exact=True).is_visible()
    assert page.get_by_text("海报工坊", exact=True).is_visible()
    assert page.get_by_text("组件模式", exact=True).count() == 0
    # Primary page navigation stays geometrically fixed while the right side of the header changes.
    nav_x = page.locator(".page-nav").bounding_box()["x"]
    page.get_by_role("button", name="模板中心", exact=True).click()
    assert abs(page.locator(".page-nav").bounding_box()["x"] - nav_x) < .5
    page.get_by_role("button", name="我的项目", exact=False).click()
    assert abs(page.locator(".page-nav").bounding_box()["x"] - nav_x) < .5
    page.get_by_role("button", name="海报编辑", exact=True).click()
    assert abs(page.locator(".page-nav").bounding_box()["x"] - nav_x) < .5
    assert page.get_by_role("button", name="保存", exact=True).evaluate("element => getComputedStyle(element).whiteSpace") == "nowrap"
    assert page.get_by_role("button", name="导出 PNG", exact=False).evaluate("element => getComputedStyle(element).whiteSpace") == "nowrap"
    page.get_by_role("button", name="存为模板", exact=True).click()
    assert page.get_by_role("dialog", name="创建个人模板").is_visible()
    assert page.get_by_label("模板名称").input_value() == "良知班委夜话模板"
    page.get_by_role("button", name="关闭创建模板", exact=True).click()
    assert page.locator(".tree-container").filter(has_text="全局页头").is_visible()
    assert page.locator(".tree-container").filter(has_text="首栏内容").is_visible()
    assert page.locator(".tree-container").filter(has_text="末栏内容").is_visible()
    assert page.locator(".tree-container b").all_inner_texts() == ["全局页头", "首栏内容", "末栏内容", "全局页脚"]
    assert page.locator(".classic-layout > .zone-header").count() == 0
    assert page.locator(".classic-layout .zone-left .component-hero").is_visible()
    assert page.locator(".classic-layout .zone-left .component-info").is_visible()
    assert page.locator(".participant-cell").count() == 20
    demo_text = page.locator(".poster-page").inner_text()
    assert all(old_name not in demo_text for old_name in ["唐 颖", "王浩羽", "张筱鸿", "龚群慧", "尹 忠", "胡煜红", "蒋贤军", "韦 维", "吴 毅", "心 雅"])
    assert any(class_name in demo_text for class_name in ["明德共学一班", "知行研修二班", "星火成长三班", "春晖实践一班", "博雅共创二班", "清和进阶班", "致远领航班", "同心研习班"])

    # Component cards use a three-state override. Typography controls update the poster live.
    assert "no-container" in page.locator(".component-hero").get_attribute("class")
    assert "has-container" in page.locator(".component-info").get_attribute("class")
    assert page.locator(".component-hero").evaluate("element => getComputedStyle(element).textAlign") == "center"
    page.locator(".tree-component").filter(has_text="良知班委夜话").click()
    assert page.locator(".properties-nav button").count() == 2
    assert page.locator(".properties-nav button").all_inner_texts() == ["标题内容", "显示与间距"]
    page.locator(".properties-nav button").filter(has_text="显示与间距").click()
    page.wait_for_timeout(350)
    assert page.locator('[data-property-section="display"]').evaluate("element => element.getBoundingClientRect().top") < page.locator(".right-panel").evaluate("element => element.getBoundingClientRect().bottom")
    page.locator(".properties-nav button").filter(has_text="标题内容").click()
    page.wait_for_timeout(350)
    page.get_by_role("button", name="返回首栏内容", exact=True).click()
    assert page.locator(".properties-title b").inner_text() == "首栏内容"
    assert page.locator(".property-back").count() == 0
    page.locator(".tree-component").filter(has_text="良知班委夜话").click()
    page.get_by_label("副标题字号").fill("18")
    assert page.locator(".align-buttons button span").all_inner_texts() == ["左", "中", "右"]
    assert page.locator(".decoration-options > button").all_inner_texts() == ["实线", "双线", "虚线", "渐隐", "五角星", "菱形", "圆点", "无"]
    page.locator(".decoration-options > button").filter(has_text="虚线").click()
    assert "decoration-dashed" in page.locator(".hero-subtitle").get_attribute("class")
    page.locator(".decoration-options > button").filter(has_text="五角星").click()
    assert "decoration-stars" in page.locator(".hero-subtitle").get_attribute("class")
    assert "★★★" in page.locator(".hero-subtitle i").first.evaluate("element => getComputedStyle(element, '::before').content")
    assert "★★★" in page.locator(".decoration-sample.sample-stars").evaluate("element => getComputedStyle(element, '::after').content")
    page.locator(".decoration-options > button").filter(has_text="菱形").click()
    assert page.locator(".hero-subtitle i").evaluate_all("elements => elements.map(element => getComputedStyle(element).display)") == ["flex", "flex"]
    assert page.locator(".hero-subtitle i").evaluate_all("elements => elements.map(element => getComputedStyle(element).flexDirection)") == ["row", "row-reverse"]
    assert page.locator(".hero-subtitle i").first.evaluate("element => getComputedStyle(element, '::before').height") == "1px"
    assert page.locator(".hero-subtitle i").first.evaluate("element => getComputedStyle(element, '::after').width") == "6px"
    page.locator(".decoration-options > button").filter(has_text="实线").click()
    assert page.locator(".hero-subtitle").evaluate("element => getComputedStyle(element).fontSize") == "18px"
    assert page.locator(".component-hero").evaluate("element => getComputedStyle(element).textAlign") == "center"
    page.locator(".card-mode-control").get_by_role("button", name="显示", exact=True).click()
    assert "has-container" in page.locator(".component-hero").get_attribute("class")
    page.locator(".card-mode-control").get_by_role("button", name="隐藏", exact=True).click()
    assert "no-container" in page.locator(".component-hero").get_attribute("class")
    page.get_by_label("副标题字号").fill("12")
    page.get_by_role("button", name="居中", exact=True).click()
    page.locator(".tree-component").filter(has_text="夜话回顾").click()
    page.get_by_label("组件标题").fill("   ")
    assert page.locator(".component-info .poster-pill").count() == 0
    assert page.locator(".component-info ul").evaluate("element => getComputedStyle(element).marginTop") == "0px"
    page.get_by_label("组件标题").fill("夜话回顾")
    page.locator(".card-mode-control").get_by_role("button", name="隐藏", exact=True).click()
    assert "no-container" in page.locator(".component-info").get_attribute("class")
    page.locator(".card-mode-control").get_by_role("button", name="显示", exact=True).click()
    assert "has-container" in page.locator(".component-info").get_attribute("class")

    # Unequal and multi-column layouts expand the poster instead of compressing columns.
    page.get_by_role("button", name="布局", exact=True).click()
    spacing_sliders = page.locator(".spacing-control input[type='range']")
    spacing_sliders.nth(0).fill("80")
    spacing_sliders.nth(1).fill("100")
    spacing_offsets = page.locator(".poster-page").evaluate("element => { const style = getComputedStyle(element); return [style.paddingTop, style.paddingBottom] }")
    assert spacing_offsets == ["80px", "100px"]
    spacing_sliders.nth(0).fill("38")
    spacing_sliders.nth(1).fill("34")
    assert "grouped-mode" in page.locator(".zone-left").get_attribute("class")
    assert "no-container" in page.locator(".zone-left .component-guestGrid").first.get_attribute("class")
    page.locator(".container-mode-control").get_by_role("button", name="独立卡片", exact=True).click()
    assert "cards-mode" in page.locator(".zone-left").get_attribute("class")
    assert "has-container" in page.locator(".zone-left .component-guestGrid").first.get_attribute("class")
    page.locator(".container-mode-control").get_by_role("button", name="跟随布局", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="窄左宽右").click()
    page.wait_for_function("Math.abs(Number(document.querySelector('.participant-grid').dataset.gridWidth) - document.querySelector('.participant-grid').offsetWidth) <= 1")
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 1082
    assert page.locator(".adaptive-content-grid > .poster-container").evaluate_all("elements => elements.map(element => element.offsetWidth)") == [392, 588]
    height_before_ratio_change = page.locator(".poster-page").evaluate("element => element.offsetHeight")
    columns_before_ratio_change = int(page.locator(".participant-grid").get_attribute("data-columns"))
    page.locator(".ratio-presets > button").filter(has_text="1:5").click()
    page.wait_for_function("Math.abs(Number(document.querySelector('.participant-grid').dataset.gridWidth) - document.querySelector('.participant-grid').offsetWidth) <= 1")
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 2454
    assert page.locator(".adaptive-content-grid > .poster-container").evaluate_all("elements => elements.map(element => element.offsetWidth)") == [392, 1960]
    assert page.locator(".poster-page").evaluate("element => element.offsetHeight") == height_before_ratio_change
    assert int(page.locator(".participant-grid").get_attribute("data-columns")) > columns_before_ratio_change
    dynamic_columns = []
    dynamic_component_widths = []
    for ratio in ["1:1", "1:2", "1:3", "1:5"]:
        page.get_by_role("button", name=ratio, exact=True).click()
        page.wait_for_function("Math.abs(Number(document.querySelector('.participant-grid').dataset.gridWidth) - document.querySelector('.participant-grid').offsetWidth) <= 1")
        dynamic_columns.append(int(page.locator(".participant-grid").get_attribute("data-columns")))
        container_width = page.locator(".zone-right").evaluate("element => element.offsetWidth")
        component_width = page.locator(".component-mosaic").evaluate("element => element.offsetWidth")
        grid_width = page.locator(".participant-grid").evaluate("element => element.offsetWidth")
        assert component_width == container_width
        assert grid_width == component_width - 42
        assert page.locator(".component-mosaic").evaluate("element => element.offsetHeight") == page.locator(".zone-right").evaluate("element => element.offsetHeight")
        dynamic_component_widths.append(component_width)
    assert all(current < following for current, following in zip(dynamic_columns, dynamic_columns[1:]))
    assert dynamic_component_widths == [392, 784, 1176, 1960]
    page.screenshot(path=str(LAYOUT_CONTROLS_SCREENSHOT), full_page=True)
    page.locator(".spacing-control").scroll_into_view_if_needed()
    page.screenshot(path=str(SPACING_CONTROLS_SCREENSHOT), full_page=True)

    page.locator(".layout-presets > button").filter(has_text="重点三栏").click()
    grid = page.locator(".adaptive-content-grid")
    assert grid.is_visible()
    assert grid.locator(":scope > .poster-container").count() == 3
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 1496
    assert grid.locator(":scope > .poster-container").evaluate_all("elements => elements.map(element => element.offsetWidth)") == [392, 588, 392]
    global_header = page.locator(".flexible-layout > .zone-header")
    assert global_header.count() == 0
    assert grid.locator(":scope > .poster-container").first.locator(".component-hero").is_visible()
    assert grid.locator(":scope > .poster-container").first.locator(".component-info").is_visible()
    assert grid.locator(":scope > .poster-container").nth(1).locator(".component-hero, .component-info").count() == 0
    assert grid.locator(":scope > .poster-container").nth(2).locator(".component-hero, .component-info").count() == 0
    assert grid.locator(":scope > .poster-container").first.evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert "no-container" in grid.locator(":scope > .poster-container").first.locator(".component-hero").get_attribute("class")
    assert "has-container" in grid.locator(":scope > .poster-container").first.locator(".component-info").get_attribute("class")
    assert grid.locator(".poster-component").count() == 6
    assert page.locator(".flexible-layout .poster-component").count() == 7
    column_boxes = [grid.locator(":scope > .poster-container").nth(index).bounding_box() for index in range(3)]
    assert max(box["y"] for box in column_boxes) - min(box["y"] for box in column_boxes) < 1
    assert column_boxes[0]["x"] < column_boxes[1]["x"] < column_boxes[2]["x"]

    # The empty global header remains an add target and appears across the full poster when used.
    page.get_by_role("button", name="组件", exact=True).click()
    add_target = page.locator(".left-content select")
    assert "全局页头" in add_target.locator("option").all_inner_texts()
    assert "首栏内容" in add_target.locator("option").all_inner_texts()
    add_target.select_option("header")
    page.locator(".component-library > button").filter(has_text="主题标题").click()
    assert global_header.locator(".component-hero").count() == 1
    assert global_header.evaluate("element => element.offsetWidth") == 1416
    assert grid.locator(":scope > .poster-container").first.locator(".component-hero").count() == 1
    page.locator(".quick-actions button.danger").click()
    assert global_header.count() == 0
    assert grid.locator(".component-hero").count() == 1
    page.get_by_role("button", name="布局", exact=True).click()

    # A horizontal component group nests real editable components with independent ratios.
    page.get_by_role("button", name="组件", exact=True).click()
    page.locator(".left-content select").select_option("left")
    page.locator(".component-library > button").filter(has_text="横向组件组").click()
    row_group = page.locator(".component-rowGroup")
    assert row_group.is_visible()
    assert row_group.locator(".row-component-slot").count() == 2
    page.get_by_label("位置 1 宽度比例").fill("1")
    page.get_by_label("位置 2 宽度比例").fill("2")
    slot_widths = row_group.locator(".row-component-slot").evaluate_all("elements => elements.map(element => element.offsetWidth)")
    assert slot_widths[1] > slot_widths[0] * 1.8
    page.locator(".row-count-control").get_by_role("button", name="3 个", exact=True).click()
    assert row_group.locator(".row-component-slot").count() == 3
    assert row_group.locator(".row-empty-slot").count() == 1
    page.get_by_label("位置 3 组件类型").select_option("guestGrid")
    assert row_group.locator(".row-component-slot > .poster-component").count() == 3
    assert page.locator(".property-back").get_attribute("aria-label") == "返回横向组件组"
    page.locator(".property-back").click()
    assert page.locator(".properties-title b").inner_text() == "横向组件组"
    page.get_by_role("button", name="结构", exact=True).click()
    page.locator(".tree-component").filter(has_text="横向组件组").click()
    assert page.locator(".tree-nested-components .tree-component").count() >= 3
    page.get_by_role("button", name="布局", exact=True).click()

    page.locator(".layout-presets > button").filter(has_text="重点四栏").click()
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 1910
    assert page.locator(".adaptive-content-grid > .poster-container").evaluate_all("elements => elements.map(element => element.offsetWidth)") == [392, 588, 392, 392]
    page.locator(".layout-presets > button").filter(has_text="等宽五栏").click()
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 2128
    assert page.locator(".adaptive-content-grid > .poster-container").count() == 5
    assert page.locator(".adaptive-content-grid > .poster-container").evaluate_all("elements => elements.map(element => element.offsetWidth)") == [392, 392, 392, 392, 392]
    page.get_by_role("button", name="组件", exact=True).click()
    assert "中栏内容 C" in page.get_by_label("添加到").locator("option").all_inner_texts()
    page.get_by_role("button", name="结构", exact=True).click()
    assert page.locator(".tree-container b").all_inner_texts() == ["全局页头", "首栏内容", "中栏内容 A", "中栏内容 B", "中栏内容 C", "末栏内容", "全局页脚"]
    page.get_by_role("button", name="布局", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="重点五栏").click()
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 2324
    assert page.locator(".adaptive-content-grid > .poster-container").evaluate_all("elements => elements.map(element => element.offsetWidth)") == [392, 392, 588, 392, 392]
    page.locator(".layout-presets > button").filter(has_text="重点三栏").click()
    page.get_by_role("button", name="背景", exact=True).click()
    assert page.locator(".background-presets > button").count() == 9
    for index in range(9):
        page.locator(".background-presets > button").nth(index).click()
        contrast = page.locator(".poster-page").evaluate("""element => {
            const style = getComputedStyle(element)
            const colors = [style.getPropertyValue('--poster-bg').trim(), style.getPropertyValue('--accent').trim(), style.getPropertyValue('--poster-text').trim(), style.getPropertyValue('--poster-on-background').trim()]
            const luminance = hex => {
                const channels = hex.match(/[a-f\\d]{2}/gi).map(value => parseInt(value, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4)
                return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2]
            }
            const ratio = (first, second) => {
                const a = luminance(first), b = luminance(second)
                return (Math.max(a, b) + .05) / (Math.min(a, b) + .05)
            }
            return { accent: ratio(colors[0], colors[1]), text: ratio(colors[0], colors[2]), onBackground: ratio(colors[0], colors[3]), surfaceText: ratio('#fffdf7', colors[2]), pill: ratio('#fffaf2', colors[1]) }
        }""")
        assert contrast["accent"] >= 4.5, contrast
        assert contrast["onBackground"] >= 4.5, contrast
        if "theme-solemnRedGold" in page.locator(".poster-page").get_attribute("class"):
            assert contrast["surfaceText"] >= 4.5, contrast
        else:
            assert contrast["text"] >= 4.5, contrast
            assert contrast["pill"] >= 4.5, contrast
    page.locator(".background-presets > button").filter(has_text="新春喜庆").click()
    assert "linear-gradient" in page.locator(".poster-page").evaluate("element => getComputedStyle(element).backgroundImage")
    page.locator(".background-presets > button").filter(has_text="激励表彰").click()
    page.locator(".background-presets > button").filter(has_text="大红鎏金").click()
    assert "theme-solemnRedGold" in page.locator(".poster-page").get_attribute("class")
    assert page.locator(".poster-page").evaluate("element => getComputedStyle(element).backgroundColor") == "rgb(143, 17, 24)"
    assert page.locator(".poster-page").evaluate("element => getComputedStyle(element).backgroundImage") == "none"
    assert page.locator(".poster-page").evaluate("element => getComputedStyle(element, '::after').display") == "none"
    assert page.locator(".component-hero h1").evaluate("element => getComputedStyle(element).webkitTextFillColor") == "rgba(0, 0, 0, 0)"
    red_gold_card_colors = set(page.locator(".poster-component.has-container:not(.component-hero):not(.component-brand)").evaluate_all("elements => elements.map(element => getComputedStyle(element).backgroundColor)"))
    assert red_gold_card_colors == {"rgb(247, 239, 217)"}, red_gold_card_colors
    # Global title and footer signature must respect their own card mode instead of receiving unconditional red surfaces.
    page.get_by_role("button", name="组件", exact=True).click()
    page.get_by_label("添加到").select_option("header")
    page.locator(".component-library > button").filter(has_text="主题标题").click()
    global_red_title = page.locator(".zone-header .component-hero")
    assert "no-container" in global_red_title.get_attribute("class")
    assert global_red_title.evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert global_red_title.evaluate("element => getComputedStyle(element).paddingTop") == "0px"
    page.locator(".card-mode-control").get_by_role("button", name="显示", exact=True).click()
    assert global_red_title.evaluate("element => getComputedStyle(element).backgroundColor") == "rgb(113, 11, 17)"
    page.locator(".card-mode-control").get_by_role("button", name="隐藏", exact=True).click()
    assert global_red_title.evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert page.locator(".component-brand.no-container").evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    first_guest_group = page.locator(".component-guestGrid").filter(has_text="特邀分享 · 回应嘉宾").first
    assert first_guest_group.locator(".poster-guest-card").count() >= 6
    fifth_guest = first_guest_group.locator(".poster-guest-card").nth(4)
    page.locator(".component-info").first.hover()
    standard_hover_border = page.locator(".component-info").first.evaluate("element => getComputedStyle(element, '::after').borderTopColor")
    fifth_guest.hover()
    assert first_guest_group.evaluate("element => getComputedStyle(element, '::after').display") == "block"
    assert first_guest_group.evaluate("element => getComputedStyle(element, '::after').borderTopStyle") == "dashed"
    assert first_guest_group.evaluate("element => getComputedStyle(element, '::after').borderTopColor") == standard_hover_border
    fifth_guest.click()
    page.mouse.move(1, 1)
    assert first_guest_group.evaluate("element => getComputedStyle(element, '::after').borderTopColor") == "rgba(0, 0, 0, 0)"
    assert first_guest_group.evaluate("element => getComputedStyle(element).borderTopWidth") == "0px"
    assert first_guest_group.evaluate("element => getComputedStyle(element).boxShadow") == "none"
    assert fifth_guest.evaluate("element => getComputedStyle(element).outlineStyle") == "solid"
    assert fifth_guest.evaluate("element => getComputedStyle(element).outlineColor") == "rgb(242, 199, 102)"
    assert fifth_guest.evaluate("element => getComputedStyle(element).boxShadow") == "none"
    outer_guest_row = page.locator(".component-rowGroup:has(.component-guestGrid)")
    assert outer_guest_row.evaluate("element => getComputedStyle(element, '::after').display") == "block"
    assert outer_guest_row.evaluate("element => getComputedStyle(element, '::after').borderTopColor") == "rgba(0, 0, 0, 0)"
    first_guest_group.locator(".poster-pill").click()
    assert "selected-component" in first_guest_group.get_attribute("class")
    assert first_guest_group.evaluate("element => getComputedStyle(element, '::after').borderTopStyle") == "dashed"
    assert first_guest_group.evaluate("element => getComputedStyle(element, '::after').borderTopColor") == "rgb(242, 199, 102)"
    page.locator(".poster-page").screenshot(path=str(RED_GOLD_GUEST_HOVER_SCREENSHOT))
    page.locator(".poster-page").screenshot(path=str(RED_GOLD_SCREENSHOT))
    page.get_by_role("button", name="布局", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="经典双栏").click()
    assert set(page.locator(".classic-content-grid .poster-container.grouped-mode").evaluate_all("elements => elements.map(element => getComputedStyle(element).backgroundColor)")) == {"rgb(247, 239, 217)"}
    assert page.locator(".classic-layout > .zone-header.grouped-mode").evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert page.locator(".classic-layout > .zone-header .component-hero.no-container").evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert page.locator(".zone-footer.grouped-mode").evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert page.locator(".classic-content-grid .component-hero.no-container").evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    assert page.locator(".classic-content-grid .component-hero.no-container h1").evaluate("element => getComputedStyle(element).webkitTextFillColor") == "rgb(138, 21, 25)"
    page.locator(".poster-page").screenshot(path=str(RED_GOLD_CLASSIC_SCREENSHOT))
    page.get_by_role("button", name="结构", exact=True).click()
    page.locator(".tree-group").first.locator(".tree-component").click()
    page.locator(".quick-actions button.danger").click()
    assert page.locator(".classic-layout > .zone-header").count() == 0
    page.get_by_role("button", name="布局", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="重点三栏").click()
    page.get_by_role("button", name="背景", exact=True).click()
    page.locator(".background-presets > button").filter(has_text="晴空万里").click()
    assert page.locator(".poster-page").evaluate("element => getComputedStyle(element).backgroundImage.includes('radial-gradient')")
    page.screenshot(path=str(LAYOUT_SCREENSHOT), full_page=True)

    # The expanded DOM width must be preserved by PNG export.
    page.locator(".export-control select").select_option("2")
    with page.expect_download(timeout=30000) as layout_download_info:
        page.get_by_role("button", name="导出 PNG", exact=False).click()
    layout_download_info.value.save_as(LAYOUT_EXPORT_FILE)
    png_header = LAYOUT_EXPORT_FILE.read_bytes()[:24]
    assert int.from_bytes(png_header[16:20], "big") == 1496 * 2

    # Return to the reference-like classic composition for component editing checks.
    page.get_by_role("button", name="布局", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="经典双栏").click()
    assert page.locator(".classic-layout").is_visible()
    assert page.locator(".poster-page").evaluate("element => element.offsetWidth") == 820
    assert page.locator(".classic-layout > .zone-header").count() == 0
    assert page.locator(".classic-layout .zone-left .component-hero").is_visible()
    assert page.locator(".classic-layout .zone-left .component-info").is_visible()
    page.get_by_role("button", name="结构", exact=True).click()

    # Footer typography is editable.
    page.locator(".tree-component").filter(has_text="义起发光").click()
    page.get_by_label("署名字号").fill("34")
    page.get_by_label("附加说明").fill("明德共学社")
    page.get_by_label("说明字号").fill("16")
    assert page.locator(".poster-brand").evaluate("element => getComputedStyle(element).fontSize") == "34px"
    assert page.locator(".poster-brand-note").evaluate("element => getComputedStyle(element).fontSize") == "16px"

    # Select the first guest group through the structure tree.
    page.locator(".tree-component").filter(has_text="特邀分享").click()
    assert page.get_by_text("嘉宾组设置", exact=True).is_visible()
    before = page.locator(".poster-guest-card").count()
    page.get_by_role("button", name="增加嘉宾", exact=True).click()
    assert page.locator(".poster-guest-card").count() == before + 1
    assert page.locator(".property-back").get_attribute("aria-label") == "返回嘉宾组"
    page.locator(".property-back").click()
    assert page.locator(".properties-title b").inner_text() == "嘉宾组"
    page.locator(".guest-editor-list button").last.click()

    # Edit the newly-created content item through form fields.
    name_input = page.get_by_label("嘉宾姓名")
    name_input.fill("测试嘉宾")
    page.get_by_label("身份说明").fill("结构化组件测试")
    assert page.locator(".poster-guest-card").filter(has_text="测试嘉宾").is_visible()

    # Replace the photo without changing layout.
    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="替换照片", exact=True).click()
    chooser_info.value.set_files(str(ROOT / "public" / "reference-poster.png"))
    page.wait_for_function("document.querySelector('.toast')?.textContent.includes('照片已优化并替换')", timeout=10000)
    page.get_by_role("button", name="删除", exact=True).click()

    # Batch upload multiple participant photos. Every cell must remain 16:9.
    page.get_by_role("button", name="结构", exact=True).click()
    page.locator(".tree-component").filter(has_text="参会人员").click()
    page.get_by_label("分区标题").fill(" ")
    assert page.locator(".component-mosaic .poster-pill").count() == 0
    page.get_by_label("分区标题").fill("参会人员")
    page.locator("label.field").filter(has_text="照片间距").locator("input").fill("12")
    assert page.locator(".participant-grid").evaluate("element => getComputedStyle(element).gap") == "12px"
    assert page.locator(".participant-grid").evaluate("element => getComputedStyle(element).backgroundColor") == "rgba(0, 0, 0, 0)"
    page.locator(".poster-page").screenshot(path=str(SECOND_UPLOAD))
    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="批量上传照片", exact=True).click()
    chooser_info.value.set_files([str(ROOT / "public" / "reference-poster.png"), str(SECOND_UPLOAD)])
    page.wait_for_function("document.querySelector('.toast')?.textContent.includes('已导入 2 张')", timeout=15000)
    assert page.locator(".participant-cell img").count() == 2
    assert page.locator(".mosaic-photo-item").count() == 2
    photo_order_before = page.locator(".mosaic-photo-item img").evaluate_all("elements => elements.map(element => element.src)")
    page.get_by_role("button", name="第 2 张照片前移", exact=True).click()
    photo_order_after = page.locator(".mosaic-photo-item img").evaluate_all("elements => elements.map(element => element.src)")
    assert photo_order_after == list(reversed(photo_order_before))
    page.get_by_role("button", name="移除第 1 张照片", exact=True).click()
    assert page.locator(".mosaic-photo-item").count() == 1
    assert page.locator(".participant-cell img").count() == 1
    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="批量上传照片", exact=True).click()
    chooser_info.value.set_files([str(ROOT / "public" / "reference-poster.png"), str(SECOND_UPLOAD)])
    page.wait_for_function("document.querySelector('.toast')?.textContent.includes('已导入 2 张')", timeout=15000)
    assert page.locator(".participant-cell img").count() == 2
    assert page.locator(".participant-grid").get_attribute("data-columns") == "1"
    cell_box = page.locator(".participant-cell").first.bounding_box()
    second_box = page.locator(".participant-cell").nth(1).bounding_box()
    assert abs((cell_box["width"] / cell_box["height"]) - (16 / 9)) < 0.04
    assert abs(cell_box["x"] - second_box["x"]) < 1
    assert second_box["y"] > cell_box["y"]
    page.get_by_label("照片位数量").fill("10")
    page.get_by_role("button", name="布局", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="等宽双栏").click()
    uploaded_grid_widths = []
    ten_photo_columns = []
    for ratio in ["1:1", "1:2", "1:5"]:
        page.get_by_role("button", name=ratio, exact=True).click()
        page.wait_for_function("Math.abs(Number(document.querySelector('.participant-grid').dataset.gridWidth) - document.querySelector('.participant-grid').offsetWidth) <= 1")
        uploaded_grid_widths.append(page.locator(".participant-grid").evaluate("element => element.offsetWidth"))
        ten_photo_columns.append(int(page.locator(".participant-grid").get_attribute("data-columns")))
        image_box = page.locator(".participant-cell img").first.bounding_box()
        live_cell_box = page.locator(".participant-cell").first.bounding_box()
        assert abs(image_box["width"] - live_cell_box["width"]) < 1
        assert abs(image_box["height"] - live_cell_box["height"]) < 1
        grid_height = page.locator(".participant-grid").evaluate("element => element.offsetHeight")
        row_boxes = page.evaluate("""() => {
            const grid = document.querySelector('.participant-grid')
            return [...new Map([...grid.querySelectorAll('.participant-cell')].map(element => {
                const top = element.offsetTop - grid.offsetTop
                return [top, { top, bottom: top + element.offsetHeight }]
            })).values()]
        }""")
        top_gap = row_boxes[0]["top"]
        bottom_gap = grid_height - row_boxes[-1]["bottom"]
        row_gaps = [row_boxes[index + 1]["top"] - row_boxes[index]["bottom"] for index in range(len(row_boxes) - 1)]
        assert abs(top_gap) < 1
        assert bottom_gap >= -1
        assert all(abs(row_gap - 12) <= 1 for row_gap in row_gaps), row_gaps
    assert uploaded_grid_widths == sorted(uploaded_grid_widths)
    assert len(set(uploaded_grid_widths)) == 3
    assert max(ten_photo_columns) > min(ten_photo_columns)
    page.locator(".layout-presets > button").filter(has_text="经典双栏").click()
    page.get_by_role("button", name="结构", exact=True).click()
    page.locator(".tree-component").filter(has_text="参会人员").click()
    page.get_by_role("button", name="清空并恢复占位", exact=True).click()
    assert page.locator(".participant-cell").count() == 20
    assert page.locator(".participant-grid").get_attribute("data-columns") == "2"

    # Add long content to the left container and verify that poster height grows.
    page.get_by_role("button", name="组件", exact=True).click()
    page.get_by_label("添加到").select_option("left")
    page.locator(".component-library > button").filter(has_text="多行文本").click()
    assert page.get_by_role("heading", name="多行文本", exact=True).is_visible()
    page.get_by_label("标题").fill("  ")
    assert page.locator(".component-textBlock.selected-component .poster-pill").count() == 0
    page.get_by_label("标题").fill("完整会议纪要")
    long_body = "\n".join([f"第 {index + 1} 条会议内容：组件会推动海报自动向下延长。" for index in range(36)])
    page.locator(".properties-body textarea").fill(long_body)
    page.get_by_label("正文字号").fill("14")
    page.get_by_label("行距").fill("2")
    assert page.locator(".align-buttons button span").all_inner_texts() == ["左", "中", "右"]
    page.get_by_role("button", name="右对齐", exact=True).click()
    assert page.locator(".poster-body-text").last.evaluate("element => getComputedStyle(element).textAlign") == "right"
    page.get_by_role("button", name="左对齐", exact=True).click()
    assert page.locator(".poster-body-text").last.evaluate("element => getComputedStyle(element).fontSize") == "14px"
    page.wait_for_function("document.querySelector('.poster-page').offsetHeight > 1220")
    rendered_height = page.locator(".poster-page").evaluate("element => element.offsetHeight")
    assert rendered_height > 1220

    # Save structured JSON and verify the schema.
    page.get_by_role("button", name="保存", exact=True).click()
    page.wait_for_function("document.querySelector('.toast')?.textContent.includes('项目已保存')")
    snapshot = page.evaluate("JSON.parse(localStorage.getItem('meeting-poster-components-v2'))")
    assert snapshot["version"] == 3
    assert len(snapshot["containers"]) == 7
    assert snapshot["layout"] == "classic"
    assert snapshot["containerMode"] == "preset"
    assert snapshot["layoutRatios"]["dualNarrowWide"] == [1, 5]
    assert snapshot["paddingTop"] == 38
    assert snapshot["paddingBottom"] == 34
    assert snapshot["backgroundStyle"] == "clearSky"
    assert next(component for component in snapshot["containers"][2]["components"] if component["type"] == "mosaic")["photoGap"] == 12
    assert any(component["type"] == "textBlock" for component in snapshot["containers"][1]["components"])
    saved_row_group = next(component for component in snapshot["containers"][1]["components"] if component["type"] == "rowGroup")
    assert saved_row_group["columns"] == 3
    assert saved_row_group["ratios"] == [1, 2, 1]
    assert len([child for child in saved_row_group["children"][:3] if child]) == 3

    # Export a real 2x PNG and retain screenshots for visual review.
    page.locator(".poster-page").evaluate("element => element.classList.add('is-exporting')")
    assert page.locator(".poster-page").evaluate("element => getComputedStyle(element, '::after').display") == "none"
    page.locator(".poster-page").evaluate("element => element.classList.remove('is-exporting')")
    page.locator(".export-control select").select_option("2")
    with page.expect_download(timeout=30000) as download_info:
        page.get_by_role("button", name="导出 PNG", exact=False).click()
    download_info.value.save_as(EXPORT_FILE)
    page.wait_for_function("document.querySelector('.toast')?.textContent.includes('已导出')", timeout=30000)

    page.screenshot(path=str(EDITOR_SCREENSHOT), full_page=True)
    page.locator(".poster-page").screenshot(path=str(POSTER_SCREENSHOT))

    # Canvas inspection can zoom beyond 100%, up to a stable 200% ceiling.
    for _ in range(30):
        page.get_by_role("button", name="放大画布", exact=True).click()
    assert page.locator(".zoom-control span").inner_text() == "200%"
    page.get_by_role("button", name="放大画布", exact=True).click()
    assert page.locator(".zoom-control span").inner_text() == "200%"

    # Saved projects support automatic previews, renaming, custom covers, overwrite/save-as, and templates.
    projects = page.evaluate("JSON.parse(localStorage.getItem('meeting-poster-projects-v1'))")
    assert len(projects) == 1
    assert projects[0]["name"] == "良知班委夜话"
    assert projects[0]["autoPreview"].startswith("data:image/webp")
    page.locator(".page-nav button").filter(has_text="我的项目").click()
    assert page.locator(".project-card").count() == 1
    assert page.locator(".project-card .saved-cover-image").count() == 1
    page.get_by_role("button", name="修改项目名称", exact=False).click()
    page.get_by_label("项目名称").fill("良知夜话测试项目")
    page.get_by_role("button", name="确认修改名称", exact=True).click()
    assert page.locator(".project-card h2").inner_text() == "良知夜话测试项目"
    with page.expect_file_chooser() as chooser_info:
        page.get_by_role("button", name="更换预览图", exact=True).click()
    chooser_info.value.set_files(RED_GOLD_SCREENSHOT)
    page.wait_for_function("JSON.parse(localStorage.getItem('meeting-poster-projects-v1'))[0].preview.length > 100")
    assert page.locator(".project-card .saved-cover-image").count() == 1
    page.screenshot(path=str(PROJECTS_SCREENSHOT), full_page=True)
    page.get_by_role("button", name="打开继续编辑", exact=True).click()
    assert page.locator(".workspace").is_visible()
    page.get_by_role("button", name="另存为", exact=True).click()
    page.get_by_label("新项目名称").fill("良知夜话版本 B")
    page.get_by_role("button", name="创建新项目", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('meeting-poster-projects-v1')).length === 2")
    page.locator(".page-nav button").filter(has_text="模板中心").click()
    assert page.locator(".template-card").count() == 5
    page.get_by_role("button", name="创建当前海报模板", exact=True).click()
    page.get_by_label("模板名称").fill("我的会议纪实模板")
    page.get_by_role("button", name="保存到模板中心", exact=True).click()
    assert page.locator(".custom-template-card").count() == 1
    assert page.evaluate("JSON.parse(localStorage.getItem('meeting-poster-custom-templates-v1')).length") == 1
    page.screenshot(path=str(TEMPLATE_CENTER_SCREENSHOT), full_page=True)
    forum_template = page.locator(".template-card").filter(has_text="三栏论坛全景")
    forum_template.get_by_role("button", name="使用此模板", exact=True).click()
    assert page.locator(".adaptive-content-grid > .poster-container").count() == 3
    page.get_by_role("button", name="保存", exact=True).click()
    page.wait_for_function("JSON.parse(localStorage.getItem('meeting-poster-projects-v1')).length === 3")
    page.locator(".page-nav button").filter(has_text="我的项目").click()
    assert page.locator(".project-card").count() == 3
    page.on("dialog", lambda dialog: dialog.accept())
    page.get_by_role("button", name="删除项目", exact=False).first.click()
    assert page.locator(".project-card").count() == 2
    browser.close()

if errors:
    raise AssertionError("Browser errors:\n" + "\n".join(errors))

print(f"COMPONENT_SMOKE_OK screenshot={EDITOR_SCREENSHOT}")
