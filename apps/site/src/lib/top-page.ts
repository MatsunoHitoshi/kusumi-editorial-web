/**
 * トップページの文言・目次は `local-resources/ページコンテンツ原案/top.md` に対応。
 * 各 `href` は publish スナップショットの type=page の slug と一致（先頭の `/` のみ付与、`/pages/` は付けない）。
 */
export const topPageIntro = {
  labName: "楠見清研究室",
  studioName: "エディティングスタジオ",
  affiliations: [
    "東京都立大学大学院システムデザイン研究科インダストリアルアート学域",
    "東京都立大学システムデザイン学部インダストリアルアート学科"
  ]
} as const;

/** top.md 7 行目以降の並び（エディティングスタジオ〜コンタクト） */
export const topPageTableOfContents: readonly { label: string; href: string }[] = [
  { label: "エディティングスタジオ", href: "/about" },
  { label: "担当教員", href: "/faculty" },
  { label: "学生の研究", href: "/student-research" },
  { label: "プロジェクト", href: "/project" },
  { label: "学生成果展", href: "/student-exhibition" },
  { label: "出版物", href: "/publications" },
  { label: "読書会", href: "/reading" },
  { label: "コンタクト", href: "/contact" }
];
