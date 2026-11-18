UniPalette는 디자이너와 개발자를 위한 **인지 균일 색상 팔레트 추출 도구**입니다. HSL 색 공간뿐만 아니라 인간의 시각 인지 모델에 근거한 하이엔드 Oklab 및 CIEDE2000 색차 모델을 이용해 균형 잡힌 색상 팔레트를 쉽게 추출하고 대비 감도를 실시간 검토할 수 있습니다.
<a href="https://iseohyun.github.io/UniPalette/" target="_blank">사이트 방문</a>

## 미리보기 (Preview)
<video src="https://github.com/user-attachments/assets/aabbc453-e4a8-4eb2-ad90-3b726077873d" width="800" height="600" controls autoplay muted loop></video>


## 주요 기능

1. **다양한 색상 추출 알고리즘 지원**
   - **[a] 선형 색상 추출**: HSL 실린더 공간 상에서 등간격 각도 분할을 통한 직관적인 기본 팔레트 생성.
   - **[b] 휘도 보정(HSL 적응형)**: 각 Hue별 상대 휘도(Relative Luminance)를 계산해 사람이 느끼는 시각적 밝기를 균일하게 맞추어 보정.
   - **[c] 색상 보정(MacAdam Ellipse)**: 눈이 둔감한 녹색 구간은 넓게, 민감한 적색/청색 구간은 세밀하게 각도를 비선형으로 분할.
   - **[d] 휘도 색상 보정(HSL+MacAdam)**: MacAdam Ellipse 색상 분할과 상대 휘도 보정을 결합한 프리미엄 복합 보정.
   - **[e] 인지적 등간격(Oklab)**: Oklab 3D 벡터 인지 색 공간에서 다이렉트 회전을 처리하여 인지 감도 가중치 보정 적용.
   - **[f] CIEDE2000 고인지 색차 탐색**: 정밀 인지 색차 수식인 CIEDE2000을 바탕으로 각도별 목표 색차 거리를 도달하도록 명도를 자동 탐색 및 보정.

2. **편리한 내장 프리셋**
   - **PowerPoint 기본색 (7x1)**: 파워포인트 오피스 스탠다드 컬러 7가지.
   - **무지개색 (MS, 10x1)**: MS 오피스 표준 10선 무지개 색상표.
   - **구글색 (8x3)**: 구글 캘린더/행아웃에서 사용되는 밝고 가시성 높은 24종 세트 (1~3단계 명암 단계 선택 가능).

3. **고수준 사용자 경험(UX)**
   - **2차원 H-L 컬러 맵**: 가로축(Hue), 세로축(Lightness) 분포 맵 및 기준 마커 드래그 앤 드롭 기능.
   - **인접 대비 확인 스트립**: 생성된 칩들 간의 명도/색상 인접 대비(글자 가독성) 시각 피드백 제공.
   - **다크모드 미리보기**: 라이트/다크 테마 환경에서 팔레트 카드들의 가시성을 실시간 토글하여 체크.
   - **원클릭 클립보드 복사**: 단일 색상 HEX 복사 또는 전체 팔레트를 배열 형태로 코드로 추출.
   - **편리한 단축키 매핑**: 추출 개수 증감, 명암 단계 조절 및 추출 알고리즘 스위칭에 유연한 단축키 설정 바인딩 제공.

## 모듈로 쓰기 (UniPalette.pick)

다른 앱에서 테마 색 등을 뽑을 때 대화상자를 띄우고, 고른 색 배열을 돌려받습니다. 지금의 단독 화면은 이 모듈을 부르는 견본입니다.

```html
<link rel="stylesheet" href="https://iseohyun.github.io/UniPalette/unipalette.css">
<script src="https://iseohyun.github.io/UniPalette/version.js"></script>
<script src="https://iseohyun.github.io/UniPalette/calcColor.js"></script>
<script src="https://iseohyun.github.io/UniPalette/unipalette.js"></script>
<script>
  const colors = await UniPalette.pick({ base: "#3B82F6", count: 8, steps: 3, method: "oklab" });
  // steps 1  → ["#3B82F6", ...]
  // steps 2+ → [["#..", "#..", "#.."], ...]  (colors[색상][단계], 단계는 어두운 쪽부터)
  // 취소     → null
</script>
```

- 파일 네 개(`version.js`, `calcColor.js`, `unipalette.js`, `unipalette.css`)를 복사해 넣어도 됩니다.
- 옵션: `base`, `count`(2~36), `steps`(1~10), `method`, `lightMin`, `lightMax`, `shape`(`auto` | `grid`), `theme`(`auto` | `light` | `dark`), `lang`(`auto` | `ko` | `en` | `ja` | `zh`, auto는 브라우저 언어), `title`, `remember`(기본 켬), `storageKey`.
- 넘긴 옵션이 앞서고, 넘기지 않은 항목은 마지막에 고른 값(`unipalette_settings_v1`) → 기본값 순으로 채웁니다.
- 화면 없이 계산만: `UniPalette.extract(options)` (같은 모양의 배열).
- 대화상자 안의 단축키는 단독 화면과 같습니다(개수 `+`/`-`, 명암 단계 `*`/`/`, 방법 `a`~`f`, 프리셋 `x`~`z`, Esc 취소, Enter 선택).

## 기본 설정 정보

- **추출 개수 및 명암 단계**: `8 x 1`
- **기본 추출 방법**: `[a] 선형 색상 추출`

## 시작하기

- **설치 요구사항**: 별도의 서버나 패키지 설치가 필요하지 않습니다.
- **실행**: 프로젝트 폴더의 `index.html` 파일을 크롬, 파이어폭스, 사파리, 엣지 등의 웹 브라우저에서 직접 더블 클릭하여 실행합니다.

## 파일 구조

- `unipalette.js`: 모듈. 대화상자(`UniPalette.pick`)와 계산만 하는 `UniPalette.extract`.
- `unipalette.css`: 모듈 스타일(`.up-` 접두어, 라이트/다크 토큰).
- `calcColor.js`: sRGB-Oklab 변환, CIEDE2000 연산 및 색상 추출 알고리즘 라이브러리(DOM 없음).
- `version.js`: 시맨틱 버전(`SEMVER`) 및 캐시 버스팅 태그(`CACHE_BUST_TAG`) 이원화 관리 모듈.
- `index.html` / `main.js` / `style.css`: 모듈 예제 화면(Input arguments 목록 → 대화상자 → 돌려받은 배열), 설명서·단축키 창, 새 판 알림, 다크모드·언어 기억.
- `i18n.js`: 예제 화면·설명서·단축키 창의 다국어 사전(한국어·English·日本語·中文). 대화상자의 글자는 `unipalette.js` 안에 있습니다.
- `shortcut.js`: 단축키 바꾸기 동작(저장 키 `unipalette_shortcuts`, 대화상자가 읽어 씀).
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`: 홈 화면 설치.
- `icon.svg` / `icon.png`: 브랜드 로고 및 파비콘(설치 아이콘의 원본은 `icon.svg`).
