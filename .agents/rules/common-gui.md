# WebApp Common GUI 동기화 기록

- 확인한 판: v0.5.6 (2026-11-18)
- 화면 틀: 쓰지 않음 (그래픽은 UniPalette 고유 모양을 유지하고, 설정·기억·버전·설치 같은 동작 규칙만 가져옴)

| 항목 ID | 판 | 결정 | 날짜 | 메모 |
| :--- | :--- | :--- | :--- | :--- |
| update-notice | v0.5.6 | 적용 | 2026-11-18 | 견본 앱(index.html). `<meta name="build">`를 비교. file://에서는 끔 |
| install | v0.5.6 | 적용 | 2026-11-18 | manifest.webmanifest, icon-192/512/maskable-512 (icon.svg에서 뽑음) |
| slide-keys | v0.5.6 | 해당 없음 | 2026-11-18 | 슬라이드 없음 |
| image-viewer | v0.5.5 | 해당 없음 | 2026-11-18 | 크게 볼 그림 없음 |
| report | v0.5.5 | 해당 없음 | 2026-11-18 | 보고서 문서 없음 |

## v0.5.4 이전 규칙 중 가져온 것

| 규칙 | 어디에 |
| :--- | :--- |
| 설정 기억 (키 끝에 판 번호, 항목별 검증, 실패 시 기본값과 경고) | 모듈 `unipalette_settings_v1`, 견본 `unipalette_app_settings_v1` |
| 단축키 (입력 중·조합키 무시, Esc는 바꿀 수 없음, 바꾼 키는 별도 키에 기억) | 모듈 대화상자 안, 바꾸기는 견본의 「단축키」 모달 (`unipalette_shortcuts`) |
| 오류 경계 (「문제가 생겼습니다」, 이유 한 줄, 다시 시도) | 모듈 대화상자 본문, 견본 `#appMain` |
| 버전 두 가지와 캐시 갱신 | `version.js` (SEMVER는 승인제, CACHE_BUST_TAG는 수정마다) |
| 좁은 화면 | 모듈·견본 모두 560px 아래에서 한 줄 배치 |
| 테마 | 모듈 `theme` 옵션: auto · light · dark (auto는 시스템 설정) |
| 언어 전환 | 견본 헤더의 언어 고르기(`unipalette_app_settings_v1.lang`), 모듈 `lang` 옵션(auto는 브라우저 언어) |
| 테마 전환 (밝게·어둡게·스톤·네이비, 고른 것 기억) | 견본 헤더의 「배색」 패널. 4종에 UniPalette로 고르는 「내 배색」을 더함 (`unipalette_app_settings_v2`) |
