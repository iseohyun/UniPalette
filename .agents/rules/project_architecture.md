# UniPalette Project Architecture Rules

## 1. CSS 스타일링 아키텍처 (Single Centralized CSS)
- **정책**: 프로젝트의 모든 스타일은 단일 중앙 집중형 스타일시트인 `style.css`에서 통합 관리한다.
- **세부 지침**:
  - `index.html`, `help.html`, `shortcut.html` 내부에 대규모 인라인 `<style>` 블록을 두지 않고 `style.css`에 섹션별로 구조화하여 작성한다.
  - 라이트/다크 테마 전환을 위해 색상 값은 `:root` 및 `.preview-dark`의 CSS 커스텀 프로퍼티(`--bg-color`, `--panel-bg`, `--text-color`, `--border-color`, `--muted-text`, `--disabled-bg`)를 사용한다.
  - 로컬 파일(`file://`) 직접 실행과 웹 서버(`https://`) 배포 환경 모두에서 동일하게 로드되도록 `<link rel="stylesheet" href="style.css?v=YYYYMMDDvN">` 형태로 연결한다.

## 2. 이원화 버전 관리 및 캐시 버스팅 (Dual Versioning & Cache-Busting)
- **정책**: 정식 시맨틱 버전(`SEMVER`)과 일자 기반 캐시 버스팅 태그(`CACHE_BUST_TAG`)를 분리한 이원화 버전 체계를 적용한다.
- **세부 지침**:
  - 버전 상수는 `version.js` 단일 파일(SSOT)에서 관리한다:
    - `SEMVER`: 정식 릴리즈 버전 (예: `'1.0.0'`). **사용자의 명시적인 승인이 있을 때에만** 버전을 올린다.
    - `CACHE_BUST_TAG`: 일자 및 당일 수정 순번 태그 (예: `'20261109v1'`). 코드나 정적 에셋 수정 시 브라우저 강제 새로고침(Hard Refresh) 없이 최신 번들이 즉시 반영되도록 자동 갱신한다.
    - `DISPLAY_VERSION`: UI 헤더(`#appVersion`)에 표시되는 통합 버전 문자열 (`v${SEMVER} (${CACHE_BUST_TAG})`).
  - `index.html`에서 로드하는 정적 리소스(`style.css`, `version.js`, `calcColor.js`, `main.js`, `shortcut.js`)의 쿼리 스트링(`?v=YYYYMMDDvN`)과 `version.js`의 `CACHE_BUST_TAG`를 항상 동기화한다.
