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
    assert page.title() == "æ©é¾ æµ·æŠ¥å·¥åŠ"
    assert page.get_by_text("æ©é¾ ", exact=True).is_visible()
    assert page.get_by_text("æµ·æŠ¥å·¥åŠ", exact=True).is_visible()
    assert page.get_by_text("ç»„ä»¶æ¨¡å¼", exact=True).count() == 0
    # Primary page navigation stays geometrically fixed while the right side of the header changes.
    nav_x = page.locator(".page-nav").bounding_box()["x"]
    page.get_by_role("button", name="æ¨¡æ¿ä¸­å¿ƒ", exact=True).click()
    assert abs(page.locator(".page-nav").bounding_box()["x"] - nav_x) < .5
    page.get_by_role("button", name="æˆ‘çš„é¡¹ç›®", exact=False).click()
    assert abs(page.locator(".page-nav").bounding_box()["x"] - nav_x) < .5
    page.get_by_role("button", name="æµ·æŠ¥ç¼–è¾‘", exact=True).click()
    assert abs(page.locator(".page-nav").bounding_box()["x"] - nav_x) < .5
    assert page.get_by_role("button", name="ä¿å­˜", exact=True).evaluate("element => getComputedStyle(element).whiteSpace") == "nowrap"
    assert page.get_by_role("button", name="å¯¼å‡º PNG", exact=False).evaluate("element => getComputedStyle(element).whiteSpace") == "nowrap"
    page.get_by_role("button", name="å­˜ä¸ºæ¨¡æ¿", exact=True).click()
    assert page.get_by_role("dialog", name="åˆ›å»ºä¸ªäººæ¨¡æ¿").is_visible()
    assert page.get_by_label("æ¨¡æ¿åç§°").input_value() == "è‰¯çŸ¥ç­å§”å¤œè¯æ¨¡æ¿"
    page.get_by_role("button", name="å…³é—­åˆ›å»ºæ¨¡æ¿", exact=True).click()
    assert page.locator(".tree-container").filter(has_text="å…¨å±€é¡µå¤´").is_visible()
    assert page.locator(".tree-container").filter(has_text="é¦–æ å†…å®¹").is_visible()
    assert page.locator(".tree-container").filter(has_text="æœ«æ å†…å®¹").is_visible()
    assert page.locator(".tree-container b").all_inner_texts() == ["å…¨å±€é¡µå¤´", "é¦–æ å†…å®¹", "æœ«æ å†…å®¹", "å…¨å±€é¡µè„š"]
    assert page.locator(".classic-layout > .zone-header").count() == 0
    assert page.locator(".classic-layout .zone-left .component-hero").is_visible()
    assert page.locator(".classic-layout .zone-left .component-info").is_visible()
    assert page.locator(".participant-cell").count() == 20
    demo_text = page.locator(".poster-page").inner_text()
    assert all(old_name not in demo_text for old_name in ["å” é¢–", "çŽ‹æµ©ç¾½", "å¼ ç­±é¸¿", "é¾šç¾¤æ…§", "å°¹ å¿ ", "èƒ¡ç…œçº¢", "è’‹è´¤å†›", "éŸ¦ ç»´", "å´ æ¯…", "å¿ƒ é›…"])
    assert any(class_name in demo_text for class_name in ["æ˜Žå¾·å…±å­¦ä¸€ç­", "çŸ¥è¡Œç ”ä¿®äºŒç­", "æ˜Ÿç«æˆé•¿ä¸‰ç­", "æ˜¥æ™–å®žè·µä¸€ç­", "åšé›…å…±åˆ›äºŒç­", "æ¸…å’Œè¿›é˜¶ç­", "è‡´è¿œé¢†èˆªç­", "åŒå¿ƒç ”ä¹ ç­"])

    # Component cards use a three-state override. Typography controls update the poster live.
    assert "no-container" in page.locator(".component-hero").get_attribute("class")
    assert "has-container" in page.locator(".component-info").get_attribute("class")
    assert page.locator(".component-hero").evaluate("element => getComputedStyle(element).textAlign") == "center"
    page.locator(".tree-component").filter(has_text="è‰¯çŸ¥ç­å§”å¤œè¯").click()
    assert page.locator(".properties-nav button").count() == 2
    assert page.locator(".properties-nav button").all_inner_texts() == ["æ ‡é¢˜å†…å®¹", "æ˜¾ç¤ºä¸Žé—´è·"]
    page.locator(".properties-nav button").filter(has_text="æ˜¾ç¤ºä¸Žé—´è·").click()
    page.wait_for_timeout(350)
    assert page.locator('[data-property-section="display"]').evaluate("element => element.getBoundingClientRect().top") < page.locator(".right-panel").evaluate("element => element.getBoundingClientRect().bottom")
    page.locator(".properties-nav button").filter(has_text="æ ‡é¢˜å†…å®¹").click()
    page.wait_for_timeout(350)
    page.get_by_role("button", name="è¿”å›žé¦–æ å†…å®¹", exact=True).click()
    assert page.locator(".properties-title b").inner_text() == "é¦–æ å†…å®¹"
    assert page.locator(".property-back").count() == 0
    page.locator(".tree-component").filter(has_text="è‰¯çŸ¥ç­å§”å¤œè¯").click()
    page.get_by_label("å‰¯æ ‡é¢˜å­—å·").fill("18")
    assert page.locator(".align-buttons button span").all_inner_texts() == ["å·¦", "ä¸­", "å³"]
    assert page.locator(".decoration-options > button").all_inner_texts() == ["å®žçº¿", "åŒçº¿", "è™šçº¿", "æ¸éš", "äº”è§’æ˜Ÿ", "è±å½¢", "åœ†ç‚¹", "æ— "]
    page.locator(".decoration-options > button").filter(has_text="è™šçº¿").click()
    assert "decoration-dashed" in page.locator(".hero-subtitle").get_attribute("class")
    page.locator(".decoration-options > button").filter(has_text="äº”è§’æ˜Ÿ").click()
    assert "decoration-stars" in page.locator(".hero-subtitle").get_attribute("class")
    assert "â˜…â˜…â˜…" in page.locator(".hero-subtitle i").first.evaluate("element => getComputedStyle(element, '::before').content")
    assert "â˜…â˜…â˜…" in page.locator(".decoration-sample.sample-stars").evaluate("element => getComputedStyle(element, '::after').content")
    page.locator(".decoration-options > button").filter(has_text="è±å½¢").click()
    assert page.locator(".hero-subtitle i").evaluate_all("elements => elements.map(element => getComputedStyle(element).display)") == ["flex", "flex"]
    assert page.locator(".hero-subtitle i").evaluate_all("elements => elements.map(element => getComputedStyle(element).flexDirection)") == ["row", "row-reverse"]
    assert page.locator(".hero-subtitle i").first.evaluate("element => getComputedStyle(element, '::before').height") == "1px"
    assert page.locator(".hero-subtitle i").first.evaluate("element => getComputedStyle(element, '::after').width") == "6px"
    page.locator(".decoration-options > button").filter(has_text="å®žçº¿").click()
    assert page.locator(".hero-subtitle").evaluate("element => getComputedStyle(element).fontSize") == "18px"
    assert page.locator(".component-hero").evaluate("element => getComputedStyle(element).textAlign") == "center"
    page.locator(".card-mode-control").get_by_role("button", name="æ˜¾ç¤º", exact=True).click()
    assert "has-container" in page.locator(".component-hero").get_attribute("class")
    page.locator(".card-mode-control").get_by_role("button", name="éšè—", exact=True).click()
    assert "no-container" in page.locator(".component-hero").get_attribute("class")
    page.get_by_label("å‰¯æ ‡é¢˜å­—å·").fill("12")
    page.get_by_role("button", name="å±…ä¸­", exact=True).click()
    page.locator(".tree-component").filter(has_text="å¤œè¯å›žé¡¾").click()
    page.get_by_label("ç»„ä»¶æ ‡é¢˜").fill("   ")
    assert page.locator(".component-info .poster-pill").count() == 0
    assert page.locator(".component-info ul").evaluate("element => getComputedStyle(element).marginTop") == "0px"
    page.get_by_label("ç»„ä»¶æ ‡é¢˜").fill("å¤œè¯å›žé¡¾")
    page.locator(".card-mode-control").get_by_role("button", name="éšè—", exact=True).click()
    assert "no-container" in page.locator(".component-info").get_attribute("class")
    page.locator(".card-mode-control").get_by_role("button", name="æ˜¾ç¤º", exact=True).click()
    assert "has-container" in page.locator(".component-info").get_attribute("class")

    # Unequal and multi-column layouts expand the poster instead of compressing columns.
    page.get_by_role("button", name="å¸ƒå±€", exact=True).click()
    spacing_sliders = page.locator(".spacing-control input[type='range']")
    spacing_sliders.nth(0).fill("80")
    spacing_sliders.nth(1).fill("100")
    spacing_offsets = page.locator(".poster-page").evaluate("element => { const style = getComputedStyle(element); return [style.paddingTop, style.paddingBottom] }")
    assert spacing_offsets == ["80px", "100px"]
    spacing_sliders.nth(0).fill("38")
    spacing_sliders.nth(1).fill("34")
    assert "grouped-mode" in page.locator(".zone-left").get_attribute("class")
    assert "no-container" in page.locator(".zone-left .component-guestGrid").first.get_attribute("class")
    page.locator(".container-mode-control").get_by_role("button", name="ç‹¬ç«‹å¡ç‰‡", exact=True).click()
    assert "cards-mode" in page.locator(".zone-left").get_attribute("class")
    assert "has-container" in page.locator(".zone-left .component-guestGrid").first.get_attribute("class")
    page.locator(".container-mode-control").get_by_role("button", name="è·Ÿéšå¸ƒå±€", exact=True).click()
    page.locator(".layout-presets > button").filter(has_text="çª„å·¦å®½å³").click()
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

    page.locator(".layout-presets > button").filter(has_text="é‡ç‚¹ä¸‰æ ").click()
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
    page.get_by_role("button", name="ç»„ä»¶", exact=True).click()
    add_target = page.locator(".left-content select")
    assert "å…¨å±€é¡µå¤´" in add_target.locator("option").all_inner_texts()
    assert "é¦–æ å†…å®¹" in add_target.locator("option").all_inner_texts()
    add_target.select_option("header")
    page.locator(".component-library > button").filter(has_text="ä¸»é¢˜æ ‡é¢˜").click()
    assert global_header.locator(".component-hero")ã}¸¶‰žËkºwµçPµÁÉ•Í•ÑÌ€ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹žî?–ã–>3š‚<ˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹±…ÍÍ¥Œµ±…å½ÕÐˆ¤¹¥Í}Ù¥Í¥‰±” ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•±•µ•¹Ð¹½™™Í•Ñ]¥‘Ñ ˆ¤€ôô€àÈÀ(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹±…ÍÍ¥Œµ±…å½ÕÐ€ø€¹é½¹”µ¡•…‘•Èˆ¤¹½Õ¹Ð ¤€ôô€À(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹±…ÍÍ¥Œµ±…å½ÕÐ€¹é½¹”µ±•™Ð€¹½µÁ½¹•¹Ðµ¡•É¼ˆ¤¹¥Í}Ù¥Í¥‰±” ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹±…ÍÍ¥Œµ±…å½ÕÐ€¹é½¹”µ±•™Ð€¹½µÁ½¹•¹Ðµ¥¹™¼ˆ¤¹¥Í}Ù¥Í¥‰±” ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹žîOšzˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤((€€€€Œ½½Ñ•ÈÑåÁ½É…Á¡ä¥Ì•‘¥Ñ…‰±”¸(€€€Á…”¹±½…Ñ½È ˆ¹ÑÉ•”µ½µÁ½¹•¹Ðˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹’æ'¢Öß–>G–$ˆ¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹žöË–B7–¶_–>Üˆ¤¹™¥±° ˆÌÐˆ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹¦f–*ƒ¢¾Óšb8ˆ¤¹™¥±° ‹šb;–úß–Ç–¶›ž’øˆ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹¢¾Óšb;–¶_–>Üˆ¤¹™¥±° ˆÄØˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•Èµ‰É…¹ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹™½¹ÑM¥é”ˆ¤€ôô€ˆÌÑÁàˆ(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•Èµ‰É…¹µ¹½Ñ”ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹™½¹ÑM¥é”ˆ¤€ôô€ˆÄÙÁàˆ((€€€€ŒM•±•ÐÑ¡”™¥ÉÍÐÕ•ÍÐÉ½ÕÀÑ¡É½Õ Ñ¡”ÍÑÉÕÑÕÉ”ÑÉ•”¸(€€€Á…”¹±½…Ñ½È ˆ¹ÑÉ•”µ½µÁ½¹•¹Ðˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹ž&ç¦
–"’ê¬ˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹•Ñ}‰å}Ñ•áÐ ‹–b'–ºûžî¢ºûžö¸ˆ°•á…ÐõQÉÕ”¤¹¥Í}Ù¥Í¥‰±” ¤(€€€‰•™½É”€ôÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÕ•ÍÐµ…Éˆ¤¹½Õ¹Ð ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–Š{–*ƒ–b'–ºøˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÕ•ÍÐµ…Éˆ¤¹½Õ¹Ð ¤€ôô‰•™½É”€¬€Ä(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½Á•ÉÑäµ‰…¬ˆ¤¹•Ñ}…ÑÑÉ¥‰ÕÑ” ‰…É¥„µ±…‰•°ˆ¤€ôô€‹¢þS–n{–b'–ºûžîˆ(€€€Á…”¹±½…Ñ½È ˆ¹ÁÉ½Á•ÉÑäµ‰…¬ˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½Á•ÉÑ¥•ÌµÑ¥Ñ±”ˆˆ¤¹¥¹¹•É}Ñ•áÐ ¤€ôô€‹–b'–ºûžîˆ(€€€Á…”¹±½…Ñ½È ˆ¹Õ•ÍÐµ•‘¥Ñ½Èµ±¥ÍÐ‰ÕÑÑ½¸ˆ¤¹±…ÍÐ¹±¥¬ ¤((€€€€Œ‘¥ÐÑ¡”¹•Ý±äµÉ•…Ñ•½¹Ñ•¹Ð¥Ñ•´Ñ¡É½Õ ™½É´™¥•±‘Ì¸(€€€¹…µ•}¥¹ÁÕÐ€ôÁ…”¹•Ñ}‰å}±…‰•° ‹–b'–ºû–žO–B4ˆ¤(€€€¹…µ•}¥¹ÁÕÐ¹™¥±° ‹šÖ/¢¾W–b'–ºøˆ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹¢ê¯’î÷¢¾Óšb8ˆ¤¹™¥±° ‹žîOšz–2[žî’îÛšÖ/¢¾Tˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÕ•ÍÐµ…Éˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹šÖ/¢¾W–b'–ºøˆ¤¹¥Í}Ù¥Í¥‰±” ¤((€€€€ŒI•Á±…”Ñ¡”Á¡½Ñ¼Ý¥Ñ¡½ÕÐ¡…¹¥¹œ±…å½ÕÐ¸(€€€Ý¥Ñ Á…”¹•áÁ•Ñ}™¥±•}¡½½Í•È ¤…Ì¡½½Í•É}¥¹™¼è(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹šnÿš6‹žŸž&ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€¡½½Í•É}¥¹™¼¹Ù…±Õ”¹Í•Ñ}™¥±•Ì¡ÍÑÈ¡I==P€¼€‰ÁÕ‰±¥Œˆ€¼€‰É•™•É•¹”µÁ½ÍÑ•È¹Á¹œˆ¤¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Ñ½…ÍÐœ¤ü¹Ñ•áÑ½¹Ñ•¹Ð¹¥¹±Õ‘•Ì ŸžŸž&–ÞË’òc–2[–æÛšnÿš6ˆœ¤ˆ°Ñ¥µ•½ÕÐôÄÀÀÀÀ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–"ƒ¦fˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤((€€€€Œ	…Ñ ÕÁ±½…µÕ±Ñ¥Á±”Á…ÉÑ¥¥Á…¹ÐÁ¡½Ñ½Ì¸Ù•Éä•±°µÕÍÐÉ•µ…¥¸€ÄØèä¸(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹žîOšzˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹±½…Ñ½È ˆ¹ÑÉ•”µ½µÁ½¹•¹Ðˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹–>’òk’êë–F`ˆ¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹–"–2ëš‚¦Š`ˆ¤¹™¥±° ˆ€ˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹½µÁ½¹•¹Ðµµ½Í…¥Œ€¹Á½ÍÑ•ÈµÁ¥±°ˆ¤¹½Õ¹Ð ¤€ôô€À(€€€Á…”¹•Ñ}‰å}±…‰•° ‹–"–2ëš‚¦Š`ˆ¤¹™¥±° ‹–>’òk’êë–F`ˆ¤(€€€Á…”¹±½…Ñ½È ‰±…‰•°¹™¥•±ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹žŸž&¦^Ó¢Þtˆ¤¹±½…Ñ½È ‰¥¹ÁÕÐˆ¤¹™¥±° ˆÄÈˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹…Àˆ¤€ôô€ˆÄÉÁàˆ(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹‰…­É½Õ¹‘½±½Èˆ¤€ôô€‰É‰„ À°€À°€À°€À¤ˆ(€€€Á…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹ÍÉ••¹Í¡½Ð¡Á…Ñ õÍÑÈ¡M=9}UA1=¤¤(€€€Ý¥Ñ Á…”¹•áÁ•Ñ}™¥±•}¡½½Í•È ¤…Ì¡½½Í•É}¥¹™¼è(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹š&ç¦?’â+’òƒžŸž&ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€¡½½Í•É}¥¹™¼¹Ù…±Õ”¹Í•Ñ}™¥±•Ì¡mÍÑÈ¡I==P€¼€‰ÁÕ‰±¥Œˆ€¼€‰É•™•É•¹”µÁ½ÍÑ•È¹Á¹œˆ¤°ÍÑÈ¡M=9}UA1=¥t¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Ñ½…ÍÐœ¤ü¹Ñ•áÑ½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Ÿ–ÞË–¾ó–”€Èƒ–ò€œ¤ˆ°Ñ¥µ•½ÕÐôÄÔÀÀÀ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°¥µœˆ¤¹½Õ¹Ð ¤€ôô€È(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹µ½Í…¥ŒµÁ¡½Ñ¼µ¥Ñ•´ˆ¤¹½Õ¹Ð ¤€ôô€È(€€€Á¡½Ñ½}½É‘•É}‰•™½É”€ôÁ…”¹±½…Ñ½È ˆ¹µ½Í…¥ŒµÁ¡½Ñ¼µ¥Ñ•´¥µœˆ¤¹•Ù…±Õ…Ñ•}…±° ‰•±•µ•¹ÑÌ€ôø•±•µ•¹ÑÌ¹µ…À¡•±•µ•¹Ð€ôø•±•µ•¹Ð¹ÍÉŒ¤ˆ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹ž²°€Èƒ–òƒžŸž&–&7žžìˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á¡½Ñ½}½É‘•É}…™Ñ•È€ôÁ…”¹±½…Ñ½È ˆ¹µ½Í…¥ŒµÁ¡½Ñ¼µ¥Ñ•´¥µœˆ¤¹•Ù…±Õ…Ñ•}…±° ‰•±•µ•¹ÑÌ€ôø•±•µ•¹ÑÌ¹µ…À¡•±•µ•¹Ð€ôø•±•µ•¹Ð¹ÍÉŒ¤ˆ¤(€€€…ÍÍ•ÉÐÁ¡½Ñ½}½É‘•É}…™Ñ•È€ôô±¥ÍÐ¡É•Ù•ÉÍ•¡Á¡½Ñ½}½É‘•É}‰•™½É”¤¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹žžï¦f“ž²°€Äƒ–òƒžŸž&ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹µ½Í…¥ŒµÁ¡½Ñ¼µ¥Ñ•´ˆ¤¹½Õ¹Ð ¤€ôô€Ä(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°¥µœˆ¤¹½Õ¹Ð ¤€ôô€Ä(€€€Ý¥Ñ Á…”¹•áÁ•Ñ}™¥±•}¡½½Í•È ¤…Ì¡½½Í•É}¥¹™¼è(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹š&ç¦?’â+’òƒžŸž&ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€¡½½Í•É}¥¹™¼¹Ù…±Õ”¹Í•Ñ}™¥±•Ì¡mÍÑÈ¡I==P€¼€‰ÁÕ‰±¥Œˆ€¼€‰É•™•É•¹”µÁ½ÍÑ•È¹Á¹œˆ¤°ÍÑÈ¡M=9}UA1=¥t¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Ñ½…ÍÐœ¤ü¹Ñ•áÑ½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Ÿ–ÞË–¾ó–”€Èƒ–ò€œ¤ˆ°Ñ¥µ•½ÕÐôÄÔÀÀÀ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°¥µœˆ¤¹½Õ¹Ð ¤€ôô€È(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ñ}…ÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½±Õµ¹Ìˆ¤€ôô€ˆÄˆ(€€€•±±}‰½à€ôÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°ˆ¤¹™¥ÉÍÐ¹‰½Õ¹‘¥¹}‰½à ¤(€€€Í•½¹‘}‰½à€ôÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°ˆ¤¹¹Ñ  Ä¤¹‰½Õ¹‘¥¹}‰½à ¤(€€€…ÍÍ•ÉÐ…‰Ì ¡•±±}‰½ál‰Ý¥‘Ñ ‰t€¼•±±}‰½ál‰¡•¥¡Ð‰t¤€´€ ÄØ€¼€ä¤¤€ð€À¸ÀÐ(€€€…ÍÍ•ÉÐ…‰Ì¡•±±}‰½ál‰à‰t€´Í•½¹‘}‰½ál‰à‰t¤€ð€Ä(€€€…ÍÍ•ÉÐÍ•½¹‘}‰½ál‰ä‰t€ø•±±}‰½ál‰ä‰t(€€€Á…”¹•Ñ}‰å}±…‰•° ‹žŸž&’ö7šVÃ¦<ˆ¤¹™¥±° ˆÄÀˆ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–â–Æ ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹±½…Ñ½È ˆ¹±…å½ÕÐµÁÉ•Í•ÑÌ€ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹ž¶'–º÷–>3š‚<ˆ¤¹±¥¬ ¤(€€€ÕÁ±½…‘•‘}É¥‘}Ý¥‘Ñ¡Ì€ômt(€€€Ñ•¹}Á¡½Ñ½}½±Õµ¹Ì€ômt(€€€™½ÈÉ…Ñ¥¼¥¸lˆÄèÄˆ°€ˆÄèÈˆ°€ˆÄèÔ‰tè(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”õÉ…Ñ¥¼°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€€€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰5…Ñ ¹…‰Ì¡9Õµ‰•È¡‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥œ¤¹‘…Ñ…Í•Ð¹É¥‘]¥‘Ñ ¤€´‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥œ¤¹½™™Í•Ñ]¥‘Ñ ¤€ðô€Äˆ¤(€€€€€€€ÕÁ±½…‘•‘}É¥‘}Ý¥‘Ñ¡Ì¹…ÁÁ•¹¡Á…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•±•µ•¹Ð¹½™™Í•Ñ]¥‘Ñ ˆ¤¤(€€€€€€€Ñ•¹}Á¡½Ñ½}½±Õµ¹Ì¹…ÁÁ•¹¡¥¹Ð¡Á…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ñ}…ÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½±Õµ¹Ìˆ¤¤¤(€€€€€€€¥µ…•}‰½à€ôÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°¥µœˆ¤¹™¥ÉÍÐ¹‰½Õ¹‘¥¹}‰½à ¤(€€€€€€€±¥Ù•}•±±}‰½à€ôÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°ˆ¤¹™¥ÉÍÐ¹‰½Õ¹‘¥¹}‰½à ¤(€€€€€€€…ÍÍ•ÉÐ…‰Ì¡¥µ…•}‰½ál‰Ý¥‘Ñ ‰t€´±¥Ù•}•±±}‰½ál‰Ý¥‘Ñ ‰t¤€ð€Ä(€€€€€€€…ÍÍ•ÉÐ…‰Ì¡¥µ…•}‰½ál‰¡•¥¡Ð‰t€´±¥Ù•}•±±}‰½ál‰¡•¥¡Ð‰t¤€ð€Ä(€€€€€€€É¥‘}¡•¥¡Ð€ôÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•±•µ•¹Ð¹½™™Í•Ñ!•¥¡Ðˆ¤(€€€€€€€É½Ý}‰½á•Ì€ôÁ…”¹•Ù…±Õ…Ñ” ˆˆˆ ¤€ôøì(€€€€€€€€€€€½¹ÍÐÉ¥€ô‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥œ¤(€€€€€€€€€€€É•ÑÕÉ¸l¸¸¹¹•Ü5…À¡l¸¸¹É¥¹ÅÕ•ÉåM•±•Ñ½É±° œ¹Á…ÉÑ¥¥Á…¹Ðµ•±°œ¥t¹µ…À¡•±•µ•¹Ð€ôøì(€€€€€€€€€€€€€€€½¹ÍÐÑ½À€ô•±•µ•¹Ð¹½™™Í•ÑQ½À€´É¥¹½™™Í•ÑQ½À(€€€€€€€€€€€€€€€É•ÑÕÉ¸mÑ½À°ìÑ½À°‰½ÑÑ½´èÑ½À€¬•±•µ•¹Ð¹½™™Í•Ñ!•¥¡Ðõt(€€€€€€€€€€€ô¤¤¹Ù…±Õ•Ì ¥t(€€€€€€€ôˆˆˆ¤(€€€€€€€Ñ½Á}…À€ôÉ½Ý}‰½á•ÍlÁul‰Ñ½À‰t(€€€€€€€‰½ÑÑ½µ}…À€ôÉ¥‘}¡•¥¡Ð€´É½Ý}‰½á•Íl´Åul‰‰½ÑÑ½´‰t(€€€€€€€É½Ý}…ÁÌ€ômÉ½Ý}‰½á•Ím¥¹‘•à€¬€Åul‰Ñ½À‰t€´É½Ý}‰½á•Ím¥¹‘•ául‰‰½ÑÑ½´‰t™½È¥¹‘•à¥¸É…¹”¡±•¸¡É½Ý}‰½á•Ì¤€´€Ä¥t(€€€€€€€…ÍÍ•ÉÐ…‰Ì¡Ñ½Á}…À¤€ð€Ä(€€€€€€€…ÍÍ•ÉÐ‰½ÑÑ½µ}…À€øô€´Ä(€€€€€€€…ÍÍ•ÉÐ…±°¡…‰Ì¡É½Ý}…À€´€ÄÈ¤€ðô€Ä™½ÈÉ½Ý}…À¥¸É½Ý}…ÁÌ¤°É½Ý}…ÁÌ(€€€…ÍÍ•ÉÐÕÁ±½…‘•‘}É¥‘}Ý¥‘Ñ¡Ì€ôôÍ½ÉÑ•¡ÕÁ±½…‘•‘}É¥‘}Ý¥‘Ñ¡Ì¤(€€€…ÍÍ•ÉÐ±•¸¡Í•Ð¡ÕÁ±½…‘•‘}É¥‘}Ý¥‘Ñ¡Ì¤¤€ôô€Ì(€€€…ÍÍ•ÉÐµ…à¡Ñ•¹}Á¡½Ñ½}½±Õµ¹Ì¤€øµ¥¸¡Ñ•¹}Á¡½Ñ½}½±Õµ¹Ì¤(€€€Á…”¹±½…Ñ½È ˆ¹±…å½ÕÐµÁÉ•Í•ÑÌ€ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹žî?–ã–>3š‚<ˆ¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹žîOšzˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹±½…Ñ½È ˆ¹ÑÉ•”µ½µÁ½¹•¹Ðˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹–>’òk’êë–F`ˆ¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹šâž¦ë–æÛš‹–’7–6ƒ’ö4ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹Ðµ•±°ˆ¤¹½Õ¹Ð ¤€ôô€ÈÀ(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á…ÉÑ¥¥Á…¹ÐµÉ¥ˆ¤¹•Ñ}…ÑÑÉ¥‰ÕÑ” ‰‘…Ñ„µ½±Õµ¹Ìˆ¤€ôô€ˆÈˆ((€€€€Œ‘±½¹œ½¹Ñ•¹ÐÑ¼Ñ¡”±•™Ð½¹Ñ…¥¹•È…¹Ù•É¥™äÑ¡…ÐÁ½ÍÑ•È¡•¥¡ÐÉ½ÝÌ¸(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹žî’îØˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹šÞï–*ƒ–"Àˆ¤¹Í•±•Ñ}½ÁÑ¥½¸ ‰±•™Ðˆ¤(€€€Á…”¹±½…Ñ½È ˆ¹½µÁ½¹•¹Ðµ±¥‰É…Éä€ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹–’k¢†3šZšr°ˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹•Ñ}‰å}É½±” ‰¡•…‘¥¹œˆ°¹…µ”ô‹–’k¢†3šZšr°ˆ°•á…ÐõQÉÕ”¤¹¥Í}Ù¥Í¥‰±” ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹š‚¦Š`ˆ¤¹™¥±° ˆ€€ˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹½µÁ½¹•¹ÐµÑ•áÑ	±½¬¹Í•±•Ñ•µ½µÁ½¹•¹Ð€¹Á½ÍÑ•ÈµÁ¥±°ˆ¤¹½Õ¹Ð ¤€ôô€À(€€€Á…”¹•Ñ}‰å}±…‰•° ‹š‚¦Š`ˆ¤¹™¥±° ‹–º3šVÓ’òk¢º»žê«¢šˆ¤(€€€±½¹}‰½‘ä€ô€‰q¸ˆ¹©½¥¸¡m˜‹ž²°í¥¹‘•à€¬€Åôƒšv‡’òk¢º»––ºç¾òkžî’îÛ’òkš:£–*£šÖßš*—¢«–*£–BG’â/–îÛ¦VÿŽˆ™½È¥¹‘•à¥¸É…¹” ÌØ¥t¤(€€€Á…”¹±½…Ñ½È ˆ¹ÁÉ½Á•ÉÑ¥•Ìµ‰½‘äÑ•áÑ…É•„ˆ¤¹™¥±°¡±½¹}‰½‘ä¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹š¶šZ–¶_–>Üˆ¤¹™¥±° ˆÄÐˆ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹¢†3¢Þtˆ¤¹™¥±° ˆÈˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹…±¥¸µ‰ÕÑÑ½¹Ì‰ÕÑÑ½¸ÍÁ…¸ˆ¤¹…±±}¥¹¹•É}Ñ•áÑÌ ¤€ôôl‹–Þ˜ˆ°€‹’â´ˆ°€‹–>Ì‰t(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–>Ï–¾ç¦ö@ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•Èµ‰½‘äµÑ•áÐˆ¤¹±…ÍÐ¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹Ñ•áÑ±¥¸ˆ¤€ôô€‰É¥¡Ðˆ(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–Þ›–¾ç¦ö@ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•Èµ‰½‘äµÑ•áÐˆ¤¹±…ÍÐ¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð¤¹™½¹ÑM¥é”ˆ¤€ôô€ˆÄÑÁàˆ(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Á½ÍÑ•ÈµÁ…”œ¤¹½™™Í•Ñ!•¥¡Ð€ø€ÄÈÈÀˆ¤(€€€É•¹‘•É•‘}¡•¥¡Ð€ôÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•±•µ•¹Ð¹½™™Í•Ñ!•¥¡Ðˆ¤(€€€…ÍÍ•ÉÐÉ•¹‘•É•‘}¡•¥¡Ð€ø€ÄÈÈÀ((€€€€ŒM…Ù”ÍÑÉÕÑÕÉ•)M=8…¹Ù•É¥™äÑ¡”Í¡•µ„¸(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹’þw–¶`ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Ñ½…ÍÐœ¤ü¹Ñ•áÑ½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Ÿ¦†çžn»–ÞË’þw–¶`œ¤ˆ¤(€€€Í¹…ÁÍ¡½Ð€ôÁ…”¹•Ù…±Õ…Ñ” ‰)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ µ••Ñ¥¹œµÁ½ÍÑ•Èµ½µÁ½¹•¹ÑÌµØÈœ¤¤ˆ¤(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰Ù•ÉÍ¥½¸‰t€ôô€Ì(€€€…ÍÍ•ÉÐ±•¸¡Í¹…ÁÍ¡½Ñl‰½¹Ñ…¥¹•ÉÌ‰t¤€ôô€Ü(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰±…å½ÕÐ‰t€ôô€‰±…ÍÍ¥Œˆ(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰½¹Ñ…¥¹•É5½‘”‰t€ôô€‰ÁÉ•Í•Ðˆ(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰±…å½ÕÑI…Ñ¥½Ì‰ul‰‘Õ…±9…ÉÉ½Ý]¥‘”‰t€ôôlÄ°€Õt(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰Á…‘‘¥¹Q½À‰t€ôô€Ìà(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰Á…‘‘¥¹	½ÑÑ½´‰t€ôô€ÌÐ(€€€…ÍÍ•ÉÐÍ¹…ÁÍ¡½Ñl‰‰…­É½Õ¹‘MÑå±”‰t€ôô€‰±•…ÉM­äˆ(€€€…ÍÍ•ÉÐ¹•áÐ¡½µÁ½¹•¹Ð™½È½µÁ½¹•¹Ð¥¸Í¹…ÁÍ¡½Ñl‰½¹Ñ…¥¹•ÉÌ‰ulÉul‰½µÁ½¹•¹ÑÌ‰t¥˜½µÁ½¹•¹Ñl‰ÑåÁ”‰t€ôô€‰µ½Í…¥Œˆ¥l‰Á¡½Ñ½…À‰t€ôô€ÄÈ(€€€…ÍÍ•ÉÐ…¹ä¡½µÁ½¹•¹Ñl‰ÑåÁ”‰t€ôô€‰Ñ•áÑ	±½¬ˆ™½È½µÁ½¹•¹Ð¥¸Í¹…ÁÍ¡½Ñl‰½¹Ñ…¥¹•ÉÌ‰ulÅul‰½µÁ½¹•¹ÑÌ‰t¤(€€€Í…Ù•‘}É½Ý}É½ÕÀ€ô¹•áÐ¡½µÁ½¹•¹Ð™½È½µÁ½¹•¹Ð¥¸Í¹…ÁÍ¡½Ñl‰½¹Ñ…¥¹•ÉÌ‰ulÅul‰½µÁ½¹•¹ÑÌ‰t¥˜½µÁ½¹•¹Ñl‰ÑåÁ”‰t€ôô€‰É½ÝÉ½ÕÀˆ¤(€€€…ÍÍ•ÉÐÍ…Ù•‘}É½Ý}É½ÕÁl‰½±Õµ¹Ì‰t€ôô€Ì(€€€…ÍÍ•ÉÐÍ…Ù•‘}É½Ý}É½ÕÁl‰É…Ñ¥½Ì‰t€ôôlÄ°€È°€Åt(€€€…ÍÍ•ÉÐ±•¸¡m¡¥±™½È¡¥±¥¸Í…Ù•‘}É½Ý}É½ÕÁl‰¡¥±‘É•¸‰ulèÍt¥˜¡¥±‘t¤€ôô€Ì((€€€€ŒáÁ½ÉÐ„É•…°€ÉàA9…¹É•Ñ…¥¸ÍÉ••¹Í¡½ÑÌ™½ÈÙ¥ÍÕ…°É•Ù¥•Ü¸(€€€Á…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•±•µ•¹Ð¹±…ÍÍ1¥ÍÐ¹…‘ ¥Ìµ•áÁ½ÉÑ¥¹œœ¤ˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•Ñ½µÁÕÑ•‘MÑå±”¡•±•µ•¹Ð°€œèé…™Ñ•Èœ¤¹‘¥ÍÁ±…äˆ¤€ôô€‰¹½¹”ˆ(€€€Á…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹•Ù…±Õ…Ñ” ‰•±•µ•¹Ð€ôø•±•µ•¹Ð¹±…ÍÍ1¥ÍÐ¹É•µ½Ù” ¥Ìµ•áÁ½ÉÑ¥¹œœ¤ˆ¤(€€€Á…”¹±½…Ñ½È ˆ¹•áÁ½ÉÐµ½¹ÑÉ½°Í•±•Ðˆ¤¹Í•±•Ñ}½ÁÑ¥½¸ ˆÈˆ¤(€€€Ý¥Ñ Á…”¹•áÁ•Ñ}‘½Ý¹±½…¡Ñ¥µ•½ÕÐôÌÀÀÀÀ¤…Ì‘½Ý¹±½…‘}¥¹™¼è(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–¾ó–èA9ˆ°•á…Ðõ…±Í”¤¹±¥¬ ¤(€€€‘½Ý¹±½…‘}¥¹™¼¹Ù…±Õ”¹Í…Ù•}…Ì¡aA=IQ}%1¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰‘½Õµ•¹Ð¹ÅÕ•ÉåM•±•Ñ½È œ¹Ñ½…ÍÐœ¤ü¹Ñ•áÑ½¹Ñ•¹Ð¹¥¹±Õ‘•Ì Ÿ–ÞË–¾ó–èœ¤ˆ°Ñ¥µ•½ÕÐôÌÀÀÀÀ¤((€€€Á…”¹ÍÉ••¹Í¡½Ð¡Á…Ñ õÍÑÈ¡%Q=I}MI9M!=P¤°™Õ±±}Á…”õQÉÕ”¤(€€€Á…”¹±½…Ñ½È ˆ¹Á½ÍÑ•ÈµÁ…”ˆ¤¹ÍÉ••¹Í¡½Ð¡Á…Ñ õÍÑÈ¡A=MQI}MI9M!=P¤¤((€€€€Œ…¹Ù…Ì¥¹ÍÁ•Ñ¥½¸…¸é½½´‰•å½¹€ÄÀÀ”°ÕÀÑ¼„ÍÑ…‰±”€ÈÀÀ”•¥±¥¹œ¸(€€€™½È|¥¸É…¹” ÌÀ¤è(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹šRû–’ŸžRï–âˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹é½½´µ½¹ÑÉ½°ÍÁ…¸ˆ¤¹¥¹¹•É}Ñ•áÐ ¤€ôô€ˆÈÀÀ”ˆ(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹šRû–’ŸžRï–âˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹é½½´µ½¹ÑÉ½°ÍÁ…¸ˆ¤¹¥¹¹•É}Ñ•áÐ ¤€ôô€ˆÈÀÀ”ˆ((€€€€ŒM…Ù•ÁÉ½©•ÑÌÍÕÁÁ½ÉÐ…ÕÑ½µ…Ñ¥ŒÁÉ•Ù¥•ÝÌ°É•¹…µ¥¹œ°ÕÍÑ½´½Ù•ÉÌ°½Ù•ÉÝÉ¥Ñ”½Í…Ù”µ…Ì°…¹Ñ•µÁ±…Ñ•Ì¸(€€€ÁÉ½©•ÑÌ€ôÁ…”¹•Ù…±Õ…Ñ” ‰)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ µ••Ñ¥¹œµÁ½ÍÑ•ÈµÁÉ½©•ÑÌµØÄœ¤¤ˆ¤(€€€…ÍÍ•ÉÐ±•¸¡ÁÉ½©•ÑÌ¤€ôô€Ä(€€€…ÍÍ•ÉÐÁÉ½©•ÑÍlÁul‰¹…µ”‰t€ôô€‹¢&¿ž~—ž>·–žS–’s¢¾tˆ(€€€…ÍÍ•ÉÐÁÉ½©•ÑÍlÁul‰…ÕÑ½AÉ•Ù¥•Ü‰t¹ÍÑ…ÉÑÍÝ¥Ñ  ‰‘…Ñ„é¥µ…”½Ý•‰Àˆ¤(€€€Á…”¹±½…Ñ½È ˆ¹Á…”µ¹…Ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹š"Gžj¦†çžn¸ˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½©•Ðµ…Éˆ¤¹½Õ¹Ð ¤€ôô€Ä(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½©•Ðµ…É€¹Í…Ù•µ½Ù•Èµ¥µ…”ˆ¤¹½Õ¹Ð ¤€ôô€Ä(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹’þ»šRç¦†çžn»–B7žžÀˆ°•á…Ðõ…±Í”¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹¦†çžn»–B7žžÀˆ¤¹™¥±° ‹¢&¿ž~—–’s¢¾wšÖ/¢¾W¦†çžn¸ˆ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹ž†»¢º“’þ»šRç–B7žžÀˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½©•Ðµ…É Èˆ¤¹¥¹¹•É}Ñ•áÐ ¤€ôô€‹¢&¿ž~—–’s¢¾wšÖ/¢¾W¦†çžn¸ˆ(€€€Ý¥Ñ Á…”¹•áÁ•Ñ}™¥±•}¡½½Í•È ¤…Ì¡½½Í•É}¥¹™¼è(€€€€€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹šnÓš6‹¦Š¢ž#–nøˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€¡½½Í•É}¥¹™¼¹Ù…±Õ”¹Í•Ñ}™¥±•Ì¡I}=1}MI9M!=P¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ µ••Ñ¥¹œµÁ½ÍÑ•ÈµÁÉ½©•ÑÌµØÄœ¤¥lÁt¹ÁÉ•Ù¥•Ü¹±•¹Ñ €ø€ÄÀÀˆ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½©•Ðµ…É€¹Í…Ù•µ½Ù•Èµ¥µ…”ˆ¤¹½Õ¹Ð ¤€ôô€Ä(€€€Á…”¹ÍÉ••¹Í¡½Ð¡Á…Ñ õÍÑÈ¡AI=)QM}MI9M!=P¤°™Õ±±}Á…”õQÉÕ”¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹š&O–òžîŸžî·žò[¢úDˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Ý½É­ÍÁ…”ˆ¤¹¥Í}Ù¥Í¥‰±” ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–>›–¶c’âèˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹šZÃ¦†çžn»–B7žžÀˆ¤¹™¥±° ‹¢&¿ž~—–’s¢¾wž&#šr°ˆ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–"o–îëšZÃ¦†çžn¸ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ µ••Ñ¥¹œµÁ½ÍÑ•ÈµÁÉ½©•ÑÌµØÄœ¤¤¹±•¹Ñ €ôôô€Èˆ¤(€€€Á…”¹±½…Ñ½È ˆ¹Á…”µ¹…Ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹š¢‡švÿ’â·–þˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹Ñ•µÁ±…Ñ”µ…Éˆ¤¹½Õ¹Ð ¤€ôô€Ô(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–"o–îë–öO–&7šÖßš*—š¢‡švüˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹•Ñ}‰å}±…‰•° ‹š¢‡švÿ–B7žžÀˆ¤¹™¥±° ‹š"Gžj’òk¢º»žê«–º{š¢‡švüˆ¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹’þw–¶c–"Ãš¢‡švÿ’â·–þˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÕÍÑ½´µÑ•µÁ±…Ñ”µ…Éˆ¤¹½Õ¹Ð ¤€ôô€Ä(€€€…ÍÍ•ÉÐÁ…”¹•Ù…±Õ…Ñ” ‰)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ µ••Ñ¥¹œµÁ½ÍÑ•ÈµÕÍÑ½´µÑ•µÁ±…Ñ•ÌµØÄœ¤¤¹±•¹Ñ ˆ¤€ôô€Ä(€€€Á…”¹ÍÉ••¹Í¡½Ð¡Á…Ñ õÍÑÈ¡Q5A1Q}9QI}MI9M!=P¤°™Õ±±}Á…”õQÉÕ”¤(€€€™½ÉÕµ}Ñ•µÁ±…Ñ”€ôÁ…”¹±½…Ñ½È ˆ¹Ñ•µÁ±…Ñ”µ…Éˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹’â'š‚?¢ºë–vo–£šf¼ˆ¤(€€€™½ÉÕµ}Ñ•µÁ±…Ñ”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹’öÿžR£š¶“š¢‡švüˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹…‘…ÁÑ¥Ù”µ½¹Ñ•¹ÐµÉ¥€ø€¹Á½ÍÑ•Èµ½¹Ñ…¥¹•Èˆ¤¹½Õ¹Ð ¤€ôô€Ì(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹’þw–¶`ˆ°•á…ÐõQÉÕ”¤¹±¥¬ ¤(€€€Á…”¹Ý…¥Ñ}™½É}™Õ¹Ñ¥½¸ ‰)M=8¹Á…ÉÍ”¡±½…±MÑ½É…”¹•Ñ%Ñ•´ µ••Ñ¥¹œµÁ½ÍÑ•ÈµÁÉ½©•ÑÌµØÄœ¤¤¹±•¹Ñ €ôôô€Ìˆ¤(€€€Á…”¹±½…Ñ½È ˆ¹Á…”µ¹…Ø‰ÕÑÑ½¸ˆ¤¹™¥±Ñ•È¡¡…Í}Ñ•áÐô‹š"Gžj¦†çžn¸ˆ¤¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½©•Ðµ…Éˆ¤¹½Õ¹Ð ¤€ôô€Ì(€€€Á…”¹½¸ ‰‘¥…±½œˆ°±…µ‰‘„‘¥…±½œè‘¥…±½œ¹…•ÁÐ ¤¤(€€€Á…”¹•Ñ}‰å}É½±” ‰‰ÕÑÑ½¸ˆ°¹…µ”ô‹–"ƒ¦f“¦†çžn¸ˆ°•á…Ðõ…±Í”¤¹™¥ÉÍÐ¹±¥¬ ¤(€€€…ÍÍ•ÉÐÁ…”¹±½…Ñ½È ˆ¹ÁÉ½©•Ðµ…Éˆ¤¹½Õ¹Ð ¤€ôô€È(€€€‰É½ÝÍ•È¹±½Í” ¤()¥˜•ÉÉ½ÉÌè(€€€É…¥Í”ÍÍ•ÉÑ¥½¹ÉÉ½È ‰	É½ÝÍ•È•ÉÉ½ÉÌéq¸ˆ€¬€‰q¸ˆ¹©½¥¸¡•ÉÉ½ÉÌ¤¤()ÁÉ¥¹Ð¡˜‰=5A=99Q}M5=-}=,ÍÉ••¹Í¡½Ðõí%Q=I}MI9M!=Qôˆ¤