# UniPalette Project Architecture Rules

## 1. CSS 스타일링 아키텍처 (Single Centralized CSS)
- **정책**: 견본 화면의 스타일은 `style.css` 하나에서, 다른 앱에 딸려 가는 모듈의 스타일은 `unipalette.css` 하나에서 관리한다(2026-11-18 모듈화로 둘로 나눔).
  - `unipalette.css`의 선택자는 모두 `.up-` 접두어를 쓰고, 색은 `.up-dialog` 위의 `--up-*` 토큰만 쓴다. 부르는 앱의 스타일과 섞이지 않게 하기 위함이다.
  - 견본의 `style.css`에는 `button` 같은 전역 요소 선택자를 두지 않는다(모듈 대화상자로 새기 때문).
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
  - `index.html`에서 로드하는 정적 리소스(`unipalette.css`, `style.css`, `version.js`, `calcColor.js`, `unipalette.js`, `i18n.js`, `shortcut.js`, `main.js`)와 `<meta name="build">`의 쿼리 스트링(`?v=YYYYMMDDvN`)과 `version.js`의 `CACHE_BUST_TAG`를 항상 동기화한다.

## 3. 모듈 구조 (UniPalette 모듈)
- 계산 층: `calcColor.js` (DOM을 건드리지 않는 순수 함수). 화면 층: `unipalette.js` (대화상자, `window.UniPalette`). 견본: `index.html` + `main.js` + `shortcut.js`.
- 공개 API: `UniPalette.pick(options) → Promise<string[] | string[][] | null>`, `UniPalette.extract(options)`, `UniPalette.close()`, `isOpen`, `methods`, `defaults`, `storageKey`.
- 돌려주는 모양: 명암 단계 1이면 1차원, 2 이상이면 `colors[색상][단계]`(단계는 어두운 쪽부터). `shape: "grid"`면 늘 2차원.
- 배포: 같은 주소(github.io)로 불러오기와 파일 4개(`version.js`, `calcColor.js`, `unipalette.js`, `unipalette.css`) 복사를 모두 지원한다. API를 바꾸면 SEMVER를 올릴지 사용자에게 묻는다.
- 다국어: 지원 언어는 ko·en·ja·zh. 대화상자 글자는 `unipalette.js`의 `STRINGS`, 예제 화면·설명서·단축키 창은 `i18n.js`의 `STRINGS`에 있다. 화면 글자를 더하거나 고칠 때는 네 언어를 함께 고치고, 언어를 더할 때는 두 사전에 같은 코드로 넣는다. 설명서·단축키 창은 파일을 불러오지 않고 `main.js`가 지금 언어로 만든다.
- Common GUI 판 기록은 `.agents/rules/common-gui.md`.
