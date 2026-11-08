/**
 * @fileoverview UniPalette 메인 UI 컨트롤러 및 상태/이벤트 관리 모듈
 * - 2D HSV 컬러 피커, 더블 레인지 슬라이더, H-L 컬러 맵 캔버스 및 마커 드래그 제어
 * - 팔레트 카드 및 인접 대비 스트립 렌더링, 클립보드 내보내기, 모달 로더(file:// 폴백 지원)
 */

// 버전 정보는 version.js(SEMVER, CACHE_BUST_TAG, DISPLAY_VERSION)를 단일 진실 공급원(SSOT)으로 참조

// 고정 프리셋 규격 단일 진실 공급원(SSOT)
const PRESET_CONFIG = {
    ppt:     { count: 7,  defaultSteps: 1, fixedCount: true, fixedSteps: true },
    rainbow: { count: 10, defaultSteps: 1, fixedCount: true, fixedSteps: true },
    google:  { count: 8,  defaultSteps: 3, fixedCount: true, fixedSteps: false, maxSteps: 3 }
};

let currentExtractedColors = [];
let isDragging = false;
let isColorMapRendered = false;
let toastTimeoutId = null;
let lastUserLightSteps = 1;
let previousMethod = 'linear';

document.addEventListener('DOMContentLoaded', () => {
    const versionEl = document.getElementById('appVersion');
    if (versionEl && typeof DISPLAY_VERSION !== 'undefined') {
        versionEl.innerText = DISPLAY_VERSION;
    }

    const baseColor = document.getElementById('baseColor');
    const extractCount = document.getElementById('extractCount');
    const lightSteps = document.getElementById('lightSteps');
    const extractMethod = document.getElementById('extractMethod');
    const btnToggleDark = document.getElementById('btnToggleDark');

    if (lightSteps) {
        lastUserLightSteps = parseInt(lightSteps.value, 10) || 1;
    }
    if (extractMethod) {
        previousMethod = extractMethod.value;
    }

    initColorPicker();
    initDoubleSlider();
    initDragAndDrop();
    initExportButton();
    initHeaderModalButtons();

    if (btnToggleDark) {
        btnToggleDark.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('preview-dark');
            btnToggleDark.innerText = isDark ? '라이트모드' : '다크모드';
        });
    }

    if (extractCount) {
        extractCount.addEventListener('input', generatePalette);
        extractCount.addEventListener('change', generatePalette);
    }

    if (lightSteps) {
        const onStepsChange = () => {
            const method = extractMethod ? extractMethod.value : 'linear';
            if (!PRESET_CONFIG[method]) {
                lastUserLightSteps = Math.max(1, parseInt(lightSteps.value, 10) || 1);
            }
            generatePalette();
        };
        lightSteps.addEventListener('input', onStepsChange);
        lightSteps.addEventListener('change', onStepsChange);
    }

    if (extractMethod) {
        const onMethodChange = () => {
            handleMethodChange(extractMethod.value);
            generatePalette();
        };
        extractMethod.addEventListener('input', onMethodChange);
        extractMethod.addEventListener('change', onMethodChange);
    }

    if (baseColor) {
        updateBaseColorInputStyle(baseColor.value);
    }
    generatePalette();
});

/**
 * 헤더 모달(단축키, 설명서) 버튼 및 오버레이 닫기 이벤트를 바인딩합니다.
 */
function initHeaderModalButtons() {
    const btnShortcut = document.getElementById('btnShortcut');
    const btnHelp = document.getElementById('btnHelp');
    const modalOverlay = document.getElementById('commonModal');
    const modalContent = document.getElementById('modalContent');

    if (btnShortcut) {
        btnShortcut.addEventListener('click', () => {
            openModal('shortcut.html', 'tmpl-shortcut', () => {
                if (typeof initShortcutSettingsUI === 'function') {
                    initShortcutSettingsUI();
                }
            });
        });
    }

    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            openModal('help.html', 'tmpl-help');
        });
    }

    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }

    // 모달 내부 닫기 버튼 이벤트 위임 (인라인 onclick 의존성 완화)
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            if (e.target.closest('.modal-close-btn')) {
                closeModal();
            }
        });
    }
}

/**
 * 외부 HTML 조각을 로드하여 모달을 표시하며, file:// 환경 등 CORS 실패 시 내장 <template>으로 폴백합니다.
 * @param {string} url - 로드할 HTML 파일 경로
 * @param {string} fallbackTemplateId - CORS 실패 시 사용할 <template> 요소 ID
 * @param {Function} [callback] - 마운트 완료 후 실행할 콜백
 */
function openModal(url, fallbackTemplateId, callback) {
    const modalContent = document.getElementById('modalContent');
    const modalOverlay = document.getElementById('commonModal');
    if (!modalContent || !modalOverlay) return;

    const mountHtml = (html) => {
        modalContent.innerHTML = html;
        modalOverlay.classList.add('show');
        if (callback) callback();
    };

    const tryFallbackTemplate = () => {
        const tmpl = fallbackTemplateId ? document.getElementById(fallbackTemplateId) : null;
        if (tmpl && tmpl.innerHTML.trim()) {
            mountHtml(tmpl.innerHTML);
            return true;
        }
        return false;
    };

    // file:// 프로토콜에서는 브라우저가 fetch를 차단하므로 즉시 내장 템플릿 우선 사용
    if (window.location.protocol === 'file:' && tryFallbackTemplate()) {
        return;
    }

    const bustQuery = (typeof CACHE_BUST_TAG !== 'undefined') ? `?v=${CACHE_BUST_TAG}` : '';
    fetch(`${url}${bustQuery}`)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
        })
        .then(html => {
            mountHtml(html);
        })
        .catch(err => {
            if (!tryFallbackTemplate()) {
                console.error('모달 로드 에러:', err);
                showToast('콘텐츠를 불러오는 데 실패했습니다.');
            }
        });
}

window.closeModal = function() {
    const modalOverlay = document.getElementById('commonModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
    if (typeof cancelRecording === 'function') {
        cancelRecording();
    }
};

/**
 * 커스텀 2D HSV 컬러 피커의 채도-명도 캔버스를 렌더링합니다.
 * @param {number} hue - 현재 선택된 Hue 각도 (0~360)
 */
function drawPickerCanvas(hue) {
    const canvas = document.getElementById('pickerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);

    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, '#000000');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
}

/**
 * 커스텀 피커 캔버스 상의 마커 핀 위치를 동기화합니다.
 */
function updatePickerMarker(s_hsv, v_hsv) {
    const marker = document.getElementById('pickerMarker');
    const canvas = document.getElementById('pickerCanvas');
    if (!marker || !canvas) return;

    const x = Math.round(s_hsv * canvas.width);
    const y = Math.round((1 - v_hsv) * canvas.height);

    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
}

/**
 * 기준 색상 입력창, 숨겨진 컬러 인풋, 피커 미리보기 칩 및 텍스트를 일괄 갱신합니다.
 * @param {string} hex - '#RRGGBB' 형식 문자열
 */
function applyHexToBaseInputs(hex) {
    const baseColorInput = document.getElementById('baseColor');
    const hiddenPicker = document.getElementById('hiddenColorPicker');
    const previewChip = document.getElementById('pickerPreview');
    const hexText = document.getElementById('pickerHexText');

    if (baseColorInput) {
        baseColorInput.value = hex;
        updateBaseColorInputStyle(hex);
    }
    if (hiddenPicker) {
        hiddenPicker.value = hex;
    }
    if (previewChip) {
        previewChip.style.backgroundColor = hex;
    }
    if (hexText) {
        hexText.innerText = hex;
    }
}

/**
 * 커스텀 2D HSV 컬러 피커 및 스포이드/OS 네이티브 피커를 초기화합니다.
 */
function initColorPicker() {
    const baseColorInput = document.getElementById('baseColor');
    const customPicker = document.getElementById('customColorPicker');
    const hiddenPicker = document.getElementById('hiddenColorPicker');

    if (!baseColorInput || !customPicker || !hiddenPicker) return;

    const canvas = document.getElementById('pickerCanvas');
    const hueSlider = document.getElementById('pickerHue');
    const btnDropper = document.getElementById('btnDropper');
    const btnNative = document.getElementById('btnNativePicker');
    const btnClose = document.getElementById('btnClosePicker');

    let isMouseDown = false;

    const selectColorFromCoord = (e) => {
        if (!canvas || !hueSlider) return;
        const rect = canvas.getBoundingClientRect();
        const x = Math.max(0, Math.min(canvas.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(canvas.height, e.clientY - rect.top));

        const s_hsv = x / canvas.width;
        const v_hsv = 1 - (y / canvas.height);

        const hue = parseInt(hueSlider.value, 10) || 0;
        const hsl = hsvToHsl(hue, s_hsv, v_hsv);
        const hex = hslToHex(hsl.h, hsl.s, hsl.l);

        applyHexToBaseInputs(hex);
        updatePickerMarker(s_hsv, v_hsv);
        generatePalette();
    };

    if (canvas) {
        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            selectColorFromCoord(e);
        });
        document.addEventListener('mousemove', (e) => {
            if (isMouseDown) {
                selectColorFromCoord(e);
            }
        });
        document.addEventListener('mouseup', () => {
            isMouseDown = false;
        });
    }

    if (hueSlider) {
        const onHueChange = () => {
            const hue = parseInt(hueSlider.value, 10) || 0;
            drawPickerCanvas(hue);

            const marker = document.getElementById('pickerMarker');
            if (marker && canvas) {
                const x = parseFloat(marker.style.left) || 0;
                const y = parseFloat(marker.style.top) || 0;
                const s_hsv = x / canvas.width;
                const v_hsv = 1 - (y / canvas.height);

                const hsl = hsvToHsl(hue, s_hsv, v_hsv);
                const hex = hslToHex(hsl.h, hsl.s, hsl.l);
                applyHexToBaseInputs(hex);
                generatePalette();
            }
        };
        hueSlider.addEventListener('input', onHueChange);
        hueSlider.addEventListener('change', onHueChange);
    }

    if ('EyeDropper' in window && btnDropper) {
        btnDropper.style.display = 'flex';
        btnDropper.addEventListener('click', (e) => {
            e.stopPropagation();
            const eyeDropper = new EyeDropper();
            eyeDropper.open().then(result => {
                syncPickerWithHex(result.sRGBHex.toUpperCase());
            }).catch(() => {
                // 사용자가 스포이드를 취소한 경우 조용히 무시
            });
        });
    }

    if (btnNative) {
        btnNative.addEventListener('click', (e) => {
            e.stopPropagation();
            customPicker.style.display = 'none';
            hiddenPicker.click();
        });
    }

    const onNativePickerChange = (e) => {
        syncPickerWithHex(e.target.value.toUpperCase());
    };
    hiddenPicker.addEventListener('input', onNativePickerChange);
    hiddenPicker.addEventListener('change', onNativePickerChange);

    if (btnClose) {
        btnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            customPicker.style.display = 'none';
        });
    }

    baseColorInput.addEventListener('click', (e) => {
        e.stopPropagation();
        if (customPicker.style.display === 'none') {
            syncPickerWithHex(baseColorInput.value, false);
            customPicker.style.display = 'block';
        } else {
            customPicker.style.display = 'none';
        }
    });

    customPicker.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    document.addEventListener('click', (e) => {
        if (customPicker.style.display === 'block' && e.target !== baseColorInput && !customPicker.contains(e.target)) {
            customPicker.style.display = 'none';
        }
    });
}

/**
 * HEX 값에 기초해 커스텀 2D 피커 UI를 동기화합니다.
 * @param {string} hex - '#RRGGBB' 형식 문자열
 * @param {boolean} [triggerGenerate=true] - 팔레트 재생성 여부
 */
function syncPickerWithHex(hex, triggerGenerate = true) {
    const hueSlider = document.getElementById('pickerHue');
    applyHexToBaseInputs(hex);

    const hsl = hexToHsl(hex);
    const hsv = hslToHsv(hsl.h, hsl.s, hsl.l);

    if (hueSlider) {
        hueSlider.value = hsv.h;
    }
    drawPickerCanvas(hsv.h);
    updatePickerMarker(hsv.s, hsv.v);

    if (triggerGenerate) {
        generatePalette();
    }
}

/**
 * 명암 범위 커스텀 더블 슬라이더를 초기화합니다.
 */
function initDoubleSlider() {
    const minInput = document.getElementById('lightMin');
    const maxInput = document.getElementById('lightMax');
    const sliderRange = document.getElementById('sliderRange');
    const textSpan = document.getElementById('lightRangeVal');
    if (!minInput || !maxInput || !sliderRange) return;

    function updateSlider() {
        let minVal = parseInt(minInput.value, 10);
        let maxVal = parseInt(maxInput.value, 10);

        if (minVal > maxVal) {
            const temp = minVal;
            minVal = maxVal;
            maxVal = temp;
            minInput.value = minVal;
            maxInput.value = maxVal;
        }

        sliderRange.style.left = `${minVal}%`;
        sliderRange.style.width = `${maxVal - minVal}%`;

        if (textSpan) {
            textSpan.innerText = `${minVal}% ~ ${maxVal}%`;
        }

        updateLightnessGuide(minVal, maxVal);
    }

    minInput.addEventListener('input', () => {
        const minVal = parseInt(minInput.value, 10);
        const maxVal = parseInt(maxInput.value, 10);
        if (minVal > maxVal) {
            minInput.value = maxVal;
        }
        updateSlider();
        generatePalette();
    });

    maxInput.addEventListener('input', () => {
        const minVal = parseInt(minInput.value, 10);
        const maxVal = parseInt(maxInput.value, 10);
        if (maxVal < minVal) {
            maxInput.value = minVal;
        }
        updateSlider();
        generatePalette();
    });

    updateSlider();
}

/**
 * 2차원 H-L 컬러 맵 상의 기준 색상 마커 드래그 앤 드롭을 처리합니다.
 */
function initDragAndDrop() {
    const wrapper = document.getElementById('colormapWrapper');
    const markerContainer = document.getElementById('colormapMarkers');
    if (!wrapper || !markerContainer) return;

    markerContainer.addEventListener('mousedown', (e) => {
        const marker = e.target.closest('.base-marker');
        if (!marker) return;

        isDragging = true;
        e.preventDefault();

        function onMouseMove(moveEvent) {
            if (!isDragging) return;
            const rect = wrapper.getBoundingClientRect();

            const x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));

            const h = Math.round(x * 360) % 360;
            const l = Math.round((1 - y) * 100);

            const baseColorEl = document.getElementById('baseColor');
            const currentHsl = hexToHsl(baseColorEl.value);
            const s = currentHsl.s < 5 ? 80 : currentHsl.s;

            const newHex = hslToHex(h, s, l);
            applyHexToBaseInputs(newHex);

            const customPicker = document.getElementById('customColorPicker');
            if (customPicker && customPicker.style.display === 'block') {
                const hueSlider = document.getElementById('pickerHue');
                if (hueSlider) hueSlider.value = h;

                const hsv = hslToHsv(h, s, l);
                drawPickerCanvas(h);
                updatePickerMarker(hsv.s, hsv.v);
            }

            generatePaletteFromDrag(h, s, l, newHex);
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            generatePalette();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

function generatePaletteFromDrag(baseH, baseS, baseL, newHex) {
    const count = parseInt(document.getElementById('extractCount').value, 10);
    const lightSteps = parseInt(document.getElementById('lightSteps').value, 10) || 1;
    const method = document.getElementById('extractMethod').value;
    const minL = parseInt(document.getElementById('lightMin').value, 10);
    const maxL = parseInt(document.getElementById('lightMax').value, 10);

    const colors = extractColors(baseH, baseS, baseL, newHex, count, method, minL, maxL, lightSteps);
    currentExtractedColors = colors;

    renderPalette(colors);
    updateMarkerPositions({ h: baseH, s: baseS, l: baseL }, newHex, colors);
    renderContrastStrip(colors);
    updateLightnessGuide(minL, maxL);
    const satLabel = document.getElementById('colormapSatLabel');
    if (satLabel) {
        satLabel.innerText = `채도: ${baseS}%`;
    }
}

/**
 * 클립보드 복사 공통 유틸리티 (비보안 file:// 컨텍스트 대응 폴백 포함)
 * @param {string} text - 복사할 문자열
 * @param {string} successMessage - 복사 성공 시 표시할 토스트 메시지
 */
function copyTextWithFallback(text, successMessage) {
    const fallbackCopy = () => {
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textarea);
            showToast(ok ? successMessage : '복사에 실패했습니다.');
        } catch (err) {
            console.error('클립보드 폴백 복사 실패:', err);
            showToast('복사에 실패했습니다.');
        }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(text)
            .then(() => showToast(successMessage))
            .catch(() => fallbackCopy());
    } else {
        fallbackCopy();
    }
}

function initExportButton() {
    const exportBtn = document.getElementById('btnExportCode');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', () => {
        if (currentExtractedColors.length === 0) return;

        const hexList = currentExtractedColors.map(c => `"${c.hex}"`).join(', ');
        const codeString = `const colorPalette = [\n  ${hexList}\n];`;
        copyTextWithFallback(codeString, '클립보드에 복사되었습니다.');
    });
}

function showToast(message) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;

    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }

    toast.innerText = message;
    toast.classList.add('show');

    toastTimeoutId = setTimeout(() => {
        toast.classList.remove('show');
        toastTimeoutId = null;
    }, 1000);
}

function updateBaseColorInputStyle(hex) {
    const input = document.getElementById('baseColor');
    if (!input) return;

    let cleanHex = String(hex).trim();
    if (cleanHex && !cleanHex.startsWith('#')) {
        cleanHex = '#' + cleanHex;
    }

    if (/^#([0-9A-F]{3}){1,2}$/i.test(cleanHex)) {
        input.style.backgroundColor = cleanHex;
        const luminance = getRelativeLuminance(cleanHex);
        input.style.color = luminance > 0.179 ? '#000000' : '#FFFFFF';
        input.classList.remove('invalid-input');
    } else {
        input.style.backgroundColor = '';
        input.style.color = '';
        input.classList.add('invalid-input');
    }
}

/**
 * 추출 방법에 따라 추출 개수 및 명암 단계 입력창의 활성화/제약 상태를 갱신합니다.
 */
function updateInputsState(method) {
    const countInput = document.getElementById('extractCount');
    const stepsInput = document.getElementById('lightSteps');
    if (!countInput || !stepsInput) return;

    const preset = PRESET_CONFIG[method];

    if (preset && preset.fixedCount) {
        countInput.value = preset.count;
        countInput.disabled = true;
    } else {
        countInput.disabled = false;
    }

    if (preset && preset.fixedSteps) {
        stepsInput.value = preset.defaultSteps;
        stepsInput.disabled = true;
    } else {
        stepsInput.disabled = false;
        if (preset && preset.maxSteps) {
            stepsInput.max = preset.maxSteps;
            const val = parseInt(stepsInput.value, 10) || preset.defaultSteps;
            stepsInput.value = Math.max(1, Math.min(preset.maxSteps, val));
        } else {
            stepsInput.max = 10;
        }
    }
}

/**
 * 추출 방법 변경 시 사용자의 명암 단계 설정을 보존하면서 프리셋 전환을 처리합니다.
 */
function handleMethodChange(method) {
    const stepsInput = document.getElementById('lightSteps');
    if (!stepsInput) return;

    // 직전 모드가 일반 알고리즘이었으면 사용자가 설정한 명암 단계를 백업
    if (!PRESET_CONFIG[previousMethod]) {
        lastUserLightSteps = Math.max(1, parseInt(stepsInput.value, 10) || 1);
    }

    const preset = PRESET_CONFIG[method];
    if (preset) {
        stepsInput.value = preset.defaultSteps;
    } else if (PRESET_CONFIG[previousMethod]) {
        // 고정 프리셋에서 일반 알고리즘으로 복귀할 때만 이전 사용자 명암 단계를 복원
        stepsInput.value = lastUserLightSteps;
    }

    previousMethod = method;
}

/**
 * 메인 색상 추출 및 UI 전체 갱신 컨트롤러
 */
function generatePalette() {
    const baseColorEl = document.getElementById('baseColor');
    const methodEl = document.getElementById('extractMethod');
    if (!baseColorEl || !methodEl) return;

    const baseColorInput = baseColorEl.value.trim();
    const method = methodEl.value;

    updateInputsState(method);

    const count = parseInt(document.getElementById('extractCount').value, 10) || 8;
    const lightSteps = parseInt(document.getElementById('lightSteps').value, 10) || 1;
    const minL = parseInt(document.getElementById('lightMin').value, 10);
    const maxL = parseInt(document.getElementById('lightMax').value, 10);

    let cleanHex = baseColorInput;
    if (cleanHex && !cleanHex.startsWith('#')) {
        cleanHex = '#' + cleanHex;
    }
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(cleanHex)) {
        return;
    }
    cleanHex = cleanHex.toUpperCase();

    const baseHsl = hexToHsl(cleanHex);
    const colors = extractColors(baseHsl.h, baseHsl.s, baseHsl.l, cleanHex, count, method, minL, maxL, lightSteps);
    currentExtractedColors = colors;

    renderPalette(colors);
    drawColorMap(baseHsl.s);
    renderMarkers(baseHsl, cleanHex, colors);
    renderContrastStrip(colors);
    updateLightnessGuide(minL, maxL);
}

/**
 * 2차원 H-L 컬러 맵 배경을 렌더링합니다 (정적 배경은 최초 1회만 픽셀 연산 수행).
 */
function drawColorMap(s) {
    const satLabel = document.getElementById('colormapSatLabel');
    if (satLabel) {
        satLabel.innerText = `채도: ${s}%`;
    }

    if (isColorMapRendered) return;

    const canvas = document.getElementById('colorMapCanvas');
    if (!canvas) return;

    const width = 180;
    const height = 75;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    const drawS = 100;
    const imgData = ctx.createImageData(width, height);

    for (let y = 0; y < height; y++) {
        const l = 100 - (y / height) * 100;
        for (let x = 0; x < width; x++) {
            const h = (x / width) * 360;
            const hex = hslToHex(h, drawS, l);

            const r = parseInt(hex.substring(1, 3), 16);
            const g = parseInt(hex.substring(3, 5), 16);
            const b = parseInt(hex.substring(5, 7), 16);

            const idx = (y * width + x) * 4;
            imgData.data[idx] = r;
            imgData.data[idx + 1] = g;
            imgData.data[idx + 2] = b;
            imgData.data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    isColorMapRendered = true;
}

function renderMarkers(baseHsl, baseHex, colors) {
    const markerContainer = document.getElementById('colormapMarkers');
    if (!markerContainer) return;
    markerContainer.innerHTML = '';

    const baseMarker = document.createElement('div');
    baseMarker.className = 'map-marker base-marker';
    baseMarker.style.left = `${(baseHsl.h / 360) * 100}%`;
    baseMarker.style.top = `${100 - baseHsl.l}%`;
    baseMarker.style.backgroundColor = baseHex;
    baseMarker.setAttribute('data-tooltip', `기준: ${baseHex} (H:${baseHsl.h}°, S:${baseHsl.s}%, L:${baseHsl.l}%)`);
    markerContainer.appendChild(baseMarker);

    colors.forEach((color, index) => {
        const marker = document.createElement('div');
        marker.className = 'map-marker extracted-marker';
        marker.style.left = `${(color.h / 360) * 100}%`;
        marker.style.top = `${100 - color.l}%`;
        marker.style.backgroundColor = color.hex;
        marker.setAttribute('data-tooltip', `#${index + 1}: ${color.hex} (H:${color.h}°, S:${color.s}%, L:${color.l}%)`);
        marker.setAttribute('data-index', index);

        marker.addEventListener('mouseenter', () => highlightCard(index, true));
        marker.addEventListener('mouseleave', () => highlightCard(index, false));

        markerContainer.appendChild(marker);
    });
}

function updateMarkerPositions(baseHsl, baseHex, colors) {
    const markerContainer = document.getElementById('colormapMarkers');
    if (!markerContainer) return;

    const baseMarker = markerContainer.querySelector('.base-marker');
    if (baseMarker) {
        baseMarker.style.left = `${(baseHsl.h / 360) * 100}%`;
        baseMarker.style.top = `${100 - baseHsl.l}%`;
        baseMarker.style.backgroundColor = baseHex;
        baseMarker.setAttribute('data-tooltip', `기준: ${baseHex} (H:${baseHsl.h}°, S:${baseHsl.s}%, L:${baseHsl.l}%)`);
    }

    const extractedMarkers = markerContainer.querySelectorAll('.extracted-marker');
    if (extractedMarkers.length === colors.length) {
        extractedMarkers.forEach((marker, index) => {
            const color = colors[index];
            marker.style.left = `${(color.h / 360) * 100}%`;
            marker.style.top = `${100 - color.l}%`;
            marker.style.backgroundColor = color.hex;
            marker.setAttribute('data-tooltip', `#${index + 1}: ${color.hex} (H:${color.h}°, S:${color.s}%, L:${color.l}%)`);
        });
    } else {
        renderMarkers(baseHsl, baseHex, colors);
    }
}

function renderContrastStrip(colors) {
    const stripContainer = document.getElementById('contrastStrip');
    if (!stripContainer) return;
    stripContainer.innerHTML = '';

    const method = document.getElementById('extractMethod').value;
    const preset = PRESET_CONFIG[method];
    const count = preset ? preset.count : (parseInt(document.getElementById('extractCount').value, 10) || 8);
    const lightSteps = (preset && preset.fixedSteps)
        ? preset.defaultSteps
        : (parseInt(document.getElementById('lightSteps').value, 10) || (preset ? preset.defaultSteps : 1));

    stripContainer.style.display = 'grid';
    stripContainer.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
    stripContainer.style.height = `${lightSteps * 35}px`;

    colors.forEach((color, index) => {
        const chip = document.createElement('div');
        chip.className = 'contrast-chip';
        chip.style.backgroundColor = color.hex;
        chip.style.height = '100%';

        chip.innerHTML = `
            <span class="contrast-chip-text text-dark">Aa</span>
            <span class="contrast-chip-text text-light">Aa</span>
        `;

        chip.addEventListener('mouseenter', () => {
            highlightCard(index, true);
            const marker = document.querySelector(`.map-marker[data-index="${index}"]`);
            if (marker) marker.classList.add('active');
        });
        chip.addEventListener('mouseleave', () => {
            highlightCard(index, false);
            const marker = document.querySelector(`.map-marker[data-index="${index}"]`);
            if (marker) marker.classList.remove('active');
        });
        chip.addEventListener('click', () => {
            copyToClipboard(color.hex);
        });

        stripContainer.appendChild(chip);
    });
}

function updateLightnessGuide(minL, maxL) {
    let guide = document.getElementById('colormapLightGuide');
    const wrapper = document.getElementById('colormapWrapper');
    if (!wrapper) return;

    if (!guide) {
        guide = document.createElement('div');
        guide.id = 'colormapLightGuide';
        guide.className = 'colormap-light-guide';
        wrapper.appendChild(guide);
    }

    guide.style.top = `${100 - maxL}%`;
    guide.style.height = `${maxL - minL}%`;
}

function highlightCard(index, isActive) {
    const cards = document.querySelectorAll('.color-card');
    if (cards[index]) {
        if (isActive) {
            cards[index].style.transform = 'scale(1.02)';
            cards[index].style.borderColor = '#007bff';
            cards[index].style.boxShadow = '0 4px 12px rgba(0,123,255,0.15)';
            cards[index].style.transition = 'all 0.2s ease';
        } else {
            cards[index].style.transform = '';
            cards[index].style.borderColor = '';
            cards[index].style.boxShadow = '';
        }
    }
}

function renderPalette(colors) {
    const container = document.getElementById('paletteResult');
    if (!container) return;
    container.innerHTML = '';

    colors.forEach((color, index) => {
        const luminance = getRelativeLuminance(color.hex).toFixed(3);

        const card = document.createElement('div');
        card.className = 'color-card';
        card.setAttribute('data-index', index);
        card.innerHTML = `
            <div class="color-swatch" style="background-color: ${color.hex};"></div>
            <div class="color-info">
                <div><strong>HEX:</strong> ${color.hex}</div>
                <div><strong>HSL:</strong> ${color.h}°, ${color.s}%, ${color.l}%</div>
                <div><strong>Luminance:</strong> ${luminance}</div>
            </div>
            <button type="button" class="copy-btn">Copy</button>
        `;

        const copyBtn = card.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => copyToClipboard(color.hex));
        }

        card.addEventListener('mouseenter', () => {
            const marker = document.querySelector(`.map-marker[data-index="${index}"]`);
            if (marker) marker.classList.add('active');
            const chip = document.getElementById('contrastStrip')?.children[index];
            if (chip) chip.classList.add('active');
        });
        card.addEventListener('mouseleave', () => {
            const marker = document.querySelector(`.map-marker[data-index="${index}"]`);
            if (marker) marker.classList.remove('active');
            const chip = document.getElementById('contrastStrip')?.children[index];
            if (chip) chip.classList.remove('active');
        });

        container.appendChild(card);
    });
}

function copyToClipboard(text) {
    copyTextWithFallback(text, `${text} 코드가 복사되었습니다.`);
}
