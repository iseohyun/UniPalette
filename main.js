// 전역 상태 변수
const VERSION = 'v2026071005';
let currentExtractedColors = [];
let isDragging = false;

document.addEventListener('DOMContentLoaded', () => {
    const baseColor = document.getElementById('baseColor');
    const extractCount = document.getElementById('extractCount');
    const lightSteps = document.getElementById('lightSteps');
    const extractMethod = document.getElementById('extractMethod');
    const btnToggleDark = document.getElementById('btnToggleDark');
    
    // 1. 범용 색상 입력 컴포넌트(숨겨진 color picker) 연동 초기화
    initColorPicker();
    
    // 2. 커스텀 더블 슬라이더 초기화
    initDoubleSlider();
    
    // 3. 2차원 컬러 맵 기준 마커 드래그 앤 드롭 초기화
    initDragAndDrop();
    
    // 4. "코드로 추출" 버튼 복사 및 토스트 기능 초기화
    initExportButton();
    
    // 5. 단축키 및 설명서 헤더 버튼 모달 바인딩
    initHeaderModalButtons();
    
    // 다크모드 실시간 토글 (체크박스 대신 헤더 버튼식으로 갱신)
    if (btnToggleDark) {
        btnToggleDark.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('preview-dark');
            btnToggleDark.innerText = isDark ? '라이트모드' : '다크모드';
        });
    }
    
    // 기타 변경 시 재생성
    [extractCount, lightSteps].forEach(el => {
        el.addEventListener('input', generatePalette);
        el.addEventListener('change', generatePalette);
    });
    
    if (extractMethod) {
        const onMethodChange = () => {
            handleMethodChange(extractMethod.value);
            generatePalette();
        };
        extractMethod.addEventListener('input', onMethodChange);
        extractMethod.addEventListener('change', onMethodChange);
    }
    
    // 초기 실행 스타일 및 드로잉
    updateBaseColorInputStyle(baseColor.value);
    generatePalette();
});

// 헤더 모달 버튼 이벤트 바인딩
function initHeaderModalButtons() {
    const btnShortcut = document.getElementById('btnShortcut');
    const btnHelp = document.getElementById('btnHelp');
    const modalOverlay = document.getElementById('commonModal');
    
    if (btnShortcut) {
        btnShortcut.addEventListener('click', () => {
            openModal('shortcut.html', () => {
                if (typeof initShortcutSettingsUI === 'function') {
                    initShortcutSettingsUI();
                }
            });
        });
    }
    
    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            openModal('help.html');
        });
    }
    
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
    }
}

// 모달 오픈 유틸리티
function openModal(url, callback) {
    const modalContent = document.getElementById('modalContent');
    const modalOverlay = document.getElementById('commonModal');
    if (!modalContent || !modalOverlay) return;
    
    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error('HTML load failed');
            return response.text();
        })
        .then(html => {
            modalContent.innerHTML = html;
            modalOverlay.classList.add('show');
            if (callback) callback();
        })
        .catch(err => {
            console.error('모달 로드 에러: ', err);
            showToast('콘텐츠를 불러오는 데 실패했습니다.');
        });
}

// 모달 클로즈 유틸리티 (글로벌 스코프 지정)
window.closeModal = function() {
    const modalOverlay = document.getElementById('commonModal');
    if (modalOverlay) {
        modalOverlay.classList.remove('show');
    }
    if (typeof cancelRecording === 'function') {
        cancelRecording();
    }
};

// HSL -> HSV 변환 (2D 컬러 피커 좌표 매핑용)
function hslToHsv(h, s, l) {
    s /= 100;
    l /= 100;
    let v = l + s * Math.min(l, 1 - l);
    let s_hsv = v === 0 ? 0 : 2 * (1 - l / v);
    return {
        h: h,
        s: s_hsv,
        v: v
    };
}

// HSV -> HSL 변환 (2D 컬러 피커 좌표 매핑용)
function hsvToHsl(h, s, v) {
    let l = v * (1 - s / 2);
    let s_hsl = (l === 0 || l === 1) ? 0 : (v - l) / Math.min(l, 1 - l);
    return {
        h: h,
        s: Math.round(s_hsl * 100),
        l: Math.round(l * 100)
    };
}

// 커스텀 2D HSV 캔버스 그리기
function drawPickerCanvas(hue) {
    const canvas = document.getElementById('pickerCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // 1. 가로축: 흰색 -> 순수 색상 그라데이션
    const gradH = ctx.createLinearGradient(0, 0, width, 0);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, width, height);
    
    // 2. 세로축: 투명 -> 검은색 그라데이션
    const gradV = ctx.createLinearGradient(0, 0, 0, height);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, '#000000');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, width, height);
}

// 커스텀 피커 캔버스 상의 마커 핀 위치 동기화
function updatePickerMarker(s_hsv, v_hsv) {
    const marker = document.getElementById('pickerMarker');
    const canvas = document.getElementById('pickerCanvas');
    if (!marker || !canvas) return;
    
    const x = Math.round(s_hsv * canvas.width);
    const y = Math.round((1 - v_hsv) * canvas.height);
    
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
}

// 커스텀 2D HSV 컬러 피커 및 스포이드/OS피커 바인딩 (4차 수정)
function initColorPicker() {
    const baseColorInput = document.getElementById('baseColor');
    const customPicker = document.getElementById('customColorPicker');
    const hiddenPicker = document.getElementById('hiddenColorPicker');
    
    if (!baseColorInput || !customPicker || !hiddenPicker) return;
    
    const canvas = document.getElementById('pickerCanvas');
    const hueSlider = document.getElementById('pickerHue');
    const previewChip = document.getElementById('pickerPreview');
    const hexText = document.getElementById('pickerHexText');
    const btnDropper = document.getElementById('btnDropper');
    const btnNative = document.getElementById('btnNativePicker');
    const btnClose = document.getElementById('btnClosePicker');
    
    let isMouseDown = false;
    
    // 2D 캔버스 좌표에서 색상 선택
    const selectColorFromCoord = (e) => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        
        x = Math.max(0, Math.min(canvas.width, x));
        y = Math.max(0, Math.min(canvas.height, y));
        
        const s_hsv = x / canvas.width;
        const v_hsv = 1 - (y / canvas.height);
        
        const hue = parseInt(hueSlider.value);
        const hsl = hsvToHsl(hue, s_hsv, v_hsv);
        
        const hex = hslToHex(hsl.h, hsl.s, hsl.l);
        baseColorInput.value = hex;
        updateBaseColorInputStyle(hex);
        hiddenPicker.value = hex;
        
        if (previewChip) previewChip.style.backgroundColor = hex;
        if (hexText) hexText.innerText = hex;
        
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
    
    // Hue 슬라이더 조작 시 캔버스 다시 그리기 및 색상 동기화
    if (hueSlider) {
        const onHueChange = () => {
            const hue = parseInt(hueSlider.value);
            drawPickerCanvas(hue);
            
            // 현재 마커 좌표의 HSV 색상 구하기
            const marker = document.getElementById('pickerMarker');
            if (marker && canvas) {
                const x = parseFloat(marker.style.left) || 0;
                const y = parseFloat(marker.style.top) || 0;
                const s_hsv = x / canvas.width;
                const v_hsv = 1 - (y / canvas.height);
                
                const hsl = hsvToHsl(hue, s_hsv, v_hsv);
                const hex = hslToHex(hsl.h, hsl.s, hsl.l);
                baseColorInput.value = hex;
                updateBaseColorInputStyle(hex);
                hiddenPicker.value = hex;
                
                if (previewChip) previewChip.style.backgroundColor = hex;
                if (hexText) hexText.innerText = hex;
                generatePalette();
            }
        };
        hueSlider.addEventListener('input', onHueChange);
        hueSlider.addEventListener('change', onHueChange);
    }
    
    // 스포이드(EyeDropper) API 지원 확인 및 바인딩
    if ('EyeDropper' in window && btnDropper) {
        btnDropper.style.display = 'flex';
        btnDropper.addEventListener('click', (e) => {
            e.stopPropagation();
            const eyeDropper = new EyeDropper();
            eyeDropper.open().then(result => {
                const hex = result.sRGBHex.toUpperCase();
                syncPickerWithHex(hex);
            }).catch(err => {
                console.log('스포이드 취소/실패:', err);
            });
        });
    }
    
    // OS 네이티브 피커 연동
    if (btnNative) {
        btnNative.addEventListener('click', (e) => {
            e.stopPropagation();
            customPicker.style.display = 'none';
            hiddenPicker.click();
        });
    }
    
    // OS 네이티브 피커 변경 감지 시 동기화
    const onNativePickerChange = (e) => {
        const hex = e.target.value.toUpperCase();
        syncPickerWithHex(hex);
    };
    hiddenPicker.addEventListener('input', onNativePickerChange);
    hiddenPicker.addEventListener('change', onNativePickerChange);
    
    // 닫기 버튼 바인딩
    if (btnClose) {
        btnClose.addEventListener('click', (e) => {
            e.stopPropagation();
            customPicker.style.display = 'none';
        });
    }
    
    // 기준색상 인풋 클릭 시 팝업 토글
    baseColorInput.addEventListener('click', (e) => {
        e.stopPropagation();
        if (customPicker.style.display === 'none') {
            const currentHex = baseColorInput.value;
            syncPickerWithHex(currentHex, false); // 파레트 재생성 생략
            customPicker.style.display = 'block';
        } else {
            customPicker.style.display = 'none';
        }
    });
    
    // 피커 영역 클릭 시 닫히지 않도록 방지
    customPicker.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    // 바깥 영역 클릭 시 피커 닫기
    document.addEventListener('click', (e) => {
        if (customPicker.style.display === 'block' && e.target !== baseColorInput && !customPicker.contains(e.target)) {
            customPicker.style.display = 'none';
        }
    });
}

// HEX 값에 기초해 커스텀 2D 피커 UI를 정밀 동기화
function syncPickerWithHex(hex, triggerGenerate = true) {
    const baseColorInput = document.getElementById('baseColor');
    const hiddenPicker = document.getElementById('hiddenColorPicker');
    const hueSlider = document.getElementById('pickerHue');
    const previewChip = document.getElementById('pickerPreview');
    const hexText = document.getElementById('pickerHexText');
    
    if (!baseColorInput || !hiddenPicker) return;
    
    baseColorInput.value = hex;
    updateBaseColorInputStyle(hex);
    hiddenPicker.value = hex;
    
    if (previewChip) previewChip.style.backgroundColor = hex;
    if (hexText) hexText.innerText = hex;
    
    // HSL -> HSV 변환 후 피커 상태 동기화
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

// 커스텀 더블 슬라이더 초기화 및 정합성 제어
function initDoubleSlider() {
    const minInput = document.getElementById('lightMin');
    const maxInput = document.getElementById('lightMax');
    const sliderRange = document.getElementById('sliderRange');
    const textSpan = document.getElementById('lightRangeVal');
    
    function updateSlider() {
        let minVal = parseInt(minInput.value);
        let maxVal = parseInt(maxInput.value);
        
        if (minVal > maxVal) {
            let temp = minVal;
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
        let minVal = parseInt(minInput.value);
        let maxVal = parseInt(maxInput.value);
        if (minVal > maxVal) {
            minInput.value = maxVal;
        }
        updateSlider();
        generatePalette();
    });
    
    maxInput.addEventListener('input', () => {
        let minVal = parseInt(minInput.value);
        let maxVal = parseInt(maxInput.value);
        if (maxVal < minVal) {
            maxInput.value = minVal;
        }
        updateSlider();
        generatePalette();
    });
    
    updateSlider();
}

// 기준 색상 마커 드래그 앤 드롭 핸들러
function initDragAndDrop() {
    const wrapper = document.getElementById('colormapWrapper');
    const markerContainer = document.getElementById('colormapMarkers');
    
    markerContainer.addEventListener('mousedown', (e) => {
        const marker = e.target.closest('.base-marker');
        if (!marker) return;
        
        isDragging = true;
        e.preventDefault();
        
        function onMouseMove(moveEvent) {
            if (!isDragging) return;
            const rect = wrapper.getBoundingClientRect();
            
            let x = (moveEvent.clientX - rect.left) / rect.width;
            let y = (moveEvent.clientY - rect.top) / rect.height;
            
            x = Math.max(0, Math.min(1, x));
            y = Math.max(0, Math.min(1, y));
            
            const h = Math.round(x * 360) % 360;
            const l = Math.round((1 - y) * 100);
            
            const baseColorEl = document.getElementById('baseColor');
            const currentHsl = hexToHsl(baseColorEl.value);
            
            let s = currentHsl.s;
            if (s < 5) {
                s = 80;
            }
            
            const newHex = hslToHex(h, s, l);
            baseColorEl.value = newHex;
            updateBaseColorInputStyle(newHex);
            
            document.getElementById('hiddenColorPicker').value = newHex;
            
            // 2D HSV 피커 동기화
            const customPicker = document.getElementById('customColorPicker');
            if (customPicker && customPicker.style.display === 'block') {
                const hueSlider = document.getElementById('pickerHue');
                if (hueSlider) hueSlider.value = h;
                
                const hsv = hslToHsv(h, s, l);
                drawPickerCanvas(h);
                updatePickerMarker(hsv.s, hsv.v);
                
                const hexText = document.getElementById('pickerHexText');
                const previewChip = document.getElementById('pickerPreview');
                if (hexText) hexText.innerText = newHex;
                if (previewChip) previewChip.style.backgroundColor = newHex;
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

// 드래그 중의 가벼운 실시간 갱신 로직 (성능 보장)
function generatePaletteFromDrag(baseH, baseS, baseL, newHex) {
    const count = parseInt(document.getElementById('extractCount').value);
    const lightSteps = parseInt(document.getElementById('lightSteps').value) || 1;
    const method = document.getElementById('extractMethod').value;
    const minL = parseInt(document.getElementById('lightMin').value);
    const maxL = parseInt(document.getElementById('lightMax').value);
    
    const colors = extractColors(baseH, baseS, baseL, newHex, count, method, minL, maxL, lightSteps);
    currentExtractedColors = colors;
    
    renderPalette(colors);
    updateMarkerPositions({ h: baseH, s: baseS, l: baseL }, newHex, colors);
    renderContrastStrip(colors);
    updateLightnessGuide(minL, maxL);
}

// "코드로 추출" 클립보드 복사 및 Toast 팝업
function initExportButton() {
    const exportBtn = document.getElementById('btnExportCode');
    if (!exportBtn) return;
    
    exportBtn.addEventListener('click', () => {
        if (currentExtractedColors.length === 0) return;
        
        const hexList = currentExtractedColors.map(c => `"${c.hex}"`).join(', ');
        const codeString = `const colorPalette = [\n  ${hexList}\n];`;
        
        navigator.clipboard.writeText(codeString).then(() => {
            showToast('클립보드에 복사되었습니다.');
        }).catch(err => {
            console.error('클립보드 복사 실패: ', err);
            showToast('복사에 실패했습니다.');
        });
    });
}

function showToast(message) {
    const toast = document.getElementById('toastMessage');
    if (!toast) return;
    
    toast.innerText = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 1000);
}

// 기준 색상 입력 스타일(배경색, 텍스트 가독성 색상) 동적 변경
function updateBaseColorInputStyle(hex) {
    const input = document.getElementById('baseColor');
    let cleanHex = hex.trim();
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

// 추출 개수 & 명암 단계 인풋 비활성화(disabled) 여부 동기화 및 회색조 피드백 개선
function updateInputsState(method) {
    const countInput = document.getElementById('extractCount');
    const stepsInput = document.getElementById('lightSteps');
    if (!countInput || !stepsInput) return;
    
    const isCountFixed = ['ppt', 'rainbow', 'google'].includes(method);
    const isStepsFixed = ['ppt', 'rainbow'].includes(method); // 구글색은 steps 가변조절 가능
    
    // 1. 추출 개수 인풋 제어
    if (isCountFixed) {
        if (method === 'ppt') countInput.value = 7;
        else if (method === 'rainbow') countInput.value = 10;
        else if (method === 'google') countInput.value = 8;
        
        countInput.disabled = true;
        countInput.style.backgroundColor = '#e9ecef';
        countInput.style.color = '#6c757d';
        countInput.style.cursor = 'not-allowed';
    } else {
        countInput.disabled = false;
        countInput.style.backgroundColor = '';
        countInput.style.color = '';
        countInput.style.cursor = '';
    }
    
    // 2. 명암 단계 인풋 제어
    if (isStepsFixed) {
        if (method === 'ppt') stepsInput.value = 1;
        else if (method === 'rainbow') stepsInput.value = 1;
        
        stepsInput.disabled = true;
        stepsInput.style.backgroundColor = '#e9ecef';
        stepsInput.style.color = '#6c757d';
        stepsInput.style.cursor = 'not-allowed';
    } else {
        stepsInput.disabled = false;
        stepsInput.style.backgroundColor = '';
        stepsInput.style.color = '';
        stepsInput.style.cursor = '';
        
        // 구글색 프리셋은 1~3단계 범위로 조작 한도 제한
        if (method === 'google') {
            stepsInput.max = 3;
            let val = parseInt(stepsInput.value) || 3;
            if (val > 3) {
                stepsInput.value = 3;
            } else if (val < 1) {
                stepsInput.value = 1;
            }
        } else {
            stepsInput.removeAttribute('max');
        }
    }
}

// 추출 방법 변경 시 명암 단계(lightSteps) 설정 자동 업데이트 및 예외 처리
function handleMethodChange(method) {
    const stepsInput = document.getElementById('lightSteps');
    if (!stepsInput) return;
    if (method === 'ppt') {
        stepsInput.value = 1;
    } else if (method === 'rainbow') {
        stepsInput.value = 1;
    } else if (method === 'google') {
        stepsInput.value = 3;
    } else {
        stepsInput.value = 1;
    }
}

// 메인 색상 추출 및 페이지 리프레시 컨트롤러
function generatePalette() {
    const baseColorInput = document.getElementById('baseColor').value.trim();
    const method = document.getElementById('extractMethod').value;
    
    // 고정 프리셋 상태 동기화 및 회색조 피드백 선반영
    updateInputsState(method);

    const count = parseInt(document.getElementById('extractCount').value);
    const lightSteps = parseInt(document.getElementById('lightSteps').value) || 1;
    const minL = parseInt(document.getElementById('lightMin').value);
    const maxL = parseInt(document.getElementById('lightMax').value);

    let cleanHex = baseColorInput;
    if (cleanHex && !cleanHex.startsWith('#')) {
        cleanHex = '#' + cleanHex;
    }
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(cleanHex)) {
        return;
    }
    
    const baseHsl = hexToHsl(cleanHex);
    
    const colors = extractColors(baseHsl.h, baseHsl.s, baseHsl.l, cleanHex, count, method, minL, maxL, lightSteps);
    currentExtractedColors = colors;

    renderPalette(colors);
    drawColorMap(baseHsl.s);
    renderMarkers(baseHsl, cleanHex, colors);
    renderContrastStrip(colors);
    updateLightnessGuide(minL, maxL);
}

// 2차원 컬러 맵 배경 드로잉 (무채색 드래그 시 맵 붕괴 방지를 위해 렌더 채도는 100% 고정)
function drawColorMap(s) {
    const canvas = document.getElementById('colorMapCanvas');
    if (!canvas) return;
    
    canvas.width = 180;
    canvas.height = 75;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    const drawS = 100;
    
    const imgData = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) {
        let l = 100 - (y / height) * 100;
        for (let x = 0; x < width; x++) {
            let h = (x / width) * 360;
            let hex = hslToHex(h, drawS, l);
            
            let r = parseInt(hex.substring(1, 3), 16);
            let g = parseInt(hex.substring(3, 5), 16);
            let b = parseInt(hex.substring(5, 7), 16);
            
            let idx = (y * width + x) * 4;
            imgData.data[idx] = r;
            imgData.data[idx+1] = g;
            imgData.data[idx+2] = b;
            imgData.data[idx+3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    
    const satLabel = document.getElementById('colormapSatLabel');
    if (satLabel) {
        satLabel.innerText = `채도: ${s}%`;
    }
}

// 컬러 맵 위에 마커 생성 및 노드 추가
function renderMarkers(baseHsl, baseHex, colors) {
    const markerContainer = document.getElementById('colormapMarkers');
    if (!markerContainer) return;
    markerContainer.innerHTML = '';
    
    // 1. 기준 색상 마커 (검은 테두리)
    const baseMarker = document.createElement('div');
    baseMarker.className = 'map-marker base-marker';
    baseMarker.style.left = `${(baseHsl.h / 360) * 100}%`;
    baseMarker.style.top = `${100 - baseHsl.l}%`;
    baseMarker.style.backgroundColor = baseHex;
    baseMarker.setAttribute('data-tooltip', `기준: ${baseHex} (H:${baseHsl.h}°, S:${baseHsl.s}%, L:${baseHsl.l}%)`);
    markerContainer.appendChild(baseMarker);
    
    // 2. 추출된 색상 마커들
    colors.forEach((color, index) => {
        const marker = document.createElement('div');
        marker.className = 'map-marker extracted-marker';
        marker.style.left = `${(color.h / 360) * 100}%`;
        marker.style.top = `${100 - color.l}%`;
        marker.style.backgroundColor = color.hex;
        marker.setAttribute('data-tooltip', `#${index + 1}: ${color.hex} (H:${color.h}°, S:${color.s}%, L:${color.l}%)`);
        marker.setAttribute('data-index', index);
        
        marker.addEventListener('mouseenter', () => {
            highlightCard(index, true);
        });
        marker.addEventListener('mouseleave', () => {
            highlightCard(index, false);
        });
        
        markerContainer.appendChild(marker);
    });
}

// 드래그 중 성능 확보를 위해 마커 위치만 미끄러지게 갱신하는 함수
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

// 인접 대비 확인 스트립 렌더링 (n x m 격자 그리드 배치)
function renderContrastStrip(colors) {
    const stripContainer = document.getElementById('contrastStrip');
    if (!stripContainer) return;
    stripContainer.innerHTML = '';
    
    const method = document.getElementById('extractMethod').value;
    let count = parseInt(document.getElementById('extractCount').value) || 10;
    let lightSteps = parseInt(document.getElementById('lightSteps').value) || 1;
    
    // 고정 프리셋일 때의 그리드 보정
    if (method === 'ppt') { count = 7; lightSteps = 1; }
    else if (method === 'rainbow') { count = 10; lightSteps = 1; }
    else if (method === 'google') { count = 8; lightSteps = parseInt(document.getElementById('lightSteps').value) || 3; }
    
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
        
        stripContainer.appendChild(chip);
    });
}

// 명암 범위를 색상 분포 맵 상에 반투명 가이드 레이어로 오버레이 표시
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
    
    const topPercent = 100 - maxL;
    const heightPercent = maxL - minL;
    
    guide.style.top = `${topPercent}%`;
    guide.style.height = `${heightPercent}%`;
}

// 결과 카드 호버 효과 제어
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

// 화면에 추출된 색상 결과 리스트 카드 렌더링
function renderPalette(colors) {
    const container = document.getElementById('paletteResult');
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
            <button class="copy-btn" onclick="copyToClipboard('${color.hex}')">Copy</button>
        `;
        
        card.addEventListener('mouseenter', () => {
            const marker = document.querySelector(`.map-marker[data-index="${index}"]`);
            if (marker) marker.classList.add('active');
            const chip = document.getElementById('contrastStrip')?.children[index];
            if (chip) chip.style.flex = '1.8';
        });
        card.addEventListener('mouseleave', () => {
            const marker = document.querySelector(`.map-marker[data-index="${index}"]`);
            if (marker) marker.classList.remove('active');
            const chip = document.getElementById('contrastStrip')?.children[index];
            if (chip) chip.style.flex = '';
        });
        
        container.appendChild(card);
    });
}

// 클립보드 복사 유틸리티
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(`${text} 코드가 복사되었습니다.`);
    }).catch(err => {
        console.error('복사 실패: ', err);
    });
}
