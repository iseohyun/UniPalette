/**
 * @fileoverview UniPalette 색공간 변환 및 인지 균일 색상 추출 알고리즘 모듈
 * - 지원 색공간: sRGB, HSL, HSV, CIE L*a*b* (D65), Oklab
 * - 지원 알고리즘: 선형(Linear), 상대 휘도 적응형(HSL Adapt), MacAdam Ellipse,
 *   복합 보정(HSL+MacAdam), Oklab 인지 등간격, CIEDE2000 색차 탐색, 고정 프리셋(PPT/Rainbow/Google)
 */

/**
 * HEX 색상 문자열을 정규화된 [0, 1] 범위의 RGB 채널 값으로 파싱합니다.
 * @param {string} hex - '#RRGGBB' 또는 '#RGB' 형식의 색상 문자열
 * @returns {{ r: number, g: number, b: number }} [0, 1] 범위의 RGB 객체
 */
function parseHexToNormalizedRgb(hex) {
    let clean = String(hex).trim().replace(/^#/, '');
    if (clean.length === 3) {
        clean = clean.split('').map(ch => ch + ch).join('');
    }
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    return {
        r: Number.isFinite(r) ? r : 0,
        g: Number.isFinite(g) ? g : 0,
        b: Number.isFinite(b) ? b : 0
    };
}

/**
 * sRGB 채널 값([0, 1])을 선형 빛 강도(Linear RGB)로 감마 역보정합니다 (IEC 61966-2-1 표준).
 * @param {number} channel - [0, 1] 범위의 sRGB 채널 값
 * @returns {number} 선형화된 채널 값
 */
function srgbChannelToLinear(channel) {
    return (channel <= 0.04045)
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4);
}

/**
 * 선형 RGB 채널 값([0, 1])을 sRGB 감마 공간으로 변환합니다.
 * @param {number} linearChannel - [0, 1] 범위의 선형 채널 값
 * @returns {number} 감마 보정된 sRGB 채널 값
 */
function linearChannelToSrgb(linearChannel) {
    const clamped = Math.max(0, Math.min(1, linearChannel));
    return (clamped <= 0.0031308)
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/**
 * [0, 255] 범위의 RGB 정수 값을 '#RRGGBB' 대문자 HEX 문자열로 변환합니다.
 * @param {number} r - Red (0~255)
 * @param {number} g - Green (0~255)
 * @param {number} b - Blue (0~255)
 * @returns {string} '#RRGGBB' 형식 문자열
 */
function rgbBytesToHex(r, g, b) {
    const toHex = x => {
        const clamped = Math.max(0, Math.min(255, Math.round(x)));
        const hex = clamped.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * sRGB HEX 색상을 Oklab 색공간 좌표로 정밀 변환합니다.
 * @param {string} hex - 기준 색상 HEX
 * @returns {{ L: number, a: number, b: number }} Oklab 좌표
 */
function srgbToOklab(hex) {
    const { r, g, b } = parseHexToNormalizedRgb(hex);
    const rL = srgbChannelToLinear(r);
    const gL = srgbChannelToLinear(g);
    const bL = srgbChannelToLinear(b);

    const lmsL = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
    const lmsM = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
    const lmsS = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;

    const lCubeRoot = Math.cbrt(lmsL);
    const mCubeRoot = Math.cbrt(lmsM);
    const sCubeRoot = Math.cbrt(lmsS);

    const L = 0.2104542553 * lCubeRoot + 0.7936177850 * mCubeRoot - 0.0040720468 * sCubeRoot;
    const a = 1.9779984951 * lCubeRoot - 2.4285922050 * mCubeRoot + 0.4505937099 * sCubeRoot;
    const bLab = 0.0259040371 * lCubeRoot + 0.7827717662 * mCubeRoot - 0.8086757660 * sCubeRoot;

    return { L, a, b: bLab };
}

/**
 * Oklab 색공간 좌표를 sRGB HEX 색상으로 역변환합니다.
 * @param {number} L - Oklab Lightness
 * @param {number} a - Oklab a축
 * @param {number} b - Oklab b축
 * @returns {string} '#RRGGBB' 형식 HEX 문자열
 */
function oklabToHex(L, a, b) {
    const lCubeRoot = L + 0.3963377774 * a + 0.2158037573 * b;
    const mCubeRoot = L - 0.1055613458 * a - 0.0638541728 * b;
    const sCubeRoot = L - 0.0894841775 * a - 1.2914855480 * b;

    const lmsL = Math.pow(lCubeRoot, 3);
    const lmsM = Math.pow(mCubeRoot, 3);
    const lmsS = Math.pow(sCubeRoot, 3);

    const rL = 4.0767416621 * lmsL - 3.3077115913 * lmsM + 0.2309699292 * lmsS;
    const gL = -1.2684380046 * lmsL + 2.6097574011 * lmsM - 0.3413193965 * lmsS;
    const bL = -0.0041960863 * lmsL - 0.7034186147 * lmsM + 1.7076147010 * lmsS;

    const r = linearChannelToSrgb(rL) * 255;
    const g = linearChannelToSrgb(gL) * 255;
    const bByte = linearChannelToSrgb(bL) * 255;

    return rgbBytesToHex(r, g, bByte);
}

/**
 * sRGB HEX 색상을 CIE L*a*b* (D65 표준 백색점) 좌표로 변환합니다.
 * @param {string} hex - 기준 색상 HEX
 * @returns {{ L: number, a: number, b: number }} CIE L*a*b* 좌표
 */
function srgbToLab(hex) {
    const { r, g, b } = parseHexToNormalizedRgb(hex);
    const rL = srgbChannelToLinear(r);
    const gL = srgbChannelToLinear(g);
    const bL = srgbChannelToLinear(b);

    // D65 Standard White Point mapping
    const x = (0.4124 * rL + 0.3576 * gL + 0.1805 * bL) / 0.95047;
    const y = (0.2126 * rL + 0.7152 * gL + 0.0722 * bL) / 1.00000;
    const z = (0.0193 * rL + 0.1192 * gL + 0.9505 * bL) / 1.08883;

    const f = t => (t > 0.008856) ? Math.cbrt(t) : (7.787 * t) + (16 / 116);
    const fx = f(x);
    const fy = f(y);
    const fz = f(z);

    const L = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const bLab = 200 * (fy - fz);

    return { L, a, b: bLab };
}

/**
 * 두 CIE L*a*b* 색상 간의 CIEDE2000 인지 색차(Delta E 2000)를 계산합니다.
 * @returns {number} CIEDE2000 색차 값
 */
function ciede2000(L1, a1, b1, L2, a2, b2) {
    const kL = 1, kC = 1, kH = 1;
    const deg2rad = Math.PI / 180;
    const rad2deg = 180 / Math.PI;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);

    const C_mean = (C1 + C2) / 2;
    const C_mean7 = Math.pow(C_mean, 7);
    const G = 0.5 * (1 - Math.sqrt(C_mean7 / (C_mean7 + 6103515625))); // 25^7

    const a1_prime = (1 + G) * a1;
    const a2_prime = (1 + G) * a2;

    const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
    const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);

    let h1_prime = Math.atan2(b1, a1_prime) * rad2deg;
    if (h1_prime < 0) h1_prime += 360;
    let h2_prime = Math.atan2(b2, a2_prime) * rad2deg;
    if (h2_prime < 0) h2_prime += 360;

    const dL_prime = L2 - L1;
    const dC_prime = C2_prime - C1_prime;

    let dh_prime = 0;
    if (C1_prime * C2_prime !== 0) {
        dh_prime = h2_prime - h1_prime;
        if (dh_prime > 180) dh_prime -= 360;
        else if (dh_prime < -180) dh_prime += 360;
    }

    const dH_prime = 2 * Math.sqrt(C1_prime * C2_prime) * Math.sin(dh_prime * deg2rad / 2);

    const L_prime_mean = (L1 + L2) / 2;
    const C_prime_mean = (C1_prime + C2_prime) / 2;

    let h_prime_mean = h1_prime + h2_prime;
    if (C1_prime * C2_prime !== 0) {
        if (Math.abs(h1_prime - h2_prime) > 180) {
            h_prime_mean = (h1_prime + h2_prime + 360) / 2;
        } else {
            h_prime_mean = (h1_prime + h2_prime) / 2;
        }
    }

    const T = 1 - 0.17 * Math.cos((h_prime_mean - 30) * deg2rad)
              + 0.24 * Math.cos(2 * h_prime_mean * deg2rad)
              + 0.32 * Math.cos((3 * h_prime_mean + 6) * deg2rad)
              - 0.20 * Math.cos((4 * h_prime_mean - 63) * deg2rad);

    const dTheta = 30 * Math.exp(-Math.pow((h_prime_mean - 275) / 25, 2));
    const C_prime_mean7 = Math.pow(C_prime_mean, 7);
    const RC = 2 * Math.sqrt(C_prime_mean7 / (C_prime_mean7 + 6103515625));

    const SL = 1 + (0.015 * Math.pow(L_prime_mean - 50, 2)) / Math.sqrt(20 + Math.pow(L_prime_mean - 50, 2));
    const SC = 1 + 0.045 * C_prime_mean;
    const SH = 1 + 0.015 * C_prime_mean * T;

    const RT = -Math.sin(2 * dTheta * deg2rad) * RC;

    return Math.sqrt(
        Math.pow(dL_prime / (kL * SL), 2) +
        Math.pow(dC_prime / (kC * SC), 2) +
        Math.pow(dH_prime / (kH * SH), 2) +
        RT * (dC_prime / (kC * SC)) * (dH_prime / (kH * SH))
    );
}

/**
 * HEX 색상을 HSL({ h: 0~360, s: 0~100, l: 0~100 })로 변환합니다.
 * @param {string} hex - '#RRGGBB' 형식 문자열
 * @returns {{ h: number, s: number, l: number }}
 */
function hexToHsl(hex) {
    const { r, g, b } = parseHexToNormalizedRgb(hex);

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360) % 360,
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

/**
 * HSL 좌표를 '#RRGGBB' HEX 문자열로 변환합니다.
 * @param {number} h - Hue (0~360)
 * @param {number} s - Saturation (0~100)
 * @param {number} l - Lightness (0~100)
 * @returns {string} '#RRGGBB'
 */
function hslToHex(h, s, l) {
    const normH = ((h % 360) + 360) % 360;
    const normS = Math.max(0, Math.min(100, s)) / 100;
    const normL = Math.max(0, Math.min(100, l)) / 100;

    const c = (1 - Math.abs(2 * normL - 1)) * normS;
    const x = c * (1 - Math.abs(((normH / 60) % 2) - 1));
    const m = normL - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= normH && normH < 60) { r = c; g = x; b = 0; }
    else if (60 <= normH && normH < 120) { r = x; g = c; b = 0; }
    else if (120 <= normH && normH < 180) { r = 0; g = c; b = x; }
    else if (180 <= normH && normH < 240) { r = 0; g = x; b = c; }
    else if (240 <= normH && normH < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return rgbBytesToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

/**
 * HSL 좌표를 2D 컬러 피커 매핑용 HSV({ h: 0~360, s: 0~1, v: 0~1 })로 변환합니다.
 * @param {number} h - Hue (0~360)
 * @param {number} s - Saturation (0~100)
 * @param {number} l - Lightness (0~100)
 * @returns {{ h: number, s: number, v: number }}
 */
function hslToHsv(h, s, l) {
    const sNorm = s / 100;
    const lNorm = l / 100;
    const v = lNorm + sNorm * Math.min(lNorm, 1 - lNorm);
    const sHsv = v === 0 ? 0 : 2 * (1 - lNorm / v);
    return { h, s: sHsv, v };
}

/**
 * HSV({ h: 0~360, s: 0~1, v: 0~1 }) 좌표를 HSL({ h: 0~360, s: 0~100, l: 0~100 })로 변환합니다.
 * @param {number} h - Hue (0~360)
 * @param {number} s - HSV Saturation (0~1)
 * @param {number} v - HSV Value (0~1)
 * @returns {{ h: number, s: number, l: number }}
 */
function hsvToHsl(h, s, v) {
    const l = v * (1 - s / 2);
    const sHsl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
    return {
        h,
        s: Math.round(sHsl * 100),
        l: Math.round(l * 100)
    };
}

/**
 * WCAG 2.x 표준에 따른 상대 휘도(Relative Luminance, 0~1)를 계산합니다.
 * @param {string} hex - '#RRGGBB' 형식 문자열
 * @returns {number} 상대 휘도 (0.0 ~ 1.0)
 */
function getRelativeLuminance(hex) {
    const { r, g, b } = parseHexToNormalizedRgb(hex);
    const R = srgbChannelToLinear(r);
    const G = srgbChannelToLinear(g);
    const B = srgbChannelToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * MacAdam Ellipse 비선형 가중치 누적 테이블 (모듈 로드 시 1회 사전 계산)
 */
const MACADAM_TABLE = (() => {
    const steps = 360;
    const accumWeights = new Float64Array(steps);
    let sum = 0;
    for (let deg = 0; deg < steps; deg++) {
        const w = 1.0 + 2.0 * Math.pow(Math.sin((deg - 30) * Math.PI / 180), 2);
        sum += w;
        accumWeights[deg] = sum;
    }
    return { steps, accumWeights, totalWeight: sum };
})();

/**
 * MacAdam Ellipse 비선형 가중치 기반 Hue 각도를 이진 탐색으로 산출합니다.
 * @param {number} baseH - 기준 Hue (0~360)
 * @param {number} i - 현재 색상 인덱스 (0 ~ count-1)
 * @param {number} count - 총 추출 색상 수
 * @returns {number} 보정된 Hue 각도 (0~359)
 */
function getMacAdamHue(baseH, i, count) {
    const { steps, accumWeights, totalWeight } = MACADAM_TABLE;
    const baseDeg = ((Math.round(baseH) % steps) + steps) % steps;
    const basePercentile = accumWeights[baseDeg] / totalWeight;

    let targetPercentile = (basePercentile + (i / count)) % 1.0;
    if (targetPercentile < 0) targetPercentile += 1.0;

    const targetWeightVal = targetPercentile * totalWeight;

    let low = 0;
    let high = steps - 1;
    let bestDeg = 0;
    let minDiff = Infinity;

    while (low <= high) {
        const mid = (low + high) >> 1;
        const diff = accumWeights[mid] - targetWeightVal;
        const absDiff = Math.abs(diff);
        if (absDiff < minDiff) {
            minDiff = absDiff;
            bestDeg = mid;
        }
        if (diff < 0) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }
    return bestDeg;
}

// 고정 프리셋 팔레트 상수 정의
const PPT_HEX_LIST = ["#0E2841", "#156082", "#E97132", "#196B24", "#0F9ED5", "#A02B93", "#4EA72E"];
const RAINBOW_HEX_LIST = ["#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"];
const GOOGLE_HEX_LIST = [
    "#AD1457", "#D81B60", "#E67C73", "#D50000", "#F4511E", "#EF6C00", "#F09300", "#F6BF26",
    "#E4C441", "#C0CA33", "#7CB342", "#0B8043", "#33B679", "#009688", "#039BE5", "#4285F4",
    "#7986CB", "#3F51B5", "#B39DDB", "#9E69AF", "#8E24AA", "#795548", "#616161", "#A79B8E"
];

function buildPresetColors(hexList, cols) {
    return hexList.map((hex, index) => {
        const upperHex = hex.toUpperCase();
        const hsl = hexToHsl(upperHex);
        return {
            hex: upperHex,
            h: hsl.h,
            s: hsl.s,
            l: hsl.l,
            stepIndex: Math.floor(index / cols)
        };
    });
}

function extractPptColors() {
    return buildPresetColors(PPT_HEX_LIST, 7);
}

function extractRainbowColors() {
    return buildPresetColors(RAINBOW_HEX_LIST, 10);
}

function extractGoogleColors(lightSteps) {
    const clampedSteps = Math.max(1, Math.min(3, lightSteps || 3));
    return buildPresetColors(GOOGLE_HEX_LIST.slice(0, clampedSteps * 8), 8);
}

/**
 * 명암 단계 인덱스에 따른 목표 명도(targetL)를 계산합니다.
 */
function computeStepTargetL(baseL, minL, maxL, j, lightSteps) {
    if (lightSteps > 1) {
        return Math.round(minL + (maxL - minL) * (j / (lightSteps - 1)));
    }
    return Math.max(minL, Math.min(maxL, baseL));
}

/**
 * CIEDE2000 고인지 색차 탐색 알고리즘
 */
function extractCiedeColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps) {
    const colors = [];
    const baseLab = srgbToLab(baseHex);

    for (let j = 0; j < lightSteps; j++) {
        const targetL = computeStepTargetL(baseL, minL, maxL, j, lightSteps);

        for (let i = 0; i < count; i++) {
            if (i === 0) {
                if (Math.abs(targetL - baseL) < 0.1) {
                    colors.push({ hex: baseHex, h: baseH, s: baseS, l: baseL, stepIndex: j });
                } else {
                    const hex = hslToHex(baseH, baseS, targetL);
                    colors.push({ hex, h: baseH, s: baseS, l: targetL, stepIndex: j });
                }
            } else {
                const h = Math.round(baseH + (i * (360 / count))) % 360;
                const targetDeltaE = 6 + (j / Math.max(1, lightSteps - 1)) * 74;

                let bestL = targetL;
                let minDiff = Infinity;

                for (let testL = minL; testL <= maxL; testL++) {
                    const testHex = hslToHex(h, baseS, testL);
                    const testLab = srgbToLab(testHex);
                    const diffE = ciede2000(baseLab.L, baseLab.a, baseLab.b, testLab.L, testLab.a, testLab.b);
                    const diff = Math.abs(diffE - targetDeltaE);

                    if (diff < minDiff) {
                        minDiff = diff;
                        bestL = testL;
                    }
                }

                const finalL = Math.max(minL, Math.min(maxL, bestL));
                const hex = hslToHex(h, baseS, finalL);
                colors.push({ hex, h, s: baseS, l: finalL, stepIndex: j });
            }
        }
    }
    return colors;
}

/**
 * Oklab 인지적 등간격 색상 추출 알고리즘
 */
function extractOklabColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps) {
    const colors = [];
    const baseOk = srgbToOklab(baseHex);
    const baseChroma = Math.sqrt(baseOk.a * baseOk.a + baseOk.b * baseOk.b);
    const baseHueAngle = Math.atan2(baseOk.b, baseOk.a);

    for (let j = 0; j < lightSteps; j++) {
        const targetL = computeStepTargetL(baseL, minL, maxL, j, lightSteps);

        for (let i = 0; i < count; i++) {
            if (i === 0 && Math.abs(targetL - baseL) < 0.1) {
                colors.push({ hex: baseHex, h: baseH, s: baseS, l: baseL, stepIndex: j });
                continue;
            }

            const theta = i * (360 / count) * Math.PI / 180;

            let L_ok;
            if (targetL === baseL) {
                L_ok = baseOk.L;
            } else if (targetL < baseL) {
                L_ok = baseL > 0 ? (targetL / baseL) * baseOk.L : 0;
            } else {
                L_ok = baseL < 100 ? baseOk.L + ((targetL - baseL) / (100 - baseL)) * (1 - baseOk.L) : 1;
            }

            const a_ok = baseChroma * Math.cos(baseHueAngle + theta);
            const b_ok = baseChroma * Math.sin(baseHueAngle + theta);

            const hex = oklabToHex(L_ok, a_ok, b_ok);
            const hsl = hexToHsl(hex);

            const finalL = Math.max(minL, Math.min(maxL, hsl.l));
            const finalHex = hslToHex(hsl.h, hsl.s, finalL);

            colors.push({ hex: finalHex, h: hsl.h, s: hsl.s, l: finalL, stepIndex: j });
        }
    }
    return colors;
}

/**
 * HSL 기반 색상 추출 알고리즘 (선형, 휘도 보정, 색상 보정, 휘도 색상 보정)
 */
function extractHslColors(baseH, baseS, baseL, baseHex, count, method, minL, maxL, lightSteps) {
    const colors = [];
    const isMacadam = (method === 'macadam' || method === 'hslMacadam');
    const isAdapt = (method === 'hslAdapt' || method === 'hslMacadam');

    for (let j = 0; j < lightSteps; j++) {
        const targetL = computeStepTargetL(baseL, minL, maxL, j, lightSteps);
        const targetLuminance = isAdapt ? getRelativeLuminance(hslToHex(baseH, baseS, targetL)) : 0;

        for (let i = 0; i < count; i++) {
            // 기준 색상(1번 색상)이 목표 명도와 일치할 때 반올림 오차 없이 원본 baseHex 보존
            if (i === 0 && Math.abs(targetL - baseL) < 0.1) {
                colors.push({ hex: baseHex, h: baseH, s: baseS, l: baseL, stepIndex: j });
                continue;
            }

            const h = isMacadam
                ? getMacAdamHue(baseH, i, count)
                : Math.round(baseH + (i * (360 / count))) % 360;

            let finalL = Math.max(minL, Math.min(maxL, targetL));

            if (isAdapt) {
                let bestL = targetL;
                let minDiff = Infinity;

                for (let testL = minL; testL <= maxL; testL++) {
                    const testHex = hslToHex(h, baseS, testL);
                    const testLuminance = getRelativeLuminance(testHex);
                    const diff = Math.abs(testLuminance - targetLuminance);

                    if (diff < minDiff) {
                        minDiff = diff;
                        bestL = testL;
                    }
                }
                finalL = Math.max(minL, Math.min(maxL, bestL));
            }

            const hex = hslToHex(h, baseS, finalL);
            colors.push({ hex, h, s: baseS, l: finalL, stepIndex: j });
        }
    }
    return colors;
}

/**
 * 선택된 추출 알고리즘에 따라 색상 팔레트 배열을 생성합니다.
 * @returns {Array<{ hex: string, h: number, s: number, l: number, stepIndex: number }>}
 */
function extractColors(baseH, baseS, baseL, baseHex, count, method, minL, maxL, lightSteps) {
    if (method === 'ppt') return extractPptColors();
    if (method === 'rainbow') return extractRainbowColors();
    if (method === 'google') return extractGoogleColors(lightSteps);
    if (method === 'ciede') return extractCiedeColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps);
    if (method === 'oklab') return extractOklabColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps);
    return extractHslColors(baseH, baseS, baseL, baseHex, count, method, minL, maxL, lightSteps);
}
