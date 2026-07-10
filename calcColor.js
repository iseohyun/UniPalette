// sRGB -> Oklab 정밀 변환
function srgbToOklab(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(s => s + s).join('');
    }
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const toLinear = c => (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    let rL = toLinear(r);
    let gL = toLinear(g);
    let bL = toLinear(b);
    
    let l = 0.4122214708 * rL + 0.5363325363 * gL + 0.0514459929 * bL;
    let m = 0.2119034982 * rL + 0.6806995451 * gL + 0.1073969566 * bL;
    let s = 0.0883024619 * rL + 0.2817188376 * gL + 0.6299787005 * bL;
    
    let l_ = Math.cbrt(l);
    let m_ = Math.cbrt(m);
    let s_ = Math.cbrt(s);
    
    let L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
    let a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
    let b_ = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;
    
    return { L, a, b: b_ };
}

// Oklab -> sRGB -> HEX 정밀 역변환
function oklabToHex(L, a, b) {
    let l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    let m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    let s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    
    let l = Math.pow(l_, 3);
    let m = Math.pow(m_, 3);
    let s = Math.pow(s_, 3);
    
    let rL = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    let gL = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    let bL = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
    
    rL = Math.max(0, Math.min(1, rL));
    gL = Math.max(0, Math.min(1, gL));
    bL = Math.max(0, Math.min(1, bL));
    
    const toGamma = c => (c <= 0.0031308) ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    let r = Math.round(toGamma(rL) * 255);
    let g = Math.round(toGamma(gL) * 255);
    let b_ = Math.round(toGamma(bL) * 255);
    
    const toHex = x => {
        let hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b_)}`.toUpperCase();
}

// HEX -> CIE L*a*b* 정밀 변환 (CIEDE2000 색차 대조용)
function srgbToLab(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(s => s + s).join('');
    }
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    
    const toLinear = c => (c <= 0.04045) ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    let rL = toLinear(r);
    let gL = toLinear(g);
    let bL = toLinear(b);
    
    // D65 Standard White Point mapping
    let x = 0.4124 * rL + 0.3576 * gL + 0.1805 * bL;
    let y = 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
    let z = 0.0193 * rL + 0.1192 * gL + 0.9505 * bL;
    
    x /= 0.95047;
    y /= 1.00000;
    z /= 1.08883;
    
    const f = t => (t > 0.008856) ? Math.pow(t, 1/3) : (7.787 * t) + (16/116);
    
    let L = (116 * f(y)) - 16;
    let a = 500 * (f(x) - f(y));
    let b_ = 200 * (f(y) - f(z));
    
    return { L, a, b: b_ };
}

// CIEDE2000 색차 연산 수식
function ciede2000(L1, a1, b1, L2, a2, b2) {
    const kL = 1, kC = 1, kH = 1;
    const deg2rad = Math.PI / 180;
    const rad2deg = 180 / Math.PI;
    
    const C1 = Math.sqrt(a1*a1 + b1*b1);
    const C2 = Math.sqrt(a2*a2 + b2*b2);
    
    const C_mean = (C1 + C2) / 2;
    const C_mean7 = Math.pow(C_mean, 7);
    const G = 0.5 * (1 - Math.sqrt(C_mean7 / (C_mean7 + 6103515625))); // 25^7
    
    const a1_prime = (1 + G) * a1;
    const a2_prime = (1 + G) * a2;
    
    const C1_prime = Math.sqrt(a1_prime*a1_prime + b1*b1);
    const C2_prime = Math.sqrt(a2_prime*a2_prime + b2*b2);
    
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
    
    const dE = Math.sqrt(
        Math.pow(dL_prime / (kL * SL), 2) +
        Math.pow(dC_prime / (kC * SC), 2) +
        Math.pow(dH_prime / (kH * SH), 2) +
        RT * (dC_prime / (kC * SC)) * (dH_prime / (kH * SH))
    );
    
    return dE;
}

// HEX -> HSL 변환
function hexToHsl(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(s => s + s).join('');
    }
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

// HSL -> HEX 변환
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

    const toHex = x => {
        let hex = Math.round((x + m) * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// 인지 휘도 계산
function getRelativeLuminance(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex.split('').map(s => s + s).join('');
    }
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    let R = (r <= 0.03928) ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    let G = (g <= 0.03928) ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    let B = (b <= 0.03928) ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// MacAdam Ellipse 비선형 가중치 기반 Hue 매핑
function getMacAdamHue(baseH, i, count) {
    const steps = 360;
    const weights = [];
    for (let deg = 0; deg < steps; deg++) {
        let w = 1.0 + 2.0 * Math.pow(Math.sin((deg - 30) * Math.PI / 180), 2);
        weights.push(w);
    }
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    
    const accumWeights = [];
    let sum = 0;
    for (let deg = 0; deg < steps; deg++) {
        sum += weights[deg];
        accumWeights.push(sum);
    }
    
    const baseDeg = Math.round(baseH) % 360;
    const basePercentile = accumWeights[baseDeg] / totalWeight;
    
    let targetPercentile = (basePercentile + (i / count)) % 1.0;
    if (targetPercentile < 0) targetPercentile += 1.0;
    
    const targetWeightVal = targetPercentile * totalWeight;
    
    let low = 0, high = steps - 1;
    let bestDeg = 0;
    let minDiff = Infinity;
    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        let diff = accumWeights[mid] - targetWeightVal;
        if (Math.abs(diff) < minDiff) {
            minDiff = Math.abs(diff);
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

// PPT 프리셋 색상 추출 (7x1)
function extractPptColors() {
    const colors = [];
    const hexList = ["#0E2841", "#156082", "#E97132", "#196B24", "#0F9ED5", "#A02B93", "#4EA72E"];
    const cols = 7;
    hexList.forEach((hex, index) => {
        let hsl = hexToHsl(hex);
        let j = Math.floor(index / cols);
        colors.push({ hex: hex.toUpperCase(), h: hsl.h, s: hsl.s, l: hsl.l, stepIndex: j });
    });
    return colors;
}

// 무지개색 프리셋 색상 추출 (10x1)
function extractRainbowColors() {
    const colors = [];
    const hexList = ["#C00000", "#FF0000", "#FFC000", "#FFFF00", "#92D050", "#00B050", "#00B0F0", "#0070C0", "#002060", "#7030A0"];
    const cols = 10;
    hexList.forEach((hex, index) => {
        let hsl = hexToHsl(hex);
        let j = Math.floor(index / cols);
        colors.push({ hex: hex.toUpperCase(), h: hsl.h, s: hsl.s, l: hsl.l, stepIndex: j });
    });
    return colors;
}

// 구글색 프리셋 색상 추출 (8x3)
function extractGoogleColors(lightSteps) {
    const colors = [];
    const googleHexes = [
        "#AD1457", "#D81B60", "#E67C73", "#D50000", "#F4511E", "#EF6C00", "#F09300", "#F6BF26",
        "#E4C441", "#C0CA33", "#7CB342", "#0B8043", "#33B679", "#009688", "#039BE5", "#4285F4",
        "#7986CB", "#3F51B5", "#B39DDB", "#9E69AF", "#8E24AA", "#795548", "#616161", "#A79B8E"
    ];
    const cols = 8;
    const activeHexes = googleHexes.slice(0, lightSteps * 8);
    activeHexes.forEach((hex, index) => {
        let hsl = hexToHsl(hex);
        let j = Math.floor(index / cols);
        colors.push({ hex: hex.toUpperCase(), h: hsl.h, s: hsl.s, l: hsl.l, stepIndex: j });
    });
    return colors;
}

// CIEDE2000 고인지 색차 탐색 알고리즘
function extractCiedeColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps) {
    const colors = [];
    const baseLab = srgbToLab(baseHex);
    
    for (let j = 0; j < lightSteps; j++) {
        let targetL = baseL;
        if (lightSteps > 1) {
            targetL = Math.round(minL + (maxL - minL) * (j / (lightSteps - 1)));
        } else {
            targetL = Math.max(minL, Math.min(maxL, baseL));
        }
        
        for (let i = 0; i < count; i++) {
            if (i === 0) {
                // 기준 색상과 동일 Hue(baseH)에 대한 처리:
                // 기준색상이 1번 색상이 되도록, targetL이 baseL과 같을 때(또는 오차 내) baseHex를 그대로 반환
                let hex = hslToHex(baseH, baseS, targetL);
                if (Math.abs(targetL - baseL) < 0.1) {
                    colors.push({ hex: baseHex, h: baseH, s: baseS, l: baseL, stepIndex: j });
                } else {
                    colors.push({ hex, h: baseH, s: baseS, l: targetL, stepIndex: j });
                }
            } else {
                let h = (baseH + (i * (360 / count))) % 360;
                // j에 비례하여 인지적 타겟 색차 범위를 6 ~ 80 사이로 점진적 분배
                const targetDeltaE = 6 + (j / Math.max(1, lightSteps - 1)) * 74;
                
                let bestL = targetL;
                let minDiff = Infinity;
                
                for (let testL = minL; testL <= maxL; testL++) {
                    let testHex = hslToHex(h, baseS, testL);
                    let testLab = srgbToLab(testHex);
                    let diffE = ciede2000(baseLab.L, baseLab.a, baseLab.b, testLab.L, testLab.a, testLab.b);
                    let diff = Math.abs(diffE - targetDeltaE);
                    
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestL = testL;
                    }
                }
                
                let finalL = Math.max(minL, Math.min(maxL, bestL));
                let hex = hslToHex(h, baseS, finalL);
                colors.push({ hex, h, s: baseS, l: finalL, stepIndex: j });
            }
        }
    }
    return colors;
}

// Oklab 인지적 등간격 색상 추출 알고리즘
function extractOklabColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps) {
    const colors = [];
    const baseOk = srgbToOklab(baseHex);
    const baseChroma = Math.sqrt(baseOk.a * baseOk.a + baseOk.b * baseOk.b);
    const baseHueAngle = Math.atan2(baseOk.b, baseOk.a);
    
    for (let j = 0; j < lightSteps; j++) {
        let targetL = baseL;
        if (lightSteps > 1) {
            targetL = Math.round(minL + (maxL - minL) * (j / (lightSteps - 1)));
        } else {
            targetL = Math.max(minL, Math.min(maxL, baseL));
        }
        
        for (let i = 0; i < count; i++) {
            let theta = i * (360 / count) * Math.PI / 180;
            
            // HSL 명도 targetL을 Oklab 명도로 변환 시 Piecewise linear interpolation 사용
            // targetL이 baseL일 때 정확히 baseOk.L을 지나게 매핑하여 기준색상 왜곡 방지
            let L_ok;
            if (targetL === baseL) {
                L_ok = baseOk.L;
            } else if (targetL < baseL) {
                L_ok = baseL > 0 ? (targetL / baseL) * baseOk.L : 0;
            } else {
                L_ok = baseL < 100 ? baseOk.L + ((targetL - baseL) / (100 - baseL)) * (1 - baseOk.L) : 1;
            }
            
            let a_ok = baseChroma * Math.cos(baseHueAngle + theta);
            let b_ok = baseChroma * Math.sin(baseHueAngle + theta);
            
            let hex = oklabToHex(L_ok, a_ok, b_ok);
            let hsl = hexToHsl(hex);
            
            let finalL = Math.max(minL, Math.min(maxL, hsl.l));
            let finalHex = hslToHex(hsl.h, hsl.s, finalL);
            
            // 기준 색상(i === 0 이고 명도가 baseL과 오차 0.1 이내일 때)은 정확히 baseHex가 되도록 강제
            if (i === 0 && Math.abs(targetL - baseL) < 0.1) {
                colors.push({ hex: baseHex, h: baseH, s: baseS, l: baseL, stepIndex: j });
            } else {
                colors.push({ hex: finalHex, h: hsl.h, s: hsl.s, l: finalL, stepIndex: j });
            }
        }
    }
    return colors;
}

// HSL 기반 색상 추출 알고리즘 (선형, 휘도 보정, 색상 보정, 휘도 색상 보정)
function extractHslColors(baseH, baseS, baseL, count, method, minL, maxL, lightSteps) {
    const colors = [];
    const isMacadam = (method === 'macadam' || method === 'hslMacadam');
    const isAdapt = (method === 'hslAdapt' || method === 'hslMacadam');
    
    for (let j = 0; j < lightSteps; j++) {
        let targetL = baseL;
        if (lightSteps > 1) {
            targetL = Math.round(minL + (maxL - minL) * (j / (lightSteps - 1)));
        } else {
            targetL = Math.max(minL, Math.min(maxL, baseL));
        }
        
        for (let i = 0; i < count; i++) {
            let h = baseH;
            if (isMacadam) {
                h = getMacAdamHue(baseH, i, count);
            } else {
                h = (baseH + (i * (360 / count))) % 360;
            }
            
            let finalL = targetL;
            
            if (isAdapt) {
                let targetHex = hslToHex(baseH, baseS, targetL);
                let targetLuminance = getRelativeLuminance(targetHex);
                
                let bestL = targetL;
                let minDiff = Infinity;
                
                for (let testL = minL; testL <= maxL; testL++) {
                    let testHex = hslToHex(h, baseS, testL);
                    let testLuminance = getRelativeLuminance(testHex);
                    let diff = Math.abs(testLuminance - targetLuminance);
                    
                    if (diff < minDiff) {
                        minDiff = diff;
                        bestL = testL;
                    }
                }
                finalL = Math.max(minL, Math.min(maxL, bestL));
            } else {
                finalL = Math.max(minL, Math.min(maxL, targetL));
            }
            
            let hex = hslToHex(h, baseS, finalL);
            colors.push({ hex, h, s: baseS, l: finalL, stepIndex: j });
        }
    }
    return colors;
}

function extractColors(baseH, baseS, baseL, baseHex, count, method, minL, maxL, lightSteps) {
    if (method === 'ppt') return extractPptColors();
    if (method === 'rainbow') return extractRainbowColors();
    if (method === 'google') return extractGoogleColors(lightSteps);
    if (method === 'ciede') return extractCiedeColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps);
    if (method === 'oklab') return extractOklabColors(baseH, baseS, baseL, baseHex, count, minL, maxL, lightSteps);
    return extractHslColors(baseH, baseS, baseL, count, method, minL, maxL, lightSteps);
}