// 전역 단축키 관리 상태
const DEFAULT_SHORTCUTS = {
    increaseCount: {
        label: "추출 개수 증가",
        primary: "+",
        secondary: "ArrowUp"
    },
    decreaseCount: {
        label: "추출 개수 감소",
        primary: "-",
        secondary: "ArrowDown"
    },
    increaseLightSteps: {
        label: "명암 단계 증가",
        primary: "*",
        secondary: "PageUp"
    },
    decreaseLightSteps: {
        label: "명암 단계 감소",
        primary: "/",
        secondary: "PageDown"
    }
};

let activeShortcuts = {};
let recordingSlot = null; // { action, slot }

// 로컬 스토리지에서 단축키 로드
function loadShortcuts() {
    const saved = localStorage.getItem('unipalette_shortcuts');
    if (saved) {
        try {
            activeShortcuts = JSON.parse(saved);
            // 신규 액션 추가 시 보완
            if (!activeShortcuts.increaseLightSteps) {
                activeShortcuts.increaseLightSteps = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS.increaseLightSteps));
                activeShortcuts.decreaseLightSteps = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS.decreaseLightSteps));
            }
        } catch (e) {
            activeShortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
        }
    } else {
        activeShortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
    }
}

// 단축키 저장
function saveShortcuts() {
    localStorage.setItem('unipalette_shortcuts', JSON.stringify(activeShortcuts));
}

// 전역 keydown 감지 엔진
function setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 1. 단축키 녹화(바인딩) 상태일 때 처리
        if (recordingSlot) {
            e.preventDefault();
            e.stopPropagation();
            
            let key = e.key;
            if (key === "Escape") {
                cancelRecording();
                return;
            }
            
            if (key === "=" && recordingSlot.action === "increaseCount") {
                key = "+";
            }
            
            const { action, slot } = recordingSlot;
            activeShortcuts[action][slot] = key;
            
            const btn = document.getElementById(`key-${action}-${slot}`);
            if (btn) {
                btn.innerText = key;
                btn.classList.remove('recording');
            }
            
            recordingSlot = null;
            return;
        }
        
        // 2. 일반 단축키 실행 감지
        const activeEl = document.activeElement;
        const isInput = activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA';
        
        // readonly가 아닌 진짜 텍스트/숫자 입력 폼 포커스 중에는 단축키 반응을 무시함
        if (isInput && !activeEl.readOnly) {
            return;
        }
        
        let key = e.key;
        if (key === "=") {
            key = "+";
        }
        
        // 추출 개수 증가 액션
        if (key === activeShortcuts.increaseCount.primary || key === activeShortcuts.increaseCount.secondary) {
            e.preventDefault();
            adjustExtractCount(1);
            return;
        }
        // 추출 개수 감소 액션
        if (key === activeShortcuts.decreaseCount.primary || key === activeShortcuts.decreaseCount.secondary) {
            e.preventDefault();
            adjustExtractCount(-1);
            return;
        }
        
        // 명암 단계 증가 액션
        if (key === activeShortcuts.increaseLightSteps.primary || key === activeShortcuts.increaseLightSteps.secondary) {
            e.preventDefault();
            adjustLightSteps(1);
            return;
        }
        // 명암 단계 감소 액션
        if (key === activeShortcuts.decreaseLightSteps.primary || key === activeShortcuts.decreaseLightSteps.secondary) {
            e.preventDefault();
            adjustLightSteps(-1);
            return;
        }
        
        // 추출 방법 단축키 처리 [a] ~ [f]
        const methodMap = {
            'a': 'linear',
            'b': 'hslAdapt',
            'c': 'macadam',
            'd': 'hslMacadam',
            'e': 'oklab',
            'f': 'ciede'
        };
        const targetMethod = methodMap[key.toLowerCase()];
        if (targetMethod) {
            const methodSelect = document.getElementById('extractMethod');
            if (methodSelect) {
                e.preventDefault();
                methodSelect.value = targetMethod;
                if (typeof handleMethodChange === 'function') {
                    handleMethodChange(targetMethod);
                }
                if (typeof generatePalette === 'function') {
                    generatePalette();
                }
            }
        }
        
        // 고정 프리셋 단축키 처리 [x] ~ [z]
        const presetMap = {
            'x': 'ppt',
            'y': 'rainbow',
            'z': 'google'
        };
        const targetPreset = presetMap[key.toLowerCase()];
        if (targetPreset) {
            const methodSelect = document.getElementById('extractMethod');
            if (methodSelect) {
                e.preventDefault();
                methodSelect.value = targetPreset;
                if (typeof handleMethodChange === 'function') {
                    handleMethodChange(targetPreset);
                }
                if (typeof generatePalette === 'function') {
                    generatePalette();
                }
            }
        }
    });
}

// 추출 개수 실시간 가감 처리
function adjustExtractCount(offset) {
    const countInput = document.getElementById('extractCount');
    if (!countInput || countInput.disabled) return;
    
    let val = parseInt(countInput.value) || 10;
    val += offset;
    
    const min = parseInt(countInput.min) || 2;
    const max = parseInt(countInput.max) || 36;
    
    if (val >= min && val <= max) {
        countInput.value = val;
        if (typeof generatePalette === 'function') {
            generatePalette();
        }
    }
}

// 명암 단계 실시간 가감 처리
function adjustLightSteps(offset) {
    const stepsInput = document.getElementById('lightSteps');
    if (!stepsInput || stepsInput.disabled) return;
    
    let val = parseInt(stepsInput.value) || 1;
    val += offset;
    
    const min = parseInt(stepsInput.min) || 1;
    const max = parseInt(stepsInput.max) || 10;
    
    if (val >= min && val <= max) {
        stepsInput.value = val;
        if (typeof generatePalette === 'function') {
            generatePalette();
        }
    }
}

// 키 바인딩 녹화 취소
function cancelRecording() {
    if (!recordingSlot) return;
    const { action, slot } = recordingSlot;
    const btn = document.getElementById(`key-${action}-${slot}`);
    if (btn) {
        btn.innerText = activeShortcuts[action][slot] || 'None';
        btn.classList.remove('recording');
    }
    recordingSlot = null;
}

// 단축키 설정 UI 이벤트 바인딩
function initShortcutSettingsUI() {
    loadShortcuts();
    
    Object.keys(activeShortcuts).forEach(action => {
        ['primary', 'secondary'].forEach(slot => {
            const btn = document.getElementById(`key-${action}-${slot}`);
            if (btn) {
                btn.innerText = activeShortcuts[action][slot] || 'None';
                
                btn.addEventListener('click', () => {
                    if (recordingSlot) {
                        cancelRecording();
                    }
                    
                    recordingSlot = { action, slot };
                    btn.innerText = '키를 입력하세요...';
                    btn.classList.add('recording');
                    btn.focus();
                });
            }
        });
    });
    
    // 저장 버튼 바인딩
    const saveBtn = document.getElementById('btnSaveShortcuts');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            saveShortcuts();
            if (typeof showToast === 'function') {
                showToast('단축키 설정이 저장되었습니다.');
            }
            if (typeof closeModal === 'function') {
                closeModal();
            }
        });
    }
    
    // 초기화 버튼 바인딩
    const resetBtn = document.getElementById('btnResetShortcuts');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            activeShortcuts = JSON.parse(JSON.stringify(DEFAULT_SHORTCUTS));
            Object.keys(activeShortcuts).forEach(action => {
                ['primary', 'secondary'].forEach(slot => {
                    const btn = document.getElementById(`key-${action}-${slot}`);
                    if (btn) {
                        btn.innerText = activeShortcuts[action][slot];
                        btn.classList.remove('recording');
                    }
                });
            });
            recordingSlot = null;
        });
    }
}

// 스크립트 로드 시 전역 바인딩 초기화
loadShortcuts();
setupGlobalShortcuts();
