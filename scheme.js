/**
 * @fileoverview UniPalette 견본 화면의 배색 (window.Scheme)
 * - 배색은 색상환에서 서로 떨어진 색 5개(이상)를 역할로 나눠 쓴다. 명암 단계가 아니라 색의 거리로 고른다.
 *     primary    테마색 — 팔레트의 첫 색(기준 색). 바탕·패널·테두리·글자는 이 색조에서 채도와 명도를 바꿔 만든다
 *     highlight  하이라이트색 — 테마색에서 색상환으로 가장 먼 색(반대색). 알림, 단축키 배지, 인자 이름
 *     sub1~3     서브 테마색 — 남은 색을 테마색에서 가까운 순서로. 소제목·코드 상자, 타입 글자, 초점 테두리
 *     interface  버튼·인터페이스색 — 서브 1·2·3 중 하나(사용자가 고름). 단추, 선택 표시, 체크 칸
 * - 기본 배색 4종도 같은 역할로 정의하고 같은 계산을 거친다.
 * - 글자 대비는 WCAG AA(본문 4.5:1, 흐린 글자 3:1)에 못 미치면 명도를 고쳐 맞춘다.
 * 의존: calcColor.js(hexToHsl, hslToHex, getRelativeLuminance), unipalette.js(UniPalette.extract)
 */

(function (global) {
    'use strict';

    const ROLES = ['primary', 'sub1', 'sub2', 'sub3', 'highlight'];
    const MIN_COLORS = ROLES.length;
    const INTERFACE_CHOICES = ['sub1', 'sub2', 'sub3'];

    const TOKENS = {
        bg: '--bg-color', panel: '--panel-bg', text: '--text-color', border: '--border-color',
        muted: '--muted-text', disabled: '--disabled-bg',
        primary: '--primary', sub: '--sub', subBg: '--sub-bg', sub2: '--sub2', sub3: '--sub3',
        accent: '--accent', accentHover: '--accent-hover', accentText: '--accent-text',
        highlight: '--highlight', highlightText: '--highlight-text', highlightInk: '--highlight-ink'
    };

    // 기본 배색: 역할의 색과 바탕 밝기 (서브는 테마색에서 가까운 순서)
    const PRESETS = {
        light: { dark: false, roles: { primary: '#6C757D', sub1: '#007BFF', sub2: '#6F42C1', sub3: '#20C997', highlight: '#FD7E14' } },
        dark: { dark: true, roles: { primary: '#6C757D', sub1: '#3D8BFD', sub2: '#9B7BDB', sub3: '#38D9A9', highlight: '#FFA94D' } },
        stone: { dark: false, roles: { primary: '#8A7F72', sub1: '#8A6D3B', sub2: '#6B8E6B', sub3: '#3B5B8A', highlight: '#C0563B' } },
        navy: { dark: true, roles: { primary: '#2A4A7A', sub1: '#4C9AFF', sub2: '#3F9FAF', sub3: '#7B6FD6', highlight: '#FFB347' } }
    };
    const PRESET_IDS = Object.keys(PRESETS);

    // 「내 배색」을 고를 때 대화상자에 넘기는 값: 서로 떨어진 색 5개 이상, 명암 1단계, 간단 보기
    const PICK_OPTIONS = { count: 5, minCount: MIN_COLORS, steps: 1, view: 'simple', storageKey: 'unipalette_scheme_pick_v2' };

    const TEXT_CONTRAST = 4.5;
    const MUTED_CONTRAST = 3;

    function hueDistance(a, b) {
        const d = Math.abs(hexToHsl(a).h - hexToHsl(b).h) % 360;
        return d > 180 ? 360 - d : d;
    }

    /**
     * 팔레트 안의 각 색에 역할을 붙인다. 돌려주는 값: { roles: {역할: hex}, byIndex: [역할 또는 ''] }
     * 0번이 테마색, 테마색에서 가장 먼 색이 하이라이트, 나머지는 가까운 순서로 서브 1·2·3(넘치는 색은 역할 없음).
     */
    function assignRoles(colors) {
        const byIndex = new Array(colors.length).fill('');
        const roles = { primary: colors[0] };
        byIndex[0] = 'primary';
        const rest = colors.map((hex, i) => ({ hex, i, d: hueDistance(colors[0], hex) })).slice(1);
        rest.sort((x, y) => x.d - y.d || x.i - y.i);
        const far = rest.pop();
        roles.highlight = far.hex;
        byIndex[far.i] = 'highlight';
        ['sub1', 'sub2', 'sub3'].forEach((role, k) => {
            roles[role] = rest[k].hex;
            byIndex[rest[k].i] = role;
        });
        return { roles, byIndex };
    }

    /** 대화상자의 칩 아래에 붙일 역할 이름(개수나 색이 바뀌면 다시 계산된다) */
    function roleLabels(hexes, names) {
        if (!hexes || hexes.length < MIN_COLORS) return null;
        return assignRoles(hexes).byIndex.map(role => (role ? names[role] : ''));
    }

    function contrast(a, b) {
        const la = getRelativeLuminance(a);
        const lb = getRelativeLuminance(b);
        return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
    }

    function isDarkColor(hex) {
        return getRelativeLuminance(hex) < 0.18;
    }

    function clamp(v, lo, hi) {
        return Math.max(lo, Math.min(hi, v));
    }

    function mix(a, b, t) {
        const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16));
        const pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
        return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    /** 같은 색조에서 채도 비율과 명도를 바꾼 색 */
    function tone(hex, satScale, satMin, satMax, lightness) {
        const hsl = hexToHsl(hex);
        return hslToHex(hsl.h, clamp(hsl.s * satScale, satMin, satMax), lightness);
    }

    /** 바탕과의 대비가 target이 될 때까지 글자의 명도를 바탕 반대쪽으로 민다 */
    function ensureContrast(fg, bg, target) {
        if (contrast(fg, bg) >= target) return { hex: fg, changed: false };
        const hsl = hexToHsl(fg);
        const step = isDarkColor(bg) ? 1 : -1;
        for (let l = hsl.l + step; l >= 0 && l <= 100; l += step) {
            const hex = hslToHex(hsl.h, hsl.s, l);
            if (contrast(hex, bg) >= target) return { hex, changed: true };
        }
        return { hex: step > 0 ? '#FFFFFF' : '#000000', changed: true };
    }

    function textOn(hex) {
        return contrast('#FFFFFF', hex) >= contrast('#000000', hex) ? '#FFFFFF' : '#000000';
    }

    /** 단추처럼 글자를 얹는 색은 명도를 35~62% 안으로 둔다(너무 밝거나 어두우면 바탕에 묻힌다) */
    function surfaceColor(hex) {
        const hsl = hexToHsl(hex);
        return hslToHex(hsl.h, hsl.s, clamp(hsl.l, 35, 62));
    }

    /**
     * 역할 색과 바탕 밝기, 인터페이스로 쓸 서브 번호로 화면 토큰을 만든다.
     * 테마색은 색조만 남기고 채도를 크게 낮춰 바탕·패널·테두리·글자를 만든다.
     */
    function buildFromRoles(roles, dark, interfaceRole) {
        const p = roles.primary;
        const ui = INTERFACE_CHOICES.includes(interfaceRole) ? interfaceRole : 'sub1';
        const c = dark ? {
            bg: tone(p, 0.45, 6, 40, 9),
            panel: tone(p, 0.45, 6, 40, 13),
            border: tone(p, 0.4, 6, 35, 26),
            disabled: tone(p, 0.4, 6, 35, 18),
            text: tone(p, 0.3, 4, 25, 93),
            muted: tone(p, 0.3, 4, 25, 70),
            subBg: tone(roles.sub1, 0.6, 10, 50, 17)
        } : {
            bg: tone(p, 0.45, 6, 40, 97),
            panel: tone(p, 0.35, 4, 30, 99.5),
            border: tone(p, 0.4, 6, 35, 86),
            disabled: tone(p, 0.4, 6, 35, 93),
            text: tone(p, 0.5, 6, 40, 13),
            muted: tone(p, 0.35, 6, 30, 40),
            subBg: tone(roles.sub1, 0.6, 10, 60, 95)
        };
        const text = ensureContrast(c.text, c.panel, TEXT_CONTRAST);
        const muted = ensureContrast(c.muted, c.panel, MUTED_CONTRAST);
        const highlightInk = ensureContrast(roles.highlight, c.panel, TEXT_CONTRAST);
        const accent = surfaceColor(roles[ui]);
        const highlight = surfaceColor(roles.highlight);
        const colors = Object.assign(c, {
            text: text.hex,
            muted: muted.hex,
            primary: ensureContrast(p, c.panel, MUTED_CONTRAST).hex,
            sub: ensureContrast(roles.sub1, c.panel, MUTED_CONTRAST).hex,
            sub2: ensureContrast(roles.sub2, c.panel, MUTED_CONTRAST).hex,
            sub3: ensureContrast(roles.sub3, c.panel, MUTED_CONTRAST).hex,
            accent,
            accentHover: mix(accent, dark ? '#FFFFFF' : '#000000', 0.18),
            accentText: textOn(accent),
            highlight,
            highlightText: textOn(highlight),
            highlightInk: highlightInk.hex
        });
        return {
            colors,
            roles: Object.assign({}, roles),
            interfaceRole: ui,
            dark,
            adjusted: text.changed || muted.changed || highlightInk.changed
        };
    }

    /** 팔레트(1차원 또는 [색상][단계])를 1차원 색 목록으로. 2차원이면 각 열의 가운데 단계를 쓴다 */
    function flatten(palette) {
        if (!Array.isArray(palette) || !palette.length) return [];
        return palette.map(item => (Array.isArray(item) ? item[Math.floor(item.length / 2)] : item));
    }

    /** UniPalette.pick이 돌려준 값으로 배색을 만든다. 5색보다 적으면 첫 색으로 5색을 다시 뽑는다 */
    function fromPalette(palette, dark, interfaceRole) {
        let colors = flatten(palette);
        if (colors.length < MIN_COLORS) {
            colors = UniPalette.extract({ base: colors[0] || '#E44D1B', count: MIN_COLORS, steps: 1, method: 'linear', remember: false });
        }
        return buildFromRoles(assignRoles(colors).roles, dark === true, interfaceRole);
    }

    function presetColors(id, interfaceRole) {
        const preset = PRESETS[id] || PRESETS.light;
        return buildFromRoles(preset.roles, preset.dark, interfaceRole);
    }

    /** :root에 토큰을 쓴다. 적용한 배색이 어두운지 돌려준다 */
    function apply(colors) {
        const root = document.documentElement;
        Object.keys(TOKENS).forEach(key => {
            if (colors[key]) root.style.setProperty(TOKENS[key], colors[key]);
        });
        const dark = isDarkColor(colors.bg);
        root.style.setProperty('color-scheme', dark ? 'dark' : 'light');
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', colors.primary);
        return dark;
    }

    global.Scheme = {
        ROLES,
        MIN_COLORS,
        INTERFACE_CHOICES,
        PRESETS,
        PRESET_IDS,
        PICK_OPTIONS,
        assignRoles,
        roleLabels,
        presetColors,
        fromPalette,
        apply,
        isDarkColor,
        contrast
    };
})(window);
