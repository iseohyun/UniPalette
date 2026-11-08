/**
 * @fileoverview UniPalette 전역 키보드 단축키 감지 및 사용자 정의 매핑 관리 모듈
 * - 추출 개수 증감, 명암 단계 증감 단축키 커스터마이징 (LocalStorage 영속화)
 * - 모달 편집 시 임시 상태(draftShortcuts) 분리로 '저장' 전 취소 안전성 보장
 * - 알고리즘([a]~[f]) 및 고정 프리셋([x]~[z]) 즉시 전환 단축키 지원
 */

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

// 알고리즘 및 고정 프리셋 고정 단축키 통합 매핑
const SHORTCUT_METHOD_MAP = {
    a: 'linear',
    b: 'hslAdapt',
    c: 'macadam',
    d: 'hslMacadam',
    e: 'oklab',
    f: 'ciede',
    x: 'ppt',
    y: 'rainbow',
    z: 'google'
};

let activeShortcuts = {};
let draftShortcuts = null;
let recordingSlot = null; // { action, slot }

function cloneShortcuts(source) {
    return JSON.parse(JSON.stringify(source));
}

/**
 * 로컬 스토리지에서 단축키 설정을 로드합니다.
 */
function loadShortcuts() {
    try {
        const saved = localStorage.getItem('unipalette_shortcuts');
        if (saved) {
            const parsed = JSON.parse(saved);
            activeShortcuts = cloneShortcuts(DEFAULT_SHORTCUTS);
            Object.keys(DEFAULT_SHORTCUTS).forEach(action => {
                if (parsed && parsed[action]) {
                    activeShortcuts[action].primary = parsed[action].primary || DEFAULT_SHORTCUTS[action].primary;
                    activeShortcuts[action].secondary = parsed[action].secondary || DEFAULT_SHORTCUTS[action].secondary;
                }
            });
            return;
        }
    } catch (err) {
        console.warn('단축키 로드 중 스토리지 접근 실패(기본값 사용):', err);
    }
    activeShortcuts = cloneShortcuts(DEFAULT_SHORTCUTS);
}

/**
 * 현재 활성 단축키 설정을 로컬 스토리지에 저장합니다.
 * @returns {boolean} 저장 성공 여부
 */
function saveShortcuts() {
    try {
        localStorage.setItem('unipalette_shortcuts', JSON.stringify(activeShortcuts));
        return true;
    } catch (err) {
        console.warn('단축키 설정 저장 실패:', err);
        return false;
    }
}

/**
 * 전역 keydown 이벤트 리스너를 등록합니다.
 */
function setupGlobalShortcuts() {
    document.addEventListener('keydown', (e) => {
        // 1. 단축키 녹화(바인딩) 상태일 때 처리 (draftShortcuts에만 반영)
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
            const targetStore = draftShortcuts || activeShortcuts;
            targetStore[action][slot] = key;

            const btn = document.getElementById(`key-${action}-${slot}`);
            if (btn) {
                btn.innerText = key;
                btn.classList.remove('recording');
            }

            recordingSlot = null;
            return;
        }

        // 모달이 열려 있을 때 Escape 키로 닫기 지원
        const modalOverlay = document.getElementById('commonModal');
        if (e.key === "Escape" && modalOverlay && modalOverlay.classList.contains('show')) {
            if (typeof closeModal === 'function') {
                closeModal();
            }
            return;
        }

        // 2. 일반 단축키 실행 감지 (입력 폼 포커스 또는 Ctrl/Alt/Meta 조합키 무시)
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        const activeEl = document.activeElement;
        const isInput = activeEl && (
            activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'SELECT' ||
            activeEl.tagName === 'TEXTAREA'
        );

        if (isInput && !activeEl.readOnly) {
            return;
        }

        let key = e.key === "=" ? "+" : e.key;

        if (key === activeShortcuts.increaseCount.primary || key === activeShortcuts.increaseCount.secondary) {
            e.preventDefault();
            adjustExtractCount(1);
            return;
        }
        if (key === activeShortcuts.decreaseCount.primary || key === activeShortcuts.decreaseCount.secondary) {
            e.preventDefault();
            adjustExtractCount(-1);
            return;
        }
        if (key === activeShortcuts.increaseLightSteps.primary || key === activeShortcuts.increaseLightSteps.secondary) {
            e.preventDefault();
            adjustLightSteps(1);
            return;
        }
        if (key === activeShortcuts.decreaseLightSteps.primary || key === activeShortcuts.decreaseLightSteps.secondary) {
            e.preventDefault();
            adjustLightSteps(-1);
            return;
        }

        // 추출 방법([a]~[f]) 및 고정 프리셋([x]~[z]) 단축키 통합 처리
        const targetMethod = SHORTCUT_METHOD_MAP[key.toLowerCase()];
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
    });
}

function adjustExtractCount(offset) {
    const countInput = document.getElementById('extractCount');
    if (!countInput || countInput.disabled) return;

    const val = (parseInt(countInput.value, 10) || 8) + offset;
    const min = parseInt(countInput.min, 10) || 2;
    const max = parseInt(countInput.max, 10) || 36;

    if (val >= min && val <= max) {
        countInput.value = val;
        if (typeof generatePalette === 'function') {
            generatePalette();
        }
    }
}

function adjustLightSteps(offset) {
    const stepsInput = document.getElementById('lightSteps');
    if (!stepsInput || stepsInput.disabled) return;

    const val = (parseInt(stepsInput.value, 10) || 1) + offset;
    const min = parseInt(stepsInput.min, 10) || 1;
    const max = parseInt(stepsInput.max, 10) || 10;

    if (val >= min && val <= max) {
        stepsInput.value = val;
        if (typeof generatePalette === 'function') {
            generatePalette();
        }
    }
}

/**
 * 진행 중인 키 바인딩 녹화를 취소하고 이전 표시 상태로 되돌립니다.
 */
function cancelRecording() {
    if (!recordingSlot) return;
    const { action, slot } = recordingSlot;
    const source = draftShortcuts || activeShortcuts;
    const btn = document.getElementById(`key-${action}-${slot}`);
    if (btn) {
        btn.innerText = source[action][slot] || 'None';
        btn.classList.remove('recording');
    }
    recordingSlot = null;
}

/**
 * 단축키 설정 모달 내부 UI 버튼을 초기화하고 임시 상태(draftShortcuts)를 바인딩합니다.
 */
function initShortcutSettingsUI() {
    loadShortcuts();
    draftShortcuts = cloneShortcuts(activeShortcuts);

    Object.keys(draftShortcuts).forEach(action => {
        ['primary', 'secondary'].forEach(slot => {
            const btn = document.getElementById(`key-${action}-${slot}`);
            if (btn) {
                btn.innerText = draftShortcuts[action][slot] || 'None';

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

    const saveBtn = document.getElementById('btnSaveShortcuts');
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (recordingSlot) {
                cancelRecording();
            }
            activeShortcuts = cloneShortcuts(draftShortcuts);
            draftShortcuts = null;
            saveShortcuts();
            if (typeof showToast === 'function') {
                showToast('단축키 설정이 저장되었습니다.');
            }
            if (typeof closeModal === 'function') {
                closeModal();
            }
        });
    }

    const resetBtn = document.getElementById('btnResetShortcuts');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            draftShortcuts = cloneShortcuts(DEFAULT_SHORTCUTS);
            Object.keys(draftShortcuts).forEach(action => {
                ['primary', 'secondary'].forEach(slot => {
                    const btn = document.getElementById(`key-${action}-${slot}`);
                    if (btn) {
                        btn.innerText = draftShortcuts[action][slot];
                        btn.classList.remove('recording');
                    }
                });
            });
            recordingSlot = null;
        });
    }
}

loadShortcuts();
setupGlobalShortcuts();
