/**
 * @fileoverview UniPalette 이원화 버전 관리 및 캐시 버스팅 설정 모듈
 * - SEMVER: 정식 시맨틱 버전 (사용자 명시적 승인 시에만 변경)
 * - CACHE_BUST_TAG: 일자 기반 캐시 버스팅 태그 (YYYYMMDDvN 형식, 배포/수정 시 자동 갱신)
 */

const SEMVER = '1.0.0';
const CACHE_BUST_TAG = '20261109v1';
const DISPLAY_VERSION = `v${SEMVER} (${CACHE_BUST_TAG})`;
