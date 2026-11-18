/**
 * @fileoverview UniPalette 견본 화면 — UniPalette 모듈(unipalette.js)을 부르는 예제 앱
 * - Input arguments 목록 → UniPalette.pick(인자) → 돌려받은 색 배열을 칩과 코드로 보여 준다
 * - 화면 언어(i18n.js), 배색(scheme.js, UniPalette로 고른 색으로 이 화면의 배색 바꾸기), 설명서·단축키 창,
 *   새 판 알림, 오류 경계
 */

// 버전 정보는 version.js(SEMVER, CACHE_BUST_TAG, DISPLAY_VERSION)를 단일 원본으로 참조
const APP_SETTINGS_KEY = 'unipalette_app_settings_v2';
const OLD_APP_SETTINGS_KEY = 'unipalette_app_settings_v1';   // v1: { dark, lang }
const UPDATE_DISMISSED_KEY = 'unipalette_update_dismissed_v1';
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const HOSTED_BASE_URL = 'https://iseohyun.github.io/UniPalette/';
const ARG_INPUT_IDS = ['optBase', 'optCount', 'optSteps', 'optMethod', 'optLightMin', 'optLightMax',
    'optShape', 'optTheme', 'optLang', 'optTitle', 'optRemember'];

let toastTimeoutId = null;
let lastResult = null;
// scheme: 'light' | 'dark' | 'stone' | 'navy' | 'custom', custom: { palette, darkBase } (고른 팔레트를 그대로 둔다),
// interfaceRole: 단추에 쓸 서브 테마색 'sub1' | 'sub2' | 'sub3'
let appSettings = { scheme: 'light', custom: null, interfaceRole: 'sub1', lang: '' };
let schemeIsDark = false;

document.addEventListener('DOMContentLoaded', () => {
    try {
        initApp();
    } catch (err) {
        renderErrorBoundary(err);
    }
});

function initApp() {
    if (typeof UniPalette === 'undefined' || typeof I18n === 'undefined' || typeof Scheme === 'undefined') {
        throw new Error('unipalette.js / i18n.js / scheme.js could not be loaded.');
    }
    const versionEl = document.getElementById('appVersion');
    if (versionEl && typeof DISPLAY_VERSION !== 'undefined') {
        versionEl.textContent = DISPLAY_VERSION;
    }

    appSettings = loadAppSettings();
    initHeaderModalButtons();
    initSchemePanel();
    initDemoForm();
    initLanguage();
    initUpdateNotice();
}

/* ---------- 오류 경계 ---------- */

function renderErrorBoundary(err) {
    console.error('UniPalette example: failed to render.', err);
    const main = document.getElementById('appMain');
    if (!main) return;
    const tr = (key, fallback) => (typeof I18n !== 'undefined' ? I18n.t(key) : fallback);
    main.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'error-boundary';
    const title = document.createElement('strong');
    title.textContent = tr('errorTitle', 'Something went wrong');
    const detail = document.createElement('code');
    detail.textContent = err && err.message ? err.message : String(err);
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'header-btn';
    retry.textContent = tr('retry', 'Try again');
    retry.addEventListener('click', () => {
        try { localStorage.removeItem(APP_SETTINGS_KEY); } catch (e) { console.warn(e); }
        location.reload();
    });
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.className = 'primary-btn';
    reload.textContent = tr('reload', 'Reload');
    reload.addEventListener('click', () => location.reload());
    box.append(title, detail, retry, reload);
    main.appendChild(box);
}

/* ---------- 앱 설정(배색, 언어) 기억 ---------- */

function isValidPalette(palette) {
    const flat = Array.isArray(palette) ? palette.flat() : [];
    return flat.length > 0 && flat.every(hex => typeof hex === 'string' && /^#[0-9A-F]{6}$/i.test(hex));
}

function loadAppSettings() {
    const fallback = { scheme: 'light', custom: null, interfaceRole: 'sub1', lang: '' };
    try {
        let parsed = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || 'null');
        if (!parsed) {
            // 앞 판(v1)의 다크모드 값을 배색으로 이어받는다
            const old = JSON.parse(localStorage.getItem(OLD_APP_SETTINGS_KEY) || '{}') || {};
            parsed = { scheme: old.dark === true ? 'dark' : 'light', lang: old.lang };
        }
        const custom = parsed.custom && isValidPalette(parsed.custom.palette)
            ? { palette: parsed.custom.palette, darkBase: parsed.custom.darkBase === true }
            : null;
        let scheme = Scheme.PRESET_IDS.includes(parsed.scheme) || parsed.scheme === 'custom' ? parsed.scheme : 'light';
        if (scheme === 'custom' && !custom) scheme = 'light';
        const interfaceRole = Scheme.INTERFACE_CHOICES.includes(parsed.interfaceRole) ? parsed.interfaceRole : 'sub1';
        return { scheme, custom, interfaceRole, lang: I18n.supported.includes(parsed.lang) ? parsed.lang : '' };
    } catch (err) {
        console.warn('Could not read app settings; using defaults.', err);
        return fallback;
    }
}

function saveAppSettings() {
    try {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
    } catch (err) {
        console.warn('Could not save app settings.', err);
    }
}

/* ---------- 배색 패널 ---------- */

let currentScheme = null;   // 지금 적용된 배색(Scheme.presetColors / fromPalette의 결과)

function roleNames() {
    const names = {};
    Scheme.ROLES.forEach(role => { names[role] = I18n.t('role_' + role); });
    return names;
}

function buildScheme(id) {
    return id === 'custom'
        ? Scheme.fromPalette(appSettings.custom.palette, appSettings.custom.darkBase, appSettings.interfaceRole)
        : Scheme.presetColors(id, appSettings.interfaceRole);
}

/** 지금 설정의 배색을 계산해 화면에 적용한다. 대비를 고쳤으면 true */
function applyCurrentScheme() {
    currentScheme = buildScheme(appSettings.scheme);
    schemeIsDark = Scheme.apply(currentScheme.colors);
    renderSchemePanel();
    return currentScheme.adjusted;
}

function schemeTile(id, built, label) {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'scheme-tile';
    tile.dataset.scheme = id;
    tile.setAttribute('aria-pressed', String(appSettings.scheme === id));
    const swatch = document.createElement('span');
    swatch.className = 'scheme-swatch';
    swatch.style.background = built.colors.bg;
    swatch.style.borderColor = built.colors.border;
    Scheme.ROLES.forEach(role => {
        const dot = document.createElement('span');
        dot.style.background = built.roles[role];
        swatch.appendChild(dot);
    });
    const name = document.createElement('span');
    name.textContent = label;
    tile.append(swatch, name);
    return tile;
}

/** 패널 아래의 「이 배색의 역할」: 역할마다 원래 색과 이름, 인터페이스로 쓰는 서브에 표시 */
function renderSchemeRoles(built) {
    const list = document.getElementById('schemeRoles');
    const names = roleNames();
    const frag = document.createDocumentFragment();
    Scheme.ROLES.forEach(role => {
        const hex = built.roles[role];
        const item = document.createElement('li');
        const chip = document.createElement('span');
        chip.className = 'scheme-role-chip';
        chip.style.background = hex;
        const name = document.createElement('span');
        name.textContent = names[role];
        if (role === built.interfaceRole) {
            const badge = document.createElement('em');
            badge.className = 'scheme-role-badge';
            badge.textContent = I18n.t('interfaceBadge');
            name.append(' ', badge);
        }
        const code = document.createElement('code');
        code.textContent = hex;
        item.append(chip, name, code);
        frag.appendChild(item);
    });
    list.replaceChildren(frag);
}

function renderSchemePanel() {
    const box = document.getElementById('schemePresets');
    if (!box || !currentScheme) return;
    const frag = document.createDocumentFragment();
    Scheme.PRESET_IDS.forEach(id => frag.appendChild(schemeTile(id, buildScheme(id), I18n.t('scheme_' + id))));
    if (appSettings.custom) frag.appendChild(schemeTile('custom', buildScheme('custom'), I18n.t('schemeCustom')));
    box.replaceChildren(frag);
    renderSchemeRoles(currentScheme);
    document.getElementById('schemeDarkBase').checked = appSettings.custom ? appSettings.custom.darkBase : false;
    document.querySelectorAll('input[name="schemeInterface"]').forEach(radio => {
        radio.checked = radio.value === appSettings.interfaceRole;
    });
}

function setSchemePanelOpen(open) {
    const panel = document.getElementById('schemePanel');
    // 좁은 화면에서는 패널을 화면 폭에 맞춰 띄우므로, 단추 바로 아래에 오도록 높이를 잰다
    panel.style.top = open && window.matchMedia('(max-width: 560px)').matches
        ? `${document.getElementById('btnScheme').getBoundingClientRect().bottom + 6}px` : '';
    panel.hidden = !open;
    document.getElementById('btnScheme').setAttribute('aria-expanded', String(open));
}

function chooseScheme(id) {
    appSettings.scheme = id;
    const adjusted = applyCurrentScheme();
    saveAppSettings();
    if (adjusted) showToast(I18n.t('schemeAdjusted'));
}

/**
 * UniPalette 간단 보기로 「내 배색」을 고른다.
 * 대화상자에서 기준 색을 끌거나 값을 바꿀 때마다 onChange로 이 화면에 바로 적용하고,
 * 칩 아래에는 그 색의 역할 이름을 붙인다. 취소하면 원래 배색으로 되돌린다.
 */
function pickCustomScheme() {
    setSchemePanelOpen(false);
    const darkBase = document.getElementById('schemeDarkBase').checked;
    const names = roleNames();
    const options = Object.assign({}, Scheme.PICK_OPTIONS, {
        title: I18n.t('schemePickTitle'),
        lang: I18n.lang,
        theme: darkBase ? 'dark' : 'light',
        labels: (n, hexes) => Scheme.roleLabels(hexes, names),
        onChange: palette => {
            Scheme.apply(Scheme.fromPalette(palette, darkBase, appSettings.interfaceRole).colors);
        }
    });
    if (appSettings.custom) options.base = Scheme.fromPalette(appSettings.custom.palette).roles.primary;
    UniPalette.pick(options)
        .then(palette => {
            if (palette === null) {
                applyCurrentScheme();   // 미리보기를 거두고 원래 배색으로
                return;
            }
            appSettings.custom = { palette, darkBase };
            chooseScheme('custom');
        })
        .catch(err => {
            applyCurrentScheme();
            console.error('UniPalette example: could not pick a scheme.', err);
            showToast(err && err.message ? err.message : I18n.t('openFailed'));
        });
}

function initSchemePanel() {
    const btn = document.getElementById('btnScheme');
    const panel = document.getElementById('schemePanel');
    btn.addEventListener('click', () => setSchemePanelOpen(panel.hidden));
    document.getElementById('schemePresets').addEventListener('click', e => {
        const tile = e.target.closest('[data-scheme]');
        if (tile) chooseScheme(tile.dataset.scheme);
    });
    document.getElementById('btnSchemePick').addEventListener('click', pickCustomScheme);
    // 인터페이스색: 서브 1·2·3 중 무엇을 단추에 쓸지 바로 바꿔 보며 고른다
    document.querySelectorAll('input[name="schemeInterface"]').forEach(radio => {
        radio.addEventListener('change', () => {
            if (!radio.checked) return;
            appSettings.interfaceRole = radio.value;
            chooseScheme(appSettings.scheme);
        });
    });
    // 「어두운 바탕」: 내 배색이 있으면 바로 다시 계산하고, 없으면 다음에 고를 때 쓴다
    document.getElementById('schemeDarkBase').addEventListener('change', e => {
        if (!appSettings.custom) return;
        appSettings.custom.darkBase = e.target.checked;
        chooseScheme('custom');
    });
    document.addEventListener('pointerdown', e => {
        if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) setSchemePanelOpen(false);
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !panel.hidden) {
            setSchemePanelOpen(false);
            btn.focus();
        }
    });
    applyCurrentScheme();
}

/* ---------- 언어 ---------- */

function initLanguage() {
    const select = document.getElementById('langSelect');
    UniPalette.languages.filter(l => I18n.supported.includes(l.code)).forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = l.name;
        select.appendChild(opt);
    });
    select.value = appSettings.lang || UniPalette.resolveLang('auto');
    select.addEventListener('change', () => {
        appSettings.lang = select.value;
        saveAppSettings();
        applyLanguage(select.value);
    });
    applyLanguage(select.value);
}

/** 화면 글자를 바꾸고, 사전에서 오지 않는 글자(목록, 자리 표시, 코드)를 다시 만든다 */
function applyLanguage(code) {
    I18n.setLang(code);
    renderSchemePanel();
    fillMethodOptions();
    fillLangOptions();
    fillDefaultPlaceholders();
    renderCallCode();
    renderUsageCode();
    if (lastResult) renderResult(lastResult);
    else document.getElementById('resultCode').textContent = I18n.t('notPicked');
    const modal = document.getElementById('commonModal');
    if (modal.classList.contains('show') && modal.dataset.kind) openModal(modal.dataset.kind);
}

function fillMethodOptions() {
    const select = document.getElementById('optMethod');
    const keep = select.value;
    select.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = `${I18n.t('defaultWord')}: ${UniPalette.methodLabel(UniPalette.defaults.method, I18n.lang)}`;
    select.appendChild(def);
    UniPalette.methods.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = UniPalette.methodLabel(m.id, I18n.lang);
        select.appendChild(opt);
    });
    select.value = keep;
}

function fillLangOptions() {
    const select = document.getElementById('optLang');
    const keep = select.value;
    select.innerHTML = '';
    const def = document.createElement('option');
    def.value = '';
    def.textContent = I18n.t('followPage');
    select.appendChild(def);
    [{ code: 'auto', name: 'auto' }].concat(UniPalette.languages).forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.code;
        opt.textContent = l.code === 'auto' ? 'auto' : `${l.code} · ${l.name}`;
        select.appendChild(opt);
    });
    select.value = keep;
}

function fillDefaultPlaceholders() {
    document.querySelectorAll('.arg-list input[data-default]').forEach(input => {
        input.placeholder = `${I18n.t('defaultWord')}: ${input.dataset.default}`;
    });
    document.getElementById('optTitle').placeholder = I18n.t('defaultWord');
}

/* ---------- 견본: input arguments → pick → 결과 ---------- */

function initDemoForm() {
    const baseText = document.getElementById('optBase');
    const basePicker = document.getElementById('optBasePicker');
    basePicker.addEventListener('input', () => {
        baseText.value = basePicker.value.toUpperCase();
        renderCallCode();
    });
    baseText.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(baseText.value)) basePicker.value = baseText.value.toLowerCase();
    });
    ARG_INPUT_IDS.forEach(id => {
        const el = document.getElementById(id);
        el.addEventListener('input', renderCallCode);
        el.addEventListener('change', renderCallCode);
    });

    const remember = document.getElementById('optRemember');
    remember.addEventListener('change', () => {
        document.getElementById('optRememberText').textContent = String(remember.checked);
    });

    document.getElementById('btnPick').addEventListener('click', openPicker);
    document.getElementById('btnCopyResult').addEventListener('click', () => {
        if (!lastResult) return;
        copyTextWithFallback(`const colorPalette = ${JSON.stringify(lastResult, null, 2)};`, I18n.t('copied'));
    });

    // 견본 화면의 단축키: P로 대화상자 열기 (입력 중·조합키·창이 열린 동안은 받지 않음)
    document.addEventListener('keydown', e => {
        if (e.ctrlKey || e.altKey || e.metaKey || UniPalette.isOpen) return;
        if (document.getElementById('commonModal').classList.contains('show')) return;
        if (!document.getElementById('schemePanel').hidden) return;
        const tgt = e.target;
        if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'SELECT' || tgt.tagName === 'TEXTAREA')) return;
        if (e.key === 'p' || e.key === 'P') {
            e.preventDefault();
            openPicker();
        }
    });
}

/** 빈 칸은 넘기지 않는다. includePageDefaults면 화면을 따르는 테마·언어도 채운다 */
function collectOptions(includePageDefaults) {
    const opts = {};
    const value = id => document.getElementById(id).value.trim();
    const num = id => (value(id) === '' ? undefined : parseInt(value(id), 10));
    if (value('optBase')) opts.base = value('optBase');
    ['count', 'steps', 'lightMin', 'lightMax'].forEach(name => {
        const n = num('opt' + name[0].toUpperCase() + name.slice(1));
        if (n !== undefined && !Number.isNaN(n)) opts[name] = n;
    });
    if (value('optMethod')) opts.method = value('optMethod');
    if (value('optShape') !== 'auto') opts.shape = value('optShape');
    if (value('optTheme')) opts.theme = value('optTheme');
    else if (includePageDefaults) opts.theme = schemeIsDark ? 'dark' : 'light';
    if (value('optLang')) opts.lang = value('optLang');
    else if (includePageDefaults) opts.lang = I18n.lang;
    if (value('optTitle')) opts.title = value('optTitle');
    if (!document.getElementById('optRemember').checked) opts.remember = false;
    return opts;
}

function renderCallCode() {
    const opts = collectOptions(false);
    const arg = Object.keys(opts).length ? JSON.stringify(opts, null, 2) : '';
    document.getElementById('callCode').textContent = `const colors = await UniPalette.pick(${arg});`;
}

function openPicker() {
    UniPalette.pick(collectOptions(true))
        .then(result => {
            if (result === null) {
                showToast(I18n.t('cancelled'));
                return;
            }
            lastResult = result;
            renderResult(result);
        })
        .catch(err => {
            console.error('UniPalette example: could not open the dialog.', err);
            showToast(err && err.message ? err.message : I18n.t('openFailed'));
        });
}

function renderResult(result) {
    const chips = document.getElementById('resultChips');
    const is2d = Array.isArray(result[0]);
    const columns = is2d ? result : result.map(hex => [hex]);
    const rows = Math.max(...columns.map(c => c.length));
    chips.style.gridTemplateColumns = `repeat(${columns.length}, 1fr)`;
    const frag = document.createDocumentFragment();
    for (let j = 0; j < rows; j++) {
        columns.forEach(column => {
            const hex = column[j];
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'result-chip';
            if (hex) {
                chip.style.backgroundColor = hex;
                chip.title = hex;
                chip.setAttribute('aria-label', hex);
                chip.addEventListener('click', () => copyTextWithFallback(hex, I18n.t('hexCopied', { hex })));
            } else {
                chip.disabled = true;
            }
            frag.appendChild(chip);
        });
    }
    chips.replaceChildren(frag);
    const note = is2d ? I18n.t('resultGrid', { c: columns.length, s: rows }) : I18n.t('resultFlat', { n: result.length });
    document.getElementById('resultCode').textContent = `${note}\n${JSON.stringify(result, null, 2)}`;
    document.getElementById('btnCopyResult').disabled = false;
}

function renderUsageCode() {
    const tag = typeof CACHE_BUST_TAG !== 'undefined' ? `?v=${CACHE_BUST_TAG}` : '';
    const code = [
        `<!-- ${I18n.t('usageLoad')} -->`,
        `<link rel="stylesheet" href="${HOSTED_BASE_URL}unipalette.css${tag}">`,
        `<script src="${HOSTED_BASE_URL}version.js${tag}"></script>`,
        `<script src="${HOSTED_BASE_URL}calcColor.js${tag}"></script>`,
        `<script src="${HOSTED_BASE_URL}unipalette.js${tag}"></script>`,
        '',
        '<script>',
        `  // ${I18n.t('usagePick')}`,
        `  const colors = await UniPalette.pick({ base: '#3B82F6', count: 8, steps: 3, lang: '${I18n.lang}' });`,
        `  // ${I18n.t('usageShape')}`,
        '',
        `  // ${I18n.t('usageExtract')}`,
        "  const same = UniPalette.extract({ base: '#3B82F6', count: 8, steps: 3 });",
        '</script>'
    ].join('\n');
    document.getElementById('usageCode').textContent = code;
}

/* ---------- 새 판 알림 ---------- */

function initUpdateNotice() {
    if (location.protocol === 'file:' || typeof CACHE_BUST_TAG === 'undefined') return;
    const notice = document.getElementById('updateNotice');
    let latestTag = null;

    const check = () => {
        fetch(`index.html?check=${Date.now()}`, { cache: 'no-store' })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then(html => {
                const match = html.match(/<meta\s+name="build"\s+content="([^"]+)"/);
                if (!match || match[1] === CACHE_BUST_TAG) return;
                let dismissed = null;
                try { dismissed = localStorage.getItem(UPDATE_DISMISSED_KEY); } catch (err) { console.warn(err); }
                if (dismissed === match[1]) return;
                latestTag = match[1];
                notice.hidden = false;
            })
            .catch(err => console.warn('Update check failed.', err));
    };

    document.getElementById('btnUpdateReload').addEventListener('click', () => location.reload());
    document.getElementById('btnUpdateDismiss').addEventListener('click', () => {
        notice.hidden = true;
        try { if (latestTag) localStorage.setItem(UPDATE_DISMISSED_KEY, latestTag); } catch (err) { console.warn(err); }
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
    });
    setInterval(check, UPDATE_CHECK_INTERVAL_MS);
    check();
}

/* ---------- 헤더의 설명서·단축키 창 ---------- */

function initHeaderModalButtons() {
    const modalOverlay = document.getElementById('commonModal');
    const modalContent = document.getElementById('modalContent');
    document.getElementById('btnShortcut').addEventListener('click', () => openModal('shortcut'));
    document.getElementById('btnHelp').addEventListener('click', () => openModal('help'));
    modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) closeModal();
    });
    modalContent.addEventListener('click', e => {
        if (e.target.closest('.modal-close-btn')) closeModal();
    });
}

function modalHeader(titleKey) {
    return `<div class="modal-header"><h2>${I18n.t(titleKey)}</h2>` +
        `<button type="button" class="modal-close-btn" aria-label="${I18n.t('close')}">&times;</button></div>`;
}

function buildHelpHtml() {
    const algo = (method, key) =>
        `<div class="algorithm-card"><div class="algo-title">${UniPalette.methodLabel(method, I18n.lang)}</div>` +
        `<div class="algo-desc">${I18n.t(key)}</div></div>`;
    return modalHeader('helpTitle') +
        '<div class="modal-body help-body"><div class="help-section">' +
        `<h3>${I18n.t('helpMethods')}</h3>` +
        algo('linear', 'helpLinear') + algo('hslAdapt', 'helpHslAdapt') + algo('macadam', 'helpMacadam') +
        algo('hslMacadam', 'helpHslMacadam') + algo('oklab', 'helpOklab') + algo('ciede', 'helpCiede') +
        '</div><div class="help-section help-section-gap">' +
        `<h3>${I18n.t('helpPresets')}</h3><ul>` +
        `<li>${I18n.t('helpPpt')}</li><li>${I18n.t('helpRainbow')}</li><li>${I18n.t('helpGoogle')}</li>` +
        '</ul></div></div>';
}

function buildShortcutHtml() {
    const rows = ['increaseCount', 'decreaseCount', 'increaseLightSteps', 'decreaseLightSteps'].map(action =>
        `<tr><td class="action-label">${I18n.t('sc_' + action)}</td>` +
        `<td><button type="button" class="key-slot-btn" id="key-${action}-primary"></button></td>` +
        `<td><button type="button" class="key-slot-btn" id="key-${action}-secondary"></button></td></tr>`).join('');
    return modalHeader('scTitle') +
        '<div class="modal-body">' +
        `<p class="modal-desc">${I18n.t('scDesc')}</p>` +
        '<table class="shortcut-table"><thead><tr>' +
        `<th>${I18n.t('scAction')}</th><th>${I18n.t('scPrimary')}</th><th>${I18n.t('scSecondary')}</th>` +
        `</tr></thead><tbody>${rows}</tbody></table>` +
        `<div class="shortcut-info-box"><strong>${I18n.t('scFixedTitle')}</strong><p>` +
        `- ${I18n.t('scFixedMethods')}<br>- ${I18n.t('scFixedPresets')}<br>- ${I18n.t('scFixedDialog')}<br>- ${I18n.t('scFixedPage')}</p></div>` +
        '<div class="modal-footer">' +
        `<button type="button" class="modal-action-btn save" id="btnSaveShortcuts">${I18n.t('save')}</button>` +
        `<button type="button" class="modal-action-btn reset" id="btnResetShortcuts">${I18n.t('reset')}</button>` +
        '</div></div>';
}

/** kind: 'help' | 'shortcut'. 내용은 지금 언어로 만든다(파일을 불러오지 않으므로 file://에서도 같다) */
function openModal(kind) {
    const modalContent = document.getElementById('modalContent');
    const modalOverlay = document.getElementById('commonModal');
    if (typeof cancelRecording === 'function') cancelRecording();
    modalContent.innerHTML = kind === 'shortcut' ? buildShortcutHtml() : buildHelpHtml();
    modalOverlay.dataset.kind = kind;
    modalOverlay.classList.add('show');
    if (kind === 'shortcut' && typeof initShortcutSettingsUI === 'function') initShortcutSettingsUI();
}

window.closeModal = function () {
    const modalOverlay = document.getElementById('commonModal');
    modalOverlay.classList.remove('show');
    delete modalOverlay.dataset.kind;
    if (typeof cancelRecording === 'function') cancelRecording();
};

/* ---------- 복사와 알림 ---------- */

function copyTextWithFallback(text, successMessage) {
    const fallbackCopy = () => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand('copy');
            textarea.remove();
            showToast(ok ? successMessage : I18n.t('copyFailed'));
        } catch (err) {
            console.error('Clipboard fallback failed:', err);
            showToast(I18n.t('copyFailed'));
        }
    };
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text).then(() => showToast(successMessage)).catch(fallbackCopy);
    } else {
        fallbackCopy();
    }
}

function showToast(message) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    if (toastTimeoutId) clearTimeout(toastTimeoutId);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimeoutId = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeoutId = null;
    }, 1200);
}
