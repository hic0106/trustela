// Trustela UI 다국어 사전 (경량 클라이언트 i18n).
// 새 언어 추가: Locale 유니온에 코드 추가 → LOCALES에 라벨 추가 → translations에 블록 추가.

export type Locale = "en" | "ko" | "ja" | "zh";

/** 언어 선택기에 표시할 목록. 첫 항목이 기본 폴백. */
export const LOCALES: { code: Locale; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
  { code: "zh", label: "中文" },
];

/** UI 문자열 키. 모든 언어 블록이 같은 키를 가져야 한다. */
export interface Strings {
  tagline: string;
  promptLabel: string;
  selfBrandLabel: string;
  competitorsLabel: string;
  competitorsHint: string;
  enginesLabel: string;
  classifyLabel: string;
  analyze: string;
  analyzing: string;
  shareOfVoiceTitle: string;
  timelineTitle: string;
  timelineNeedMore: string;
  classificationTitle: string;
  selfBadge: string;
  topBrandLabel: string;
  none: string;
  selfWord: string;
  sovWord: string;
  enginesMentioned: string;
  bestRank: string;
  notShown: string;
  requestFailed: (status: number) => string;
}

export const translations: Record<Locale, Strings> = {
  en: {
    tagline:
      "Measure whether AI search recommends your brand — Share of Voice, ranking, and conversion citations.",
    promptLabel: "Prompt (what a shopper asks the AI)",
    selfBrandLabel: "Your brand",
    competitorsLabel: "Competitors",
    competitorsHint: "comma-separated",
    enginesLabel: "Engines:",
    classifyLabel: "Conversion citation analysis",
    analyze: "Analyze",
    analyzing: "Analyzing… (may take a while)",
    shareOfVoiceTitle: "Share of Voice",
    timelineTitle: "Share of Voice over time",
    timelineNeedMore: "Run this prompt again later to see the trend.",
    classificationTitle: "Conversion citation analysis",
    selfBadge: "◀ you",
    topBrandLabel: "Top brand",
    none: "none",
    selfWord: "Your brand",
    sovWord: "SoV",
    enginesMentioned: "engines mentioned",
    bestRank: "best rank",
    notShown: "not shown",
    requestFailed: (status) => `Request failed (${status})`,
  },
  ko: {
    tagline: "AI 검색이 당신 브랜드를 추천하는지 측정하세요 — SoV·순위·전환형 인용.",
    promptLabel: "프롬프트 (쇼핑객이 AI에 묻는 질문)",
    selfBrandLabel: "자사 브랜드",
    competitorsLabel: "경쟁사",
    competitorsHint: "쉼표로 구분",
    enginesLabel: "엔진:",
    classifyLabel: "전환형 인용 분류",
    analyze: "분석하기",
    analyzing: "분석 중… (수십 초)",
    shareOfVoiceTitle: "Share of Voice",
    timelineTitle: "시간별 Share of Voice",
    timelineNeedMore: "나중에 같은 프롬프트를 다시 실행하면 추이가 표시됩니다.",
    classificationTitle: "전환형 인용 분류",
    selfBadge: "◀ 자사",
    topBrandLabel: "1위 브랜드",
    none: "없음",
    selfWord: "자사",
    sovWord: "SoV",
    enginesMentioned: "엔진 언급",
    bestRank: "최고순위",
    notShown: "미노출",
    requestFailed: (status) => `요청 실패 (${status})`,
  },
  ja: {
    tagline:
      "AI検索があなたのブランドを推薦しているか測定 — シェア・オブ・ボイス、順位、コンバージョン引用。",
    promptLabel: "プロンプト（買い物客がAIに尋ねる質問）",
    selfBrandLabel: "自社ブランド",
    competitorsLabel: "競合",
    competitorsHint: "カンマ区切り",
    enginesLabel: "エンジン:",
    classifyLabel: "コンバージョン引用の分類",
    analyze: "分析する",
    analyzing: "分析中…（数十秒）",
    shareOfVoiceTitle: "シェア・オブ・ボイス",
    timelineTitle: "時系列のシェア・オブ・ボイス",
    timelineNeedMore: "同じプロンプトを後で再実行すると推移が表示されます。",
    classificationTitle: "コンバージョン引用の分類",
    selfBadge: "◀ 自社",
    topBrandLabel: "1位ブランド",
    none: "なし",
    selfWord: "自社",
    sovWord: "SoV",
    enginesMentioned: "エンジンで言及",
    bestRank: "最高順位",
    notShown: "未表示",
    requestFailed: (status) => `リクエスト失敗 (${status})`,
  },
  zh: {
    tagline: "衡量 AI 搜索是否推荐你的品牌 — 声量占比、排名与转化引用。",
    promptLabel: "提示词（购物者向 AI 提出的问题）",
    selfBrandLabel: "自有品牌",
    competitorsLabel: "竞争对手",
    competitorsHint: "用逗号分隔",
    enginesLabel: "引擎:",
    classifyLabel: "转化引用分类",
    analyze: "开始分析",
    analyzing: "分析中…（可能需要数十秒）",
    shareOfVoiceTitle: "声量占比",
    timelineTitle: "声量占比时间趋势",
    timelineNeedMore: "稍后再次运行相同提示词即可查看趋势。",
    classificationTitle: "转化引用分类",
    selfBadge: "◀ 自有",
    topBrandLabel: "第一品牌",
    none: "无",
    selfWord: "自有品牌",
    sovWord: "SoV",
    enginesMentioned: "个引擎提及",
    bestRank: "最高排名",
    notShown: "未显示",
    requestFailed: (status) => `请求失败 (${status})`,
  },
};

/** 브라우저 언어 코드를 지원 Locale로 매핑(없으면 en). */
export function detectLocale(navigatorLanguages: readonly string[]): Locale {
  for (const lang of navigatorLanguages) {
    const base = lang.toLowerCase().split("-")[0];
    const hit = LOCALES.find((l) => l.code === base);
    if (hit) return hit.code;
  }
  return "en";
}
