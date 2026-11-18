/**
 * @fileoverview UniPalette 모듈 — 색 추출 대화상자를 띄우고, 고른 색 배열을 돌려준다.
 *
 * 불러오는 순서: version.js(선택) → calcColor.js(필수) → unipalette.js, 스타일은 unipalette.css.
 *
 *   const colors = await UniPalette.pick({ base: '#3B82F6', count: 8, steps: 1, method: 'oklab' });
 *   // 명암 단계가 1이면 ['#3B82F6', ...]            (길이 = count)
 *   // 2 이상이면     [['#..', '#..'], ...]           (colors[색상][단계], 단계는 어두운 쪽부터)
 *   // 취소하면       null
 *
 * 화면이 필요 없으면 같은 옵션으로 UniPalette.extract(options)를 부르면 같은 모양의 배열을 바로 받는다.
 *
 * 옵션(모두 생략 가능): base, count(2~36), steps(1~10), method, lightMin, lightMax(0~100),
 *   shape('auto' | 'grid': grid면 단계가 1이어도 2차원), theme('auto' | 'light' | 'dark'),
 *   title(비우면 언어별 기본 제목), lang('auto' | 'ko' | 'en' | 'ja' | 'zh', auto는 브라우저 언어),
 *   remember(기본 true: 마지막 값을 기억해 다음에 이어 씀), storageKey.
 * 넘긴 옵션이 기억한 값보다 앞선다. 넘기지 않은 항목만 기억한 값 → 기본값 순으로 채운다.
 */

(function (global) {
    'use strict';

    const STORAGE_KEY = 'unipalette_settings_v1';
    const SHORTCUT_STORAGE_KEY = 'unipalette_shortcuts';

    const METHODS = [
        { id: 'linear', key: 'a' },
        { id: 'hslAdapt', key: 'b' },
        { id: 'macadam', key: 'c' },
        { id: 'hslMacadam', key: 'd' },
        { id: 'oklab', key: 'e' },
        { id: 'ciede', key: 'f' },
        { id: 'ppt', key: 'x' },
        { id: 'rainbow', key: 'y' },
        { id: 'google', key: 'z' }
    ];

    /*
     * 화면 글자. 언어를 더할 때는 아래에 같은 키를 모두 갖춘 묶음을 하나 더 넣는다.
     * 빠진 키는 영어(en)로, 영어에도 없으면 키 이름으로 보인다.
     */
    const STRINGS = {
        ko: {
            name: '한국어',
            title: '색 고르기', cancel: '취소', cancelEsc: '취소 (Esc)', confirm: '선택', copyCode: '코드 복사',
            baseColor: '기준 색상', hue: '색상(Hue)', dropper: '스포이드', nativePicker: '시스템 색 고르기', close: '닫기',
            countSteps: '추출 개수 · 명암 단계', count: '추출 개수', steps: '명암 단계', method: '추출 방법',
            lightRange: '명암 범위', lightMin: '명암 최솟값', lightMax: '명암 최댓값',
            mapTitle: '색상 분포 맵', mapHint: '(가로: Hue, 세로: Lightness)', saturation: '채도',
            red: 'Red', green: 'Green', blue: 'Blue',
            picked: '고른 색', pickedHint: '(눌러서 HEX 복사)', colorsN: '{n}색', baseTip: '기준',
            errorTitle: '문제가 생겼습니다', retry: '다시 시도',
            copied: '{hex} 복사됨', codeCopied: '코드를 복사했습니다.', copyFailed: '복사에 실패했습니다.',
            methods: {
                linear: '선형 색상 추출', hslAdapt: '휘도 보정(HSL 적응형)', macadam: '색상 보정(MacAdam Ellipse)',
                hslMacadam: '휘도 색상 보정(HSL+MacAdam)', oklab: '인지적 등간격(Oklab)', ciede: 'CIEDE2000 고인지 색차 탐색',
                ppt: 'PowerPoint 기본색(7x1)', rainbow: '무지개색(MS, 10x1)', google: '구글색(8x3)'
            }
        },
        en: {
            name: 'English',
            title: 'Pick colors', cancel: 'Cancel', cancelEsc: 'Cancel (Esc)', confirm: 'Select', copyCode: 'Copy code',
            baseColor: 'Base color', hue: 'Hue', dropper: 'Eyedropper', nativePicker: 'System color picker', close: 'Close',
            countSteps: 'Count · Lightness steps', count: 'Count', steps: 'Lightness steps', method: 'Method',
            lightRange: 'Lightness range', lightMin: 'Minimum lightness', lightMax: 'Maximum lightness',
            mapTitle: 'Color map', mapHint: '(x: Hue, y: Lightness)', saturation: 'Saturation',
            red: 'Red', green: 'Green', blue: 'Blue',
            picked: 'Picked colors', pickedHint: '(click to copy HEX)', colorsN: '{n} colors', baseTip: 'Base',
            errorTitle: 'Something went wrong', retry: 'Try again',
            copied: 'Copied {hex}', codeCopied: 'Code copied.', copyFailed: 'Copy failed.',
            methods: {
                linear: 'Linear', hslAdapt: 'Luminance-adjusted (HSL adaptive)', macadam: 'Hue-adjusted (MacAdam ellipse)',
                hslMacadam: 'Luminance + hue (HSL+MacAdam)', oklab: 'Perceptually even (Oklab)', ciede: 'CIEDE2000 color difference',
                ppt: 'PowerPoint defaults (7x1)', rainbow: 'Rainbow (MS, 10x1)', google: 'Google colors (8x3)'
            }
        },
        ja: {
            name: '日本語',
            title: '色を選ぶ', cancel: 'キャンセル', cancelEsc: 'キャンセル (Esc)', confirm: '選択', copyCode: 'コードをコピー',
            baseColor: '基準色', hue: '色相(Hue)', dropper: 'スポイト', nativePicker: 'システムのカラーピッカー', close: '閉じる',
            countSteps: '抽出数 · 明度段階', count: '抽出数', steps: '明度段階', method: '抽出方法',
            lightRange: '明度の範囲', lightMin: '明度の最小値', lightMax: '明度の最大値',
            mapTitle: '色分布マップ', mapHint: '(横: Hue, 縦: Lightness)', saturation: '彩度',
            red: 'Red', green: 'Green', blue: 'Blue',
            picked: '選んだ色', pickedHint: '(クリックで HEX をコピー)', colorsN: '{n}色', baseTip: '基準',
            errorTitle: '問題が発生しました', retry: 'やり直す',
            copied: '{hex} をコピーしました', codeCopied: 'コードをコピーしました。', copyFailed: 'コピーに失敗しました。',
            methods: {
                linear: '線形抽出', hslAdapt: '輝度補正(HSL 適応)', macadam: '色相補正(MacAdam 楕円)',
                hslMacadam: '輝度・色相補正(HSL+MacAdam)', oklab: '知覚的等間隔(Oklab)', ciede: 'CIEDE2000 色差探索',
                ppt: 'PowerPoint 標準色(7x1)', rainbow: '虹色(MS, 10x1)', google: 'Google カラー(8x3)'
            }
        },
        zh: {
            name: '中文',
            title: '选择颜色', cancel: '取消', cancelEsc: '取消 (Esc)', confirm: '选择', copyCode: '复制代码',
            baseColor: '基准色', hue: '色相(Hue)', dropper: '吸管', nativePicker: '系统取色器', close: '关闭',
            countSteps: '提取数量 · 明度级数', count: '提取数量', steps: '明度级数', method: '提取方法',
            lightRange: '明度范围', lightMin: '明度最小值', lightMax: '明度最大值',
            mapTitle: '颜色分布图', mapHint: '(横: Hue, 纵: Lightness)', saturation: '饱和度',
            red: 'Red', green: 'Green', blue: 'Blue',
            picked: '已选颜色', pickedHint: '(点击复制 HEX)', colorsN: '{n} 色', baseTip: '基准',
            errorTitle: '出现了问题', retry: '重试',
            copied: '已复制 {hex}', codeCopied: '已复制代码。', copyFailed: '复制失败。',
            methods: {
                linear: '线性提取', hslAdapt: '亮度校正(HSL 自适应)', macadam: '色相校正(MacAdam 椭圆)',
                hslMacadam: '亮度与色相校正(HSL+MacAdam)', oklab: '感知等距(Oklab)', ciede: 'CIEDE2000 色差搜索',
                ppt: 'PowerPoint 默认色(7x1)', rainbow: '彩虹色(MS, 10x1)', google: 'Google 颜色(8x3)'
            }
        }
    };

    /** 'auto'면 브라우저 언어 중 지원하는 첫 언어, 없으면 영어 */
    function resolveLang(lang) {
        if (lang && lang !== 'auto' && STRINGS[lang]) return lang;
        const prefs = (global.navigator && (global.navigator.languages || [global.navigator.language])) || [];
        for (const pref of prefs) {
            const code = String(pref || '').toLowerCase().split('-')[0];
            if (STRINGS[code]) return code;
        }
        return 'en';
    }

    function translator(lang) {
        const table = STRINGS[resolveLang(lang)];
        return (key, vars) => {
            let text = table[key] !== undefined ? table[key] : (STRINGS.en[key] !== undefined ? STRINGS.en[key] : key);
            if (vars) Object.keys(vars).forEach(k => { text = text.replace('{' + k + '}', vars[k]); });
            return text;
        };
    }

    function methodLabel(id, lang) {
        const m = METHODS.find(x => x.id === id);
        const table = STRINGS[resolveLang(lang)].methods;
        return `[${m.key}] ${table[id] || STRINGS.en.methods[id]}`;
    }

    // 고정 프리셋 규격 (단독 앱 main.js의 PRESET_CONFIG를 옮겨 온 단일 원본)
    const PRESETS = {
        ppt: { count: 7, defaultSteps: 1, fixedSteps: true },
        rainbow: { count: 10, defaultSteps: 1, fixedSteps: true },
        google: { count: 8, defaultSteps: 3, fixedSteps: false, maxSteps: 3 }
    };

    const LIMITS = { countMin: 2, countMax: 36, stepsMin: 1, stepsMax: 10 };

    const DEFAULTS = {
        base: '#E44D1B',
        count: 8,
        steps: 1,
        method: 'linear',
        lightMin: 20,
        lightMax: 80,
        shape: 'auto',
        theme: 'auto',
        title: '',          // 비우면 언어별 기본 제목
        lang: 'auto',
        remember: true,
        storageKey: STORAGE_KEY
    };

    // 기억하는 항목 (shape·theme·title은 부르는 앱이 정하는 값이라 기억하지 않는다)
    const REMEMBERED_FIELDS = ['base', 'count', 'steps', 'method', 'lightMin', 'lightMax'];

    const DEFAULT_SHORTCUTS = {
        increaseCount: ['+', 'ArrowUp'],
        decreaseCount: ['-', 'ArrowDown'],
        increaseLightSteps: ['*', 'PageUp'],
        decreaseLightSteps: ['/', 'PageDown']
    };

    let openInstance = null;

    /* ---------- 값 확인 ---------- */

    function requireCore() {
        if (typeof extractColors !== 'function' || typeof hexToHsl !== 'function') {
            throw new Error('UniPalette: calcColor.js를 먼저 불러와야 합니다.');
        }
    }

    function normalizeHex(value) {
        let hex = String(value == null ? '' : value).trim();
        if (hex && hex[0] !== '#') hex = '#' + hex;
        if (/^#[0-9A-F]{3}$/i.test(hex)) {
            hex = '#' + hex.slice(1).split('').map(c => c + c).join('');
        }
        return /^#[0-9A-F]{6}$/i.test(hex) ? hex.toUpperCase() : null;
    }

    function toInt(value, min, max) {
        const n = typeof value === 'number' ? value : parseInt(value, 10);
        if (!Number.isFinite(n)) return null;
        const r = Math.round(n);
        return r < min || r > max ? null : r;
    }

    /**
     * 항목마다 허용된 값인지 보고, 어긋난 항목은 빼고 돌려준다(빈 칸은 다음 순위 값으로 채운다).
     */
    function sanitize(source) {
        const out = {};
        if (!source || typeof source !== 'object') return out;
        const base = normalizeHex(source.base);
        if (base) out.base = base;
        const count = toInt(source.count, LIMITS.countMin, LIMITS.countMax);
        if (count !== null) out.count = count;
        const steps = toInt(source.steps, LIMITS.stepsMin, LIMITS.stepsMax);
        if (steps !== null) out.steps = steps;
        if (METHODS.some(m => m.id === source.method)) out.method = source.method;
        const lightMin = toInt(source.lightMin, 0, 100);
        if (lightMin !== null) out.lightMin = lightMin;
        const lightMax = toInt(source.lightMax, 0, 100);
        if (lightMax !== null) out.lightMax = lightMax;
        if (source.shape === 'auto' || source.shape === 'grid') out.shape = source.shape;
        if (['auto', 'light', 'dark'].includes(source.theme)) out.theme = source.theme;
        if (typeof source.title === 'string' && source.title.trim()) out.title = source.title.trim();
        if (source.lang === 'auto' || STRINGS[source.lang]) out.lang = source.lang;
        if (typeof source.remember === 'boolean') out.remember = source.remember;
        if (typeof source.storageKey === 'string' && source.storageKey) out.storageKey = source.storageKey;
        return out;
    }

    function loadRemembered(key) {
        try {
            const raw = global.localStorage.getItem(key);
            if (!raw) return {};
            const parsed = sanitize(JSON.parse(raw));
            const picked = {};
            REMEMBERED_FIELDS.forEach(f => { if (f in parsed) picked[f] = parsed[f]; });
            return picked;
        } catch (err) {
            console.warn('UniPalette: 기억한 설정을 읽지 못해 기본값을 씁니다.', err);
            return {};
        }
    }

    function saveRemembered(key, state) {
        try {
            const data = {};
            REMEMBERED_FIELDS.forEach(f => { data[f] = state[f]; });
            global.localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.warn('UniPalette: 설정을 기억하지 못했습니다.', err);
        }
    }

    function loadShortcuts() {
        const map = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
        try {
            const raw = global.localStorage.getItem(SHORTCUT_STORAGE_KEY);
            const saved = raw ? JSON.parse(raw) : null;
            if (saved) {
                Object.keys(map).forEach(action => {
                    if (saved[action]) {
                        map[action] = [saved[action].primary || map[action][0], saved[action].secondary || map[action][1]];
                    }
                });
            }
        } catch (err) {
            console.warn('UniPalette: 단축키 설정을 읽지 못해 기본값을 씁니다.', err);
        }
        return map;
    }

    /**
     * 옵션 → 기억한 값 → 기본값 순으로 합치고, 명암 범위의 앞뒤를 맞춘다.
     */
    function resolveOptions(options) {
        const given = sanitize(options);
        const remember = given.remember !== undefined ? given.remember : DEFAULTS.remember;
        const storageKey = given.storageKey || DEFAULTS.storageKey;
        const remembered = remember ? loadRemembered(storageKey) : {};
        const state = Object.assign({}, DEFAULTS, remembered, given, { remember, storageKey });
        if (state.lightMin > state.lightMax) {
            const t = state.lightMin;
            state.lightMin = state.lightMax;
            state.lightMax = t;
        }
        return state;
    }

    /* ---------- 계산 ---------- */

    /** 프리셋이면 개수·단계를 규격에 맞춘 실제 값 */
    function effectiveSize(state) {
        const preset = PRESETS[state.method];
        if (!preset) return { count: state.count, steps: state.steps };
        let steps = preset.fixedSteps ? preset.defaultSteps : state.steps;
        if (preset.maxSteps) steps = Math.max(1, Math.min(preset.maxSteps, steps));
        return { count: preset.count, steps };
    }

    function computeColors(state) {
        requireCore();
        const size = effectiveSize(state);
        const hsl = hexToHsl(state.base);
        const colors = extractColors(hsl.h, hsl.s, hsl.l, state.base, size.count, state.method,
            state.lightMin, state.lightMax, size.steps);
        return { colors, count: size.count, steps: size.steps, baseHsl: hsl };
    }

    /** 단계 순으로 펼친 결과를 [색상][단계] 또는 1차원 배열로 바꾼다 */
    function shapeResult(computed, shape) {
        const { colors, count, steps } = computed;
        if (steps === 1 && shape !== 'grid') return colors.map(c => c.hex);
        const grid = [];
        for (let i = 0; i < count; i++) {
            const column = [];
            for (let j = 0; j < steps; j++) {
                const color = colors[j * count + i];
                if (color) column.push(color.hex);
            }
            grid.push(column);
        }
        return grid;
    }

    function extract(options) {
        const state = resolveOptions(Object.assign({ remember: false }, options));
        return shapeResult(computeColors(state), state.shape);
    }

    /* ---------- 대화상자 ---------- */

    const ICONS = {
        close: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
        dropper: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4 5 5"/><path d="M12.93 7.07a2 2 0 0 0-2.83 0l-6.24 6.24a2 2 0 0 0 0 2.83l.79.79a2 2 0 0 0 2.83 0l6.24-6.24a2 2 0 0 0 0-2.83Z"/><path d="m2 22 3-3"/></svg>',
        palette: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10c1.378 0 2.5-1.122 2.5-2.5 0-.649-.247-1.24-.657-1.687-.41-.448-.657-1.047-.657-1.701 0-1.378 1.122-2.5 2.5-2.5H18c2.206 0 4-1.794 4-4 0-5.523-4.477-10-10-10z"/></svg>'
    };

    function versionText() {
        return typeof DISPLAY_VERSION !== 'undefined' ? DISPLAY_VERSION : '';
    }

    function buildDialog(state, t) {
        const dialog = document.createElement('dialog');
        dialog.className = 'up-dialog';
        dialog.dataset.theme = state.theme;
        const title = state.title || t('title');
        dialog.lang = state.langCode;
        dialog.setAttribute('aria-label', title);
        const options = METHODS.map(m => `<option value="${m.id}">${methodLabel(m.id, state.langCode)}</option>`).join('');
        dialog.innerHTML = `
<form method="dialog" class="up-shell">
  <div class="up-head">
    <h2 class="up-title"></h2>
    <button type="button" class="up-icon-btn" data-up="cancel" title="${t('cancelEsc')}" aria-label="${t('cancel')}">${ICONS.close}</button>
  </div>
  <div class="up-body">
    <div class="up-controls">
      <div class="up-field">
        <span class="up-label">${t('baseColor')}</span>
        <button type="button" class="up-base-btn" data-up="base" aria-haspopup="dialog"></button>
        <input type="color" class="up-native" data-up="native" tabindex="-1" aria-hidden="true">
        <div class="up-picker" data-up="picker" hidden>
          <div class="up-picker-canvas" data-up="sv"><canvas width="210" height="130"></canvas><div class="up-picker-pin"></div></div>
          <input type="range" class="up-hue" data-up="hue" min="0" max="360" value="0" aria-label="${t('hue')}">
          <div class="up-picker-bar">
            <div class="up-picker-preview"><span></span><span></span></div>
            <div class="up-picker-actions">
              <button type="button" class="up-picker-btn" data-up="dropper" title="${t('dropper')}" hidden>${ICONS.dropper}</button>
              <button type="button" class="up-picker-btn" data-up="open-native" title="${t('nativePicker')}">${ICONS.palette}</button>
              <button type="button" class="up-picker-btn up-picker-close" data-up="close-picker" title="${t('close')}">${ICONS.close}</button>
            </div>
          </div>
        </div>
      </div>
      <div class="up-field">
        <span class="up-label">${t('countSteps')}</span>
        <div class="up-pair">
          <input type="number" data-up="count" min="${LIMITS.countMin}" max="${LIMITS.countMax}" title="${t('count')}" aria-label="${t('count')}">
          <input type="number" data-up="steps" min="${LIMITS.stepsMin}" max="${LIMITS.stepsMax}" title="${t('steps')}" aria-label="${t('steps')}">
        </div>
      </div>
      <div class="up-field up-field-wide">
        <span class="up-label">${t('method')}</span>
        <select data-up="method" aria-label="${t('method')}">${options}</select>
      </div>
    </div>
    <div class="up-field">
      <span class="up-label">${t('lightRange')} <small data-up="range-text"></small></span>
      <div class="up-range">
        <div class="up-range-track"></div>
        <div class="up-range-fill" data-up="range-fill"></div>
        <input type="range" data-up="light-min" min="0" max="100" aria-label="${t('lightMin')}">
        <input type="range" data-up="light-max" min="0" max="100" aria-label="${t('lightMax')}">
      </div>
    </div>
    <div class="up-card">
      <div class="up-card-title"><span>${t('mapTitle')} <small>${t('mapHint')}</small></span><small data-up="sat"></small></div>
      <div class="up-map" data-up="map">
        <canvas width="180" height="75"></canvas>
        <div data-up="markers"></div>
        <div class="up-light-guide" data-up="guide"></div>
      </div>
      <div class="up-map-axis"><span>${t('red')} (0°)</span><span>${t('green')} (120°)</span><span>${t('blue')} (240°)</span><span>${t('red')} (360°)</span></div>
    </div>
    <div class="up-card">
      <div class="up-card-title"><span>${t('picked')} <small>${t('pickedHint')}</small></span><small data-up="size"></small></div>
      <div class="up-strip" data-up="strip"></div>
    </div>
    <div class="up-error" data-up="error" role="alert" hidden>
      <strong>${t('errorTitle')}</strong>
      <code data-up="error-text"></code>
      <button type="button" class="up-btn" data-up="retry">${t('retry')}</button>
    </div>
  </div>
  <div class="up-foot">
    <span class="up-status" data-up="status" aria-live="polite"></span>
    <div class="up-foot-right">
      <button type="button" class="up-btn" data-up="copy">${t('copyCode')}</button>
      <button type="button" class="up-btn" data-up="cancel">${t('cancel')}</button>
      <button type="submit" class="up-btn up-btn-primary" data-up="confirm">${t('confirm')}</button>
    </div>
  </div>
</form>`;
        dialog.querySelector('.up-title').textContent = title;
        const v = versionText();
        if (v) {
            const span = document.createElement('span');
            span.className = 'up-version';
            span.textContent = 'UniPalette ' + v;
            dialog.querySelector('.up-title').appendChild(span);
        }
        return dialog;
    }

    function drawSvCanvas(canvas, hue) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const gradH = ctx.createLinearGradient(0, 0, w, 0);
        gradH.addColorStop(0, '#ffffff');
        gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
        ctx.fillStyle = gradH;
        ctx.fillRect(0, 0, w, h);
        const gradV = ctx.createLinearGradient(0, 0, 0, h);
        gradV.addColorStop(0, 'rgba(0,0,0,0)');
        gradV.addColorStop(1, '#000000');
        ctx.fillStyle = gradV;
        ctx.fillRect(0, 0, w, h);
    }

    function drawMapCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        const img = ctx.createImageData(w, h);
        for (let y = 0; y < h; y++) {
            const l = 100 - (y / h) * 100;
            for (let x = 0; x < w; x++) {
                const hex = hslToHex((x / w) * 360, 100, l);
                const idx = (y * w + x) * 4;
                img.data[idx] = parseInt(hex.substring(1, 3), 16);
                img.data[idx + 1] = parseInt(hex.substring(3, 5), 16);
                img.data[idx + 2] = parseInt(hex.substring(5, 7), 16);
                img.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
    }

    function copyText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            return navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
        }
        return fallbackCopy(text);
    }

    function fallbackCopy(text) {
        return new Promise((resolve, reject) => {
            const area = document.createElement('textarea');
            area.value = text;
            area.style.position = 'fixed';
            area.style.opacity = '0';
            (openInstance ? openInstance.dialog : document.body).appendChild(area);
            area.select();
            const ok = document.execCommand('copy');
            area.remove();
            if (ok) resolve(); else reject(new Error('복사 실패'));
        });
    }

    function isTypingTarget(el) {
        if (!el) return false;
        if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
        if (el.tagName === 'INPUT') {
            return !['range', 'color', 'button', 'submit', 'checkbox', 'radio'].includes(el.type) && !el.readOnly;
        }
        return el.isContentEditable === true;
    }

    /**
     * 대화상자를 띄우고, 사용자가 「선택」을 누르면 색 배열로, 취소하면 null로 끝나는 Promise를 돌려준다.
     */
    function pick(options) {
        try {
            requireCore();
        } catch (err) {
            return Promise.reject(err);
        }
        if (typeof HTMLDialogElement === 'undefined') {
            return Promise.reject(new Error('UniPalette: 이 브라우저는 <dialog>를 지원하지 않습니다.'));
        }
        if (openInstance) {
            return Promise.reject(new Error('UniPalette: 대화상자가 이미 열려 있습니다.'));
        }

        const state = resolveOptions(options);
        state.langCode = resolveLang(state.lang);
        const t = translator(state.langCode);
        let lastUserSteps = state.steps;
        let previousMethod = state.method;
        let computed = null;
        let statusTimer = null;
        const shortcuts = loadShortcuts();

        const dialog = buildDialog(state, t);
        const $ = name => dialog.querySelector(`[data-up="${name}"]`);
        const el = {
            base: $('base'), native: $('native'), picker: $('picker'), sv: $('sv'), hue: $('hue'),
            dropper: $('dropper'), count: $('count'), steps: $('steps'), method: $('method'),
            lightMin: $('light-min'), lightMax: $('light-max'), rangeFill: $('range-fill'), rangeText: $('range-text'),
            map: $('map'), markers: $('markers'), guide: $('guide'), sat: $('sat'), strip: $('strip'), size: $('size'),
            error: $('error'), errorText: $('error-text'), status: $('status')
        };
        const svCanvas = el.sv.querySelector('canvas');
        const svPin = el.sv.querySelector('.up-picker-pin');
        const pickerPreview = dialog.querySelectorAll('.up-picker-preview span');

        document.body.appendChild(dialog);

        return new Promise(resolve => {
            let settled = false;

            function finish(value) {
                if (settled) return;
                settled = true;
                if (value !== null && state.remember) saveRemembered(state.storageKey, state);
                clearTimeout(statusTimer);
                if (dialog.open) dialog.close();
                dialog.remove();
                openInstance = null;
                resolve(value);
            }

            function showStatus(message) {
                el.status.textContent = message;
                clearTimeout(statusTimer);
                statusTimer = setTimeout(() => { el.status.textContent = ''; }, 1500);
            }

            /* --- 그리기 --- */

            function syncInputs() {
                const preset = PRESETS[state.method];
                const size = effectiveSize(state);
                el.method.value = state.method;
                el.count.value = size.count;
                el.count.disabled = !!preset;
                el.steps.value = size.steps;
                el.steps.disabled = !!(preset && preset.fixedSteps);
                el.steps.max = preset && preset.maxSteps ? preset.maxSteps : LIMITS.stepsMax;
                el.lightMin.value = state.lightMin;
                el.lightMax.value = state.lightMax;
                el.rangeFill.style.left = state.lightMin + '%';
                el.rangeFill.style.width = (state.lightMax - state.lightMin) + '%';
                el.rangeText.textContent = `${state.lightMin}% ~ ${state.lightMax}%`;
                el.guide.style.top = (100 - state.lightMax) + '%';
                el.guide.style.height = (state.lightMax - state.lightMin) + '%';
                el.base.textContent = state.base;
                el.base.style.backgroundColor = state.base;
                el.base.style.color = getRelativeLuminance(state.base) > 0.179 ? '#000000' : '#FFFFFF';
                el.native.value = state.base.toLowerCase();
                pickerPreview[0].style.backgroundColor = state.base;
                pickerPreview[1].textContent = state.base;
            }

            function markerTip(prefix, c) {
                return `${prefix}: ${c.hex} (H:${c.h}°, S:${c.s}%, L:${c.l}%)`;
            }

            function setActive(index, on) {
                const marker = el.markers.querySelector(`[data-index="${index}"]`);
                if (marker) marker.classList.toggle('up-active', on);
                const chip = el.strip.children[index];
                if (chip) chip.classList.toggle('up-active', on);
            }

            function renderMarkers() {
                const base = computed.baseHsl;
                const frag = document.createDocumentFragment();
                const baseMarker = document.createElement('div');
                baseMarker.className = 'up-marker up-marker-base';
                baseMarker.dataset.up = 'base-marker';
                baseMarker.style.left = (base.h / 360) * 100 + '%';
                baseMarker.style.top = (100 - base.l) + '%';
                baseMarker.style.backgroundColor = state.base;
                baseMarker.dataset.tip = markerTip(t('baseTip'), { hex: state.base, h: base.h, s: base.s, l: base.l });
                frag.appendChild(baseMarker);
                computed.colors.forEach((c, i) => {
                    const m = document.createElement('div');
                    m.className = 'up-marker up-marker-color';
                    m.dataset.index = i;
                    m.style.left = (c.h / 360) * 100 + '%';
                    m.style.top = (100 - c.l) + '%';
                    m.style.backgroundColor = c.hex;
                    m.dataset.tip = markerTip('#' + (i + 1), c);
                    m.addEventListener('mouseenter', () => setActive(i, true));
                    m.addEventListener('mouseleave', () => setActive(i, false));
                    frag.appendChild(m);
                });
                el.markers.replaceChildren(frag);
            }

            function renderStrip() {
                const { colors, count, steps } = computed;
                el.strip.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
                const frag = document.createDocumentFragment();
                colors.forEach((c, i) => {
                    const chip = document.createElement('button');
                    chip.type = 'button';
                    chip.className = 'up-chip';
                    chip.style.backgroundColor = c.hex;
                    chip.title = `${c.hex} · H:${c.h}° S:${c.s}% L:${c.l}%`;
                    chip.setAttribute('aria-label', c.hex);
                    chip.innerHTML = '<span class="up-chip-dark">Aa</span><span class="up-chip-light">Aa</span>';
                    chip.addEventListener('mouseenter', () => setActive(i, true));
                    chip.addEventListener('mouseleave', () => setActive(i, false));
                    chip.addEventListener('click', () => {
                        copyText(c.hex).then(() => showStatus(t('copied', { hex: c.hex })), () => showStatus(t('copyFailed')));
                    });
                    frag.appendChild(chip);
                });
                el.strip.replaceChildren(frag);
                el.size.textContent = steps > 1 ? `${count} × ${steps}` : t('colorsN', { n: count });
            }

            // 오류 경계: 그리다 실패해도 대화상자는 살려 두고 이유와 「다시 시도」를 보여 준다
            function render() {
                try {
                    syncInputs();
                    computed = computeColors(state);
                    el.sat.textContent = `${t('saturation')}: ${computed.baseHsl.s}%`;
                    renderMarkers();
                    renderStrip();
                    el.error.hidden = true;
                    $('confirm').disabled = false;
                } catch (err) {
                    console.error('UniPalette: 팔레트를 그리지 못했습니다.', err);
                    el.errorText.textContent = err && err.message ? err.message : String(err);
                    el.error.hidden = false;
                    $('confirm').disabled = true;
                }
            }

            /* --- 값 바꾸기 --- */

            function setMethod(method) {
                if (!PRESETS[previousMethod]) lastUserSteps = state.steps;
                const preset = PRESETS[method];
                if (preset) state.steps = preset.defaultSteps;
                else if (PRESETS[previousMethod]) state.steps = lastUserSteps;
                state.method = method;
                previousMethod = method;
                render();
            }

            function setBase(hex, opts) {
                const clean = normalizeHex(hex);
                if (!clean) return;
                state.base = clean;
                if (!opts || opts.syncPicker !== false) syncPickerToBase();
                render();
            }

            function adjust(field, delta) {
                if (field === 'count') {
                    if (PRESETS[state.method]) return;
                    const v = state.count + delta;
                    if (v >= LIMITS.countMin && v <= LIMITS.countMax) { state.count = v; render(); }
                } else {
                    const preset = PRESETS[state.method];
                    if (preset && preset.fixedSteps) return;
                    const max = preset && preset.maxSteps ? preset.maxSteps : LIMITS.stepsMax;
                    const v = effectiveSize(state).steps + delta;
                    if (v >= LIMITS.stepsMin && v <= max) { state.steps = v; if (!preset) lastUserSteps = v; render(); }
                }
            }

            /* --- 기준 색 피커 --- */

            function syncPickerToBase() {
                const hsl = hexToHsl(state.base);
                const hsv = hslToHsv(hsl.h, hsl.s, hsl.l);
                el.hue.value = hsv.h;
                drawSvCanvas(svCanvas, hsv.h);
                svPin.style.left = (hsv.s * 100) + '%';
                svPin.style.top = ((1 - hsv.v) * 100) + '%';
                svPin.dataset.s = hsv.s;
                svPin.dataset.v = hsv.v;
            }

            function pickFromSv(e) {
                const rect = el.sv.getBoundingClientRect();
                const s = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                const v = 1 - Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
                svPin.style.left = (s * 100) + '%';
                svPin.style.top = ((1 - v) * 100) + '%';
                svPin.dataset.s = s;
                svPin.dataset.v = v;
                const hsl = hsvToHsl(parseInt(el.hue.value, 10) || 0, s, v);
                setBase(hslToHex(hsl.h, hsl.s, hsl.l), { syncPicker: false });
            }

            function togglePicker(show) {
                const open = show === undefined ? el.picker.hidden : show;
                if (open) syncPickerToBase();
                el.picker.hidden = !open;
                el.base.setAttribute('aria-expanded', String(open));
            }

            el.base.addEventListener('click', () => togglePicker());
            $('close-picker').addEventListener('click', () => togglePicker(false));
            el.sv.addEventListener('pointerdown', e => {
                el.sv.setPointerCapture(e.pointerId);
                pickFromSv(e);
            });
            el.sv.addEventListener('pointermove', e => {
                if (el.sv.hasPointerCapture(e.pointerId)) pickFromSv(e);
            });
            el.hue.addEventListener('input', () => {
                const hue = parseInt(el.hue.value, 10) || 0;
                drawSvCanvas(svCanvas, hue);
                const s = parseFloat(svPin.dataset.s) || 0;
                const v = parseFloat(svPin.dataset.v) || 0;
                const hsl = hsvToHsl(hue, s, v);
                setBase(hslToHex(hsl.h, hsl.s, hsl.l), { syncPicker: false });
            });
            if ('EyeDropper' in global) {
                el.dropper.hidden = false;
                el.dropper.addEventListener('click', () => {
                    new global.EyeDropper().open()
                        .then(result => setBase(result.sRGBHex))
                        .catch(err => console.info('UniPalette: 스포이드를 취소했습니다.', err && err.name));
                });
            }
            $('open-native').addEventListener('click', () => {
                togglePicker(false);
                el.native.click();
            });
            el.native.addEventListener('input', () => setBase(el.native.value));
            dialog.addEventListener('pointerdown', e => {
                if (!el.picker.hidden && !el.picker.contains(e.target) && e.target !== el.base) togglePicker(false);
            });

            /* --- 입력 칸 --- */

            el.count.addEventListener('input', () => {
                const v = toInt(el.count.value, LIMITS.countMin, LIMITS.countMax);
                if (v !== null) { state.count = v; render(); }
            });
            el.steps.addEventListener('input', () => {
                const v = toInt(el.steps.value, LIMITS.stepsMin, parseInt(el.steps.max, 10) || LIMITS.stepsMax);
                if (v !== null) {
                    state.steps = v;
                    if (!PRESETS[state.method]) lastUserSteps = v;
                    render();
                }
            });
            el.method.addEventListener('change', () => setMethod(el.method.value));
            el.lightMin.addEventListener('input', () => {
                state.lightMin = Math.min(parseInt(el.lightMin.value, 10), state.lightMax);
                render();
            });
            el.lightMax.addEventListener('input', () => {
                state.lightMax = Math.max(parseInt(el.lightMax.value, 10), state.lightMin);
                render();
            });

            /* --- 분포 맵의 기준 마커 끌기 --- */

            el.map.addEventListener('pointerdown', e => {
                const marker = e.target.closest('[data-up="base-marker"]');
                if (!marker) return;
                e.preventDefault();
                el.map.setPointerCapture(e.pointerId);
                marker.classList.add('up-dragging');
                const s = computed.baseHsl.s < 5 ? 80 : computed.baseHsl.s;
                const onMove = ev => {
                    const rect = el.map.getBoundingClientRect();
                    const x = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    const y = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
                    setBase(hslToHex(Math.round(x * 360) % 360, s, Math.round((1 - y) * 100)));
                };
                const onUp = () => {
                    el.map.removeEventListener('pointermove', onMove);
                    el.map.removeEventListener('pointerup', onUp);
                    el.map.removeEventListener('pointercancel', onUp);
                };
                el.map.addEventListener('pointermove', onMove);
                el.map.addEventListener('pointerup', onUp);
                el.map.addEventListener('pointercancel', onUp);
            });

            /* --- 단축키 (대화상자 안에서만) --- */

            dialog.addEventListener('keydown', e => {
                if (e.key === 'Escape' && !el.picker.hidden) {
                    e.preventDefault();
                    togglePicker(false);
                    el.base.focus();
                    return;
                }
                if (e.ctrlKey || e.altKey || e.metaKey || isTypingTarget(e.target)) return;
                const key = e.key === '=' ? '+' : e.key;
                const hit = action => shortcuts[action].includes(key);
                // 범위 슬라이더는 화살표를 스스로 쓰므로 단축키를 넘기지 않는다
                const onRange = e.target && e.target.type === 'range';
                if (!onRange && hit('increaseCount')) { e.preventDefault(); adjust('count', 1); return; }
                if (!onRange && hit('decreaseCount')) { e.preventDefault(); adjust('count', -1); return; }
                if (hit('increaseLightSteps')) { e.preventDefault(); adjust('steps', 1); return; }
                if (hit('decreaseLightSteps')) { e.preventDefault(); adjust('steps', -1); return; }
                const method = METHODS.find(m => m.key === key.toLowerCase());
                if (method && key.length === 1) { e.preventDefault(); setMethod(method.id); }
            });

            /* --- 끝내기 --- */

            dialog.querySelectorAll('[data-up="cancel"]').forEach(btn => btn.addEventListener('click', () => finish(null)));
            dialog.addEventListener('cancel', e => {
                // Esc: 피커가 열려 있으면 위의 keydown이 피커만 닫는다
                if (!el.picker.hidden) { e.preventDefault(); return; }
                e.preventDefault();
                finish(null);
            });
            dialog.querySelector('form').addEventListener('submit', e => {
                e.preventDefault();
                if (computed && el.error.hidden) finish(shapeResult(computed, state.shape));
            });
            dialog.addEventListener('click', e => {
                if (e.target === dialog) finish(null);   // 바깥(배경) 누르기
            });
            $('copy').addEventListener('click', () => {
                if (!computed) return;
                const result = shapeResult(computed, state.shape);
                const code = 'const colorPalette = ' + JSON.stringify(result, null, 2) + ';';
                copyText(code).then(() => showStatus(t('codeCopied')), () => showStatus(t('copyFailed')));
            });
            $('retry').addEventListener('click', () => {
                Object.assign(state, {
                    base: DEFAULTS.base, count: DEFAULTS.count, steps: DEFAULTS.steps,
                    method: DEFAULTS.method, lightMin: DEFAULTS.lightMin, lightMax: DEFAULTS.lightMax
                });
                previousMethod = state.method;
                render();
            });

            openInstance = { dialog, cancel: () => finish(null) };
            try {
                drawMapCanvas(el.map.querySelector('canvas'));
            } catch (err) {
                console.error('UniPalette: 분포 맵 배경을 그리지 못했습니다.', err);
            }
            render();
            dialog.showModal();
            $('confirm').focus();
        });
    }

    /** 열려 있는 대화상자를 닫는다(취소와 같음, pick은 null로 끝난다) */
    function close() {
        if (openInstance) openInstance.cancel();
    }

    global.UniPalette = Object.freeze({
        pick,
        extract,
        close,
        get isOpen() { return openInstance !== null; },
        methods: Object.freeze(METHODS.map(m => Object.freeze({ id: m.id, key: m.key }))),
        methodLabel: (id, lang) => methodLabel(id, lang),
        languages: Object.freeze(Object.keys(STRINGS).map(code => Object.freeze({ code, name: STRINGS[code].name }))),
        resolveLang,
        defaults: Object.freeze(Object.assign({}, DEFAULTS)),
        storageKey: STORAGE_KEY
    });
})(window);
