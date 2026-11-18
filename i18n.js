/**
 * @fileoverview UniPalette 견본 화면의 다국어 사전과 적용기 (window.I18n)
 * - 대화상자(모듈)의 글자는 unipalette.js 안에 따로 있다. 이 파일은 견본 화면·설명서·단축키 창만 다룬다.
 * - HTML에는 data-i18n="키"(글자), data-i18n-attr="속성:키;속성:키"(속성)를 붙이고 I18n.apply()로 채운다.
 * - 언어를 더할 때는 STRINGS에 같은 키를 갖춘 묶음을 넣고, unipalette.js의 STRINGS에도 같은 언어를 넣는다.
 */

(function (global) {
    'use strict';

    const STRINGS = {
        ko: {
            docTitle: 'UniPalette - 인지 균일 색상 추출기',
            role_primary: '테마색', role_sub1: '서브 테마색 1', role_sub2: '서브 테마색 2', role_sub3: '서브 테마색 3', role_highlight: '하이라이트색', schemeRolesTitle: '이 배색의 역할', interfaceLabel: '버튼·인터페이스색', interfaceBadge: '인터페이스', sub1Short: '서브 1', sub2Short: '서브 2', sub3Short: '서브 3', schemeHint: '서로 떨어진 색 5개 이상을 고르면, 첫 색이 테마색, 가장 먼 색이 하이라이트색, 나머지가 테마색에서 가까운 순서로 서브 테마색 1·2·3이 됩니다. 고르는 동안 화면에 바로 반영되고, 취소하면 되돌아갑니다.',
            scheme: '배색', scheme_light: '밝게', scheme_dark: '어둡게', scheme_stone: '스톤', scheme_navy: '네이비', schemeCustom: '내 배색', schemePick: 'UniPalette로 고르기', schemePickTitle: '배색 고르기', schemeDarkBase: '어두운 바탕', schemeAdjusted: '글자 대비가 부족해 글자 명도를 고쳤습니다.',
            shortcut: '단축키', help: '설명서', language: '언어',
            exampleTitle: '모듈 예제',
            exampleDesc: '<code>UniPalette.pick()</code>을 부르는 예제입니다. 칸을 비우면 그 인자는 넘기지 않고 default를 씁니다. remember가 켜져 있으면 마지막에 고른 값이 default를 대신합니다.',
            inputArgs: 'Input arguments', defaultWord: 'default',
            argBase: '기준 색상 (HEX)', argCount: '추출 개수 (2~36)', argSteps: '명암 단계 (1~10)', argMethod: '추출 방법',
            argLightMin: '명암 최솟값 (0~100)', argLightMax: '명암 최댓값 (0~100)', argShape: '돌려받는 모양',
            argTheme: '대화상자 테마', argLang: '대화상자 언어', argTitle: '대화상자 제목', argRemember: '마지막 값 기억하기',
            shapeAuto: 'default: auto: 단계가 1이면 1차원', shapeGrid: 'grid: 늘 [색상][단계]',
            followPage: 'default: 이 화면을 따름',
            pick: '팔레트 고르기', pickHint: 'P',
            resultTitle: '돌려받은 값', copyAsCode: '코드로 복사', notPicked: '아직 고르지 않았습니다.',
            resultGrid: '// [색상 {c}][단계 {s}]', resultFlat: '// 색 {n}개',
            usageTitle: '다른 앱에서 쓰기',
            usageDesc: '주소로 불러오거나, 파일 네 개(<code>version.js</code>, <code>calcColor.js</code>, <code>unipalette.js</code>, <code>unipalette.css</code>)를 복사해 넣습니다. 순서는 아래와 같습니다.',
            usageLoad: '주소로 불러오기 (파일을 복사해 넣었다면 앞의 주소를 지웁니다)',
            usagePick: '고르면 색 배열, 취소하면 null', usageShape: 'steps가 1이면 [\'#..\', ...], 2 이상이면 [[\'#..\', ...], ...] (colors[색상][단계])',
            usageExtract: '화면 없이 같은 옵션으로 바로 계산',
            cancelled: '취소했습니다.', copied: '클립보드에 복사되었습니다.', hexCopied: '{hex} 코드가 복사되었습니다.',
            copyFailed: '복사에 실패했습니다.', openFailed: '대화상자를 열지 못했습니다.', loadFailed: '콘텐츠를 불러오는 데 실패했습니다.',
            newVersion: '새 버전이 있습니다', reload: '새로 고침', close: '닫기',
            errorTitle: '문제가 생겼습니다', retry: '다시 시도',
            helpTitle: '사용 설명서 및 알고리즘 정보', helpMethods: '1. 통합 색상 추출 방법 안내', helpPresets: '2. 고정 색상 프리셋 정보',
            helpLinear: 'HSL 색상 원통 공간 상에서 360°를 등간격으로 선형 분할합니다.',
            helpHslAdapt: 'HSL 공간 상에서 선형으로 색을 쪼개되, 각 색조별로 인간 눈이 감지하는 시각적 밝기를 고려하여 <strong>상대 휘도(Relative Luminance)</strong>를 계산하여 명도(Lightness)를 적응형으로 조정합니다.',
            helpMacadam: '인간 시각의 <strong>색 변별력 한계(MacAdam Ellipse)</strong> 특성을 모델링하여 비선형 분할합니다. 눈이 둔감하게 구별하는 녹색 부근은 각도 간격을 크게 넓히고, 미세한 차이도 기민하게 감지하는 적색 및 청색 부근은 매우 조밀하게 쪼개어 진정한 인지적 등간격을 이끌어냅니다.',
            helpHslMacadam: '앞선 두 개의 고수준 보정을 동시에 결합합니다. <strong>MacAdam Ellipse</strong>에 근거해 Hue 각도를 시각적으로 최적화된 비선형 세그먼트로 분할한 후, 동시에 <strong>상대 휘도 보정</strong>을 가동해 명도를 세밀히 튜닝하여, 색상과 명도 모두에서 시각적 균일성을 얻는 복합 알고리즘입니다.',
            helpOklab: 'HSL 공간의 비선형 오차를 탈피하고 <strong>Oklab 3D 벡터 인지 색 공간</strong>상에서 다이렉트로 회전 연산을 처리합니다. 기준 색상을 <code>sRGB &rarr; XYZ &rarr; LMS &rarr; Oklab</code>으로 변환한 뒤, 무채색축을 기점으로 N 등분각만큼 회전하고, 감마 역보정과 클리핑을 거쳐 sRGB/HEX 코드로 역산합니다.',
            helpCiede: '인간 시각의 색 정밀 인지 거리 연산 공식인 <strong>CIEDE2000</strong>을 기반으로 최적화 탐색을 수행합니다. 각 각도에 따라 기준 색상과 인지적으로 일치하는 색차 거리를 갖도록 명도를 계산하여 색조별 시각적 구별도를 극대화합니다.',
            helpPpt: '<strong>PowerPoint 기본색</strong>: 파워포인트 기본 디자인 도구에서 자주 쓰이는 대표 색상 7가지입니다. (7x1)',
            helpRainbow: '<strong>무지개색 (MS Office)</strong>: 마이크로소프트 오피스의 스탠다드 무지개 10선 색상표입니다. (10x1)',
            helpGoogle: '<strong>구글 캘린더/행아웃색</strong>: 구글 서비스에서 사용되는 밝고 가시성 높은 24종의 캘린더 팔레트입니다. (8x3)',
            scTitle: '단축키 설정',
            scDesc: '아래의 버튼을 클릭한 후, 원하는 키보드 키를 입력하여 단축키를 변경하세요. 단축키는 색 고르기 대화상자 안에서 동작하며, 글자를 입력하는 칸에서는 동작하지 않습니다.',
            scAction: '동작', scPrimary: '기본 단축키', scSecondary: '대체 단축키',
            sc_increaseCount: '추출 개수 증가', sc_decreaseCount: '추출 개수 감소', sc_increaseLightSteps: '명암 단계 증가', sc_decreaseLightSteps: '명암 단계 감소',
            scFixedTitle: '고정 단축키 안내',
            scFixedMethods: '<strong>[a]~[f]</strong>: 색상 추출 방법 전환', scFixedPresets: '<strong>[x], [y], [z]</strong>: PPT 기본색 / 무지개색 / 구글색 프리셋 전환',
            scFixedDialog: '<strong>Esc</strong>: 취소, <strong>Enter</strong>: 선택 (바꿀 수 없음)', scFixedPage: '<strong>P</strong>: 이 화면에서 대화상자 열기',
            save: '저장', reset: '초기화', pressKey: '키를 입력하세요...', scSaved: '단축키 설정이 저장되었습니다.', none: '없음'
        },
        en: {
            docTitle: 'UniPalette - Perceptually uniform palette extractor',
            role_primary: 'Theme', role_sub1: 'Sub theme 1', role_sub2: 'Sub theme 2', role_sub3: 'Sub theme 3', role_highlight: 'Highlight', schemeRolesTitle: 'Roles in this scheme', interfaceLabel: 'Buttons & UI color', interfaceBadge: 'UI', sub1Short: 'Sub 1', sub2Short: 'Sub 2', sub3Short: 'Sub 3', schemeHint: 'Pick 5 or more well-separated colors: the first becomes the theme color, the farthest becomes the highlight, and the rest become sub theme 1, 2, 3 from nearest to the theme. The page updates live while you pick; cancelling restores it.',
            scheme: 'Colors', scheme_light: 'Light', scheme_dark: 'Dark', scheme_stone: 'Stone', scheme_navy: 'Navy', schemeCustom: 'My colors', schemePick: 'Pick with UniPalette', schemePickTitle: 'Pick app colors', schemeDarkBase: 'Dark background', schemeAdjusted: 'Text contrast was too low, so the text lightness was adjusted.',
            shortcut: 'Shortcuts', help: 'Guide', language: 'Language',
            exampleTitle: 'Module example',
            exampleDesc: 'An example that calls <code>UniPalette.pick()</code>. An empty field is not passed and its default is used. With remember on, the last picked value replaces the default.',
            inputArgs: 'Input arguments', defaultWord: 'default',
            argBase: 'Base color (HEX)', argCount: 'Count (2–36)', argSteps: 'Lightness steps (1–10)', argMethod: 'Extraction method',
            argLightMin: 'Minimum lightness (0–100)', argLightMax: 'Maximum lightness (0–100)', argShape: 'Returned shape',
            argTheme: 'Dialog theme', argLang: 'Dialog language', argTitle: 'Dialog title', argRemember: 'Remember last values',
            shapeAuto: 'default: auto: 1-D when steps is 1', shapeGrid: 'grid: always [hue][step]',
            followPage: 'default: follow this page',
            pick: 'Pick a palette', pickHint: 'P',
            resultTitle: 'Returned value', copyAsCode: 'Copy as code', notPicked: 'Nothing picked yet.',
            resultGrid: '// [hue {c}][step {s}]', resultFlat: '// {n} colors',
            usageTitle: 'Use it in another app',
            usageDesc: 'Load it by URL, or copy four files (<code>version.js</code>, <code>calcColor.js</code>, <code>unipalette.js</code>, <code>unipalette.css</code>) into your app, in this order.',
            usageLoad: 'Load by URL (drop the URL prefix if you copied the files)',
            usagePick: 'Resolves to a color array, or null when cancelled', usageShape: 'steps 1 gives [\'#..\', ...]; 2 or more gives [[\'#..\', ...], ...] (colors[hue][step])',
            usageExtract: 'Compute directly with the same options, no dialog',
            cancelled: 'Cancelled.', copied: 'Copied to clipboard.', hexCopied: 'Copied {hex}.',
            copyFailed: 'Copy failed.', openFailed: 'Could not open the dialog.', loadFailed: 'Could not load the content.',
            newVersion: 'A new version is available', reload: 'Reload', close: 'Close',
            errorTitle: 'Something went wrong', retry: 'Try again',
            helpTitle: 'Guide and algorithms', helpMethods: '1. Extraction methods', helpPresets: '2. Fixed color presets',
            helpLinear: 'Splits the 360° of the HSL color cylinder into equal angles.',
            helpHslAdapt: 'Splits hues linearly in HSL, then adjusts lightness per hue using <strong>relative luminance</strong> so each color looks equally bright.',
            helpMacadam: 'Models the <strong>limits of color discrimination (MacAdam ellipses)</strong>: wide steps around green, where the eye is less sensitive, and dense steps around red and blue.',
            helpHslMacadam: 'Combines both: MacAdam-based hue segments with <strong>relative luminance correction</strong>, for evenness in both hue and lightness.',
            helpOklab: 'Rotates directly in the <strong>Oklab perceptual color space</strong>: converts <code>sRGB &rarr; XYZ &rarr; LMS &rarr; Oklab</code>, rotates around the neutral axis in N equal angles, then converts back to sRGB/HEX with gamma correction and clipping.',
            helpCiede: 'Searches lightness per hue so each color has a target <strong>CIEDE2000</strong> distance from the base color, maximising perceived separation.',
            helpPpt: '<strong>PowerPoint defaults</strong>: 7 representative colors from PowerPoint\'s design tools. (7x1)',
            helpRainbow: '<strong>Rainbow (MS Office)</strong>: Microsoft Office\'s standard 10-color rainbow. (10x1)',
            helpGoogle: '<strong>Google Calendar colors</strong>: 24 bright, legible calendar colors used in Google services. (8x3)',
            scTitle: 'Shortcut settings',
            scDesc: 'Click a button, then press the key you want. Shortcuts work inside the color dialog, and not while typing in a text field.',
            scAction: 'Action', scPrimary: 'Primary', scSecondary: 'Secondary',
            sc_increaseCount: 'More colors', sc_decreaseCount: 'Fewer colors', sc_increaseLightSteps: 'More lightness steps', sc_decreaseLightSteps: 'Fewer lightness steps',
            scFixedTitle: 'Fixed shortcuts',
            scFixedMethods: '<strong>[a]–[f]</strong>: switch extraction method', scFixedPresets: '<strong>[x], [y], [z]</strong>: PowerPoint / Rainbow / Google presets',
            scFixedDialog: '<strong>Esc</strong>: cancel, <strong>Enter</strong>: select (cannot be changed)', scFixedPage: '<strong>P</strong>: open the dialog on this page',
            save: 'Save', reset: 'Reset', pressKey: 'Press a key...', scSaved: 'Shortcuts saved.', none: 'None'
        },
        ja: {
            docTitle: 'UniPalette - 知覚均等カラーパレット抽出',
            role_primary: 'テーマ色', role_sub1: 'サブテーマ色 1', role_sub2: 'サブテーマ色 2', role_sub3: 'サブテーマ色 3', role_highlight: 'ハイライト色', schemeRolesTitle: 'この配色の役割', interfaceLabel: 'ボタン・UI 色', interfaceBadge: 'UI', sub1Short: 'サブ 1', sub2Short: 'サブ 2', sub3Short: 'サブ 3', schemeHint: '互いに離れた 5 色以上を選ぶと、最初の色がテーマ色、最も遠い色がハイライト色、残りがテーマ色に近い順にサブテーマ色 1・2・3 になります。選んでいる間は画面にすぐ反映され、キャンセルすると元に戻ります。',
            scheme: '配色', scheme_light: 'ライト', scheme_dark: 'ダーク', scheme_stone: 'ストーン', scheme_navy: 'ネイビー', schemeCustom: 'マイ配色', schemePick: 'UniPalette で選ぶ', schemePickTitle: '配色を選ぶ', schemeDarkBase: '暗い背景', schemeAdjusted: '文字のコントラストが足りないため、文字の明度を調整しました。',
            shortcut: 'ショートカット', help: '説明書', language: '言語',
            exampleTitle: 'モジュールの例',
            exampleDesc: '<code>UniPalette.pick()</code> を呼び出す例です。空欄の引数は渡さず default を使います。remember がオンなら、最後に選んだ値が default の代わりになります。',
            inputArgs: 'Input arguments', defaultWord: 'default',
            argBase: '基準色 (HEX)', argCount: '抽出数 (2〜36)', argSteps: '明度段階 (1〜10)', argMethod: '抽出方法',
            argLightMin: '明度の最小値 (0〜100)', argLightMax: '明度の最大値 (0〜100)', argShape: '戻り値の形',
            argTheme: 'ダイアログのテーマ', argLang: 'ダイアログの言語', argTitle: 'ダイアログのタイトル', argRemember: '最後の値を記憶',
            shapeAuto: 'default: auto: 段階が 1 なら 1 次元', shapeGrid: 'grid: 常に [色相][段階]',
            followPage: 'default: この画面に合わせる',
            pick: 'パレットを選ぶ', pickHint: 'P',
            resultTitle: '戻り値', copyAsCode: 'コードとしてコピー', notPicked: 'まだ選んでいません。',
            resultGrid: '// [色相 {c}][段階 {s}]', resultFlat: '// {n} 色',
            usageTitle: '他のアプリで使う',
            usageDesc: 'URL で読み込むか、4 つのファイル(<code>version.js</code>、<code>calcColor.js</code>、<code>unipalette.js</code>、<code>unipalette.css</code>)をコピーします。順序は次のとおりです。',
            usageLoad: 'URL で読み込む(ファイルをコピーした場合は URL の前半を消す)',
            usagePick: '選ぶと色の配列、キャンセルすると null', usageShape: 'steps が 1 なら [\'#..\', ...]、2 以上なら [[\'#..\', ...], ...] (colors[色相][段階])',
            usageExtract: 'ダイアログなしで同じオプションから直接計算',
            cancelled: 'キャンセルしました。', copied: 'クリップボードにコピーしました。', hexCopied: '{hex} をコピーしました。',
            copyFailed: 'コピーに失敗しました。', openFailed: 'ダイアログを開けませんでした。', loadFailed: '内容を読み込めませんでした。',
            newVersion: '新しいバージョンがあります', reload: '再読み込み', close: '閉じる',
            errorTitle: '問題が発生しました', retry: 'やり直す',
            helpTitle: '説明書とアルゴリズム', helpMethods: '1. 抽出方法', helpPresets: '2. 固定プリセット',
            helpLinear: 'HSL 色空間の 360° を等間隔に分割します。',
            helpHslAdapt: 'HSL で色相を等分し、色相ごとに<strong>相対輝度</strong>を計算して、見た目の明るさがそろうよう明度を調整します。',
            helpMacadam: '<strong>色の弁別限界(MacAdam 楕円)</strong>をモデル化し、目が鈍い緑付近は広く、敏感な赤・青付近は細かく分割します。',
            helpHslMacadam: 'MacAdam 楕円による色相分割と<strong>相対輝度補正</strong>を組み合わせ、色相と明度の両方で均一さを得ます。',
            helpOklab: '<strong>Oklab 知覚色空間</strong>で直接回転します。<code>sRGB &rarr; XYZ &rarr; LMS &rarr; Oklab</code> に変換し、無彩色軸の周りを N 等分の角度で回し、ガンマ補正とクリッピングで sRGB/HEX に戻します。',
            helpCiede: '<strong>CIEDE2000</strong> 色差で基準色から目標の距離になるよう色相ごとに明度を探索し、見分けやすさを最大にします。',
            helpPpt: '<strong>PowerPoint 標準色</strong>: PowerPoint のデザインツールでよく使う代表色 7 色。(7x1)',
            helpRainbow: '<strong>虹色 (MS Office)</strong>: Microsoft Office の標準 10 色の虹。(10x1)',
            helpGoogle: '<strong>Google カレンダー色</strong>: Google のサービスで使われる明るく見やすい 24 色。(8x3)',
            scTitle: 'ショートカット設定',
            scDesc: 'ボタンを押してから、使いたいキーを押してください。ショートカットは色選択ダイアログの中で動き、文字入力欄では動きません。',
            scAction: '動作', scPrimary: '基本', scSecondary: '代替',
            sc_increaseCount: '抽出数を増やす', sc_decreaseCount: '抽出数を減らす', sc_increaseLightSteps: '明度段階を増やす', sc_decreaseLightSteps: '明度段階を減らす',
            scFixedTitle: '固定ショートカット',
            scFixedMethods: '<strong>[a]〜[f]</strong>: 抽出方法の切り替え', scFixedPresets: '<strong>[x]、[y]、[z]</strong>: PowerPoint / 虹色 / Google プリセット',
            scFixedDialog: '<strong>Esc</strong>: キャンセル、<strong>Enter</strong>: 選択(変更不可)', scFixedPage: '<strong>P</strong>: この画面でダイアログを開く',
            save: '保存', reset: '初期化', pressKey: 'キーを押してください...', scSaved: 'ショートカットを保存しました。', none: 'なし'
        },
        zh: {
            docTitle: 'UniPalette - 感知均匀调色板提取器',
            role_primary: '主题色', role_sub1: '副主题色 1', role_sub2: '副主题色 2', role_sub3: '副主题色 3', role_highlight: '高亮色', schemeRolesTitle: '此配色的角色', interfaceLabel: '按钮与界面色', interfaceBadge: '界面', sub1Short: '副 1', sub2Short: '副 2', sub3Short: '副 3', schemeHint: '选择 5 种以上相距较远的颜色:第一种成为主题色,最远的成为高亮色,其余按与主题色由近到远成为副主题色 1、2、3。选择时页面实时更新,取消则恢复。',
            scheme: '配色', scheme_light: '浅色', scheme_dark: '深色', scheme_stone: '石色', scheme_navy: '藏青', schemeCustom: '我的配色', schemePick: '用 UniPalette 选择', schemePickTitle: '选择配色', schemeDarkBase: '深色背景', schemeAdjusted: '文字对比度不足,已调整文字明度。',
            shortcut: '快捷键', help: '说明', language: '语言',
            exampleTitle: '模块示例',
            exampleDesc: '调用 <code>UniPalette.pick()</code> 的示例。留空的参数不会传入,使用 default。开启 remember 时,上次选择的值会代替 default。',
            inputArgs: 'Input arguments', defaultWord: 'default',
            argBase: '基准色 (HEX)', argCount: '提取数量 (2–36)', argSteps: '明度级数 (1–10)', argMethod: '提取方法',
            argLightMin: '明度最小值 (0–100)', argLightMax: '明度最大值 (0–100)', argShape: '返回形状',
            argTheme: '对话框主题', argLang: '对话框语言', argTitle: '对话框标题', argRemember: '记住上次的值',
            shapeAuto: 'default: auto: 级数为 1 时为一维', shapeGrid: 'grid: 始终为 [色相][级数]',
            followPage: 'default: 跟随本页面',
            pick: '选择调色板', pickHint: 'P',
            resultTitle: '返回值', copyAsCode: '复制为代码', notPicked: '尚未选择。',
            resultGrid: '// [色相 {c}][级数 {s}]', resultFlat: '// {n} 色',
            usageTitle: '在其他应用中使用',
            usageDesc: '通过网址加载,或复制四个文件(<code>version.js</code>、<code>calcColor.js</code>、<code>unipalette.js</code>、<code>unipalette.css</code>),顺序如下。',
            usageLoad: '通过网址加载(如已复制文件,请去掉网址前缀)',
            usagePick: '选择后返回颜色数组,取消则返回 null', usageShape: 'steps 为 1 时为 [\'#..\', ...],2 以上为 [[\'#..\', ...], ...] (colors[色相][级数])',
            usageExtract: '不打开对话框,用相同选项直接计算',
            cancelled: '已取消。', copied: '已复制到剪贴板。', hexCopied: '已复制 {hex}。',
            copyFailed: '复制失败。', openFailed: '无法打开对话框。', loadFailed: '无法加载内容。',
            newVersion: '有新版本', reload: '刷新', close: '关闭',
            errorTitle: '出现了问题', retry: '重试',
            helpTitle: '使用说明与算法', helpMethods: '1. 提取方法', helpPresets: '2. 固定预设',
            helpLinear: '将 HSL 色彩圆柱的 360° 等角度分割。',
            helpHslAdapt: '在 HSL 中等分色相,再按色相计算<strong>相对亮度</strong>调整明度,使各颜色看起来同样明亮。',
            helpMacadam: '模拟<strong>颜色辨别极限(MacAdam 椭圆)</strong>:人眼不敏感的绿色附近间隔大,敏感的红色和蓝色附近间隔小。',
            helpHslMacadam: '结合 MacAdam 椭圆的色相分割与<strong>相对亮度校正</strong>,使色相和明度都均匀。',
            helpOklab: '直接在 <strong>Oklab 感知色彩空间</strong>中旋转:转换 <code>sRGB &rarr; XYZ &rarr; LMS &rarr; Oklab</code>,绕无彩色轴按 N 等分角度旋转,再经伽马校正与裁剪转回 sRGB/HEX。',
            helpCiede: '按色相搜索明度,使每个颜色与基准色的 <strong>CIEDE2000</strong> 色差达到目标距离,最大化可辨性。',
            helpPpt: '<strong>PowerPoint 默认色</strong>:PowerPoint 设计工具中常用的 7 种代表色。(7x1)',
            helpRainbow: '<strong>彩虹色 (MS Office)</strong>:Microsoft Office 的标准 10 色彩虹。(10x1)',
            helpGoogle: '<strong>Google 日历色</strong>:Google 服务中使用的 24 种明亮易读的日历颜色。(8x3)',
            scTitle: '快捷键设置',
            scDesc: '点击按钮后按下想用的键。快捷键在选色对话框内生效,在文字输入框中不生效。',
            scAction: '操作', scPrimary: '主键', scSecondary: '备用键',
            sc_increaseCount: '增加数量', sc_decreaseCount: '减少数量', sc_increaseLightSteps: '增加明度级数', sc_decreaseLightSteps: '减少明度级数',
            scFixedTitle: '固定快捷键',
            scFixedMethods: '<strong>[a]–[f]</strong>:切换提取方法', scFixedPresets: '<strong>[x]、[y]、[z]</strong>:PowerPoint / 彩虹色 / Google 预设',
            scFixedDialog: '<strong>Esc</strong>:取消,<strong>Enter</strong>:选择(不可更改)', scFixedPage: '<strong>P</strong>:在本页面打开对话框',
            save: '保存', reset: '重置', pressKey: '请按键...', scSaved: '快捷键已保存。', none: '无'
        }
    };

    let current = 'ko';

    function t(key, vars) {
        let text = STRINGS[current][key];
        if (text === undefined) text = STRINGS.en[key];
        if (text === undefined) text = key;
        if (vars) Object.keys(vars).forEach(k => { text = text.split('{' + k + '}').join(vars[k]); });
        return text;
    }

    /** data-i18n(글자, HTML 허용: 사전은 이 파일에서만 오므로 신뢰한다)와 data-i18n-attr(속성)을 채운다 */
    function apply(root) {
        const scope = root || document;
        scope.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
        scope.querySelectorAll('[data-i18n-attr]').forEach(el => {
            el.dataset.i18nAttr.split(';').forEach(pair => {
                const [attr, key] = pair.split(':');
                if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
            });
        });
    }

    function setLang(code) {
        current = STRINGS[code] ? code : 'en';
        document.documentElement.lang = current;
        document.title = t('docTitle');
        apply();
    }

    global.I18n = {
        t,
        apply,
        setLang,
        get lang() { return current; },
        supported: Object.keys(STRINGS)
    };
})(window);
