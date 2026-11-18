/**
 * @fileoverview UniPalette 견본 화면 — UniPalette 모듈(unipalette.js)을 부르는 예제 앱
 * - Input arguments 목록 → UniPalette.pick(인자) → 돌려받은 색 배열을 칩과 코드로 보여 준다
 * - 화면 언어(i18n.js), 다크모드 기억, 설명서·단축키 창, 새 판 알림, 오류 경계
 */

// 버전 정보는 version.js(SEMVER, CACHE_BUST_TAG, DISPLAY_VERSION)를 단일 원본으로 참조
const APP_SETTINGS_KEY = 'unipalette_app_settings_v1';
const UPDATE_DISMISSED_KEY = 'unipalette_update_dismissed_v1';
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
const HOSTED_BASE_URL = 'https://iseohyun.github.io/UniPalette/';
const ARG_INPUT_IDS = ['optBase', 'optCount', 'optSteps', 'optMethod', 'optLightMin', 'optLightMax',
    'optShape', 'optTheme', 'optLang', 'optTitle', 'optRemember'];

let toastTimeoutId = null;
let lastResult = null;
let appSettings = { dark: false, lang: '' };

document.addEventListener('DOMContentLoaded', () => {
    try {
        initApp();
    } catch (err) {
        renderErrorBoundary(err);
    }
});

function initApp() {
    if (typeof UniPalette === 'undefined' || typeof I18n === 'undefined') {
        throw new Error('unipalette.js / i18n.js could not be loaded.');
    }
    const versionEl = document.getElementById('appVersion');
    if (versionEl && typeof DISPLAY_VERSION !== 'undefined') {
        versionEl.textContent = DISPLAY_VERSION;
    }

    appSettings = loadAppSettings();
    initHeaderModalButtons();
    initDarkMode();
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

/* ---------- 앱 설정(다크모드, 언어) 기억 ---------- */

function loadAppSettings() {
    try {
        const parsed = JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}') || {};
        return {
            dark: parsed.dark === true,
            lang: I18n.supported.includes(parsed.lang) ? parsed.lang : ''
        };
    } catch (err) {
        console.warn('Could not read app settings; using defaults.', err);
        return { dark: false, lang: '' };
    }
}

function saveAppSettings() {
    try {
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(appSettings));
    } catch (err) {
        console.warn('Could not save app settings.', err);
    }
}

function updateDarkButton() {
    const btn = document.getElementById('btnToggleDark');
    if (btn) btn.textContent = I18n.t(appSettings.dark ? 'light' : 'dark');
}

function initDarkMode() {
    document.body.classList.toggle('preview-dark', appSettings.dark);
    document.getElementById('btnToggleDark').addEventListener('click', () => {
        appSettings.dark = !appSettings.dark;
        document.body.classList.toggle('preview-dark', appSettings.dark);
        updateDarkButton();
        saveAppSettings();
    });
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
    updateDarkButton();
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
    else if (includePageDefaults) opts.theme = appSettings.dark ? 'dark' : 'light';
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
