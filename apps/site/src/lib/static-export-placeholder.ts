/**
 * output: "export" では generateStaticParams が [] だとビルドエラーになる。
 * 該当セグメントにコンテンツが0件のときだけダミー param を1つ返し、ページで notFound() する。
 */
export const EXPORT_EMPTY_PLACEHOLDER_SLUG = "__export_empty__";

export function withExportPlaceholder<T extends { slug: string }>(items: T[]): T[] | { slug: string }[] {
  return items.length > 0 ? items : [{ slug: EXPORT_EMPTY_PLACEHOLDER_SLUG }];
}

export function isExportPlaceholderSlug(slug: string): boolean {
  return slug === EXPORT_EMPTY_PLACEHOLDER_SLUG;
}
