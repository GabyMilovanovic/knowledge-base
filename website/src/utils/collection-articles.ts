import type { Collection } from "../content/types";

// A collection's total includes all descendants, without counting an article
// twice if membership overlaps. Keep direct membership unchanged for browsing.
export function collectionArticleCounts(
  collections: readonly Collection[],
  articles: ReadonlyArray<{ slug: string }>,
): Map<string, number> {
  const byPath = new Map(collections.map((item) => [item.path, item]));
  const available = new Set(articles.map((article) => article.slug));

  return new Map(collections.map((collection) => {
    const slugs = new Set<string>();
    const visited = new Set<string>();
    const pending = [collection.path];
    while (pending.length) {
      const path = pending.pop()!;
      if (visited.has(path)) continue;
      visited.add(path);
      const current = byPath.get(path);
      if (!current) continue;
      for (const slug of current.articleSlugs) {
        if (available.has(slug)) slugs.add(slug);
      }
      pending.push(...current.childCollectionPaths);
    }
    return [collection.path, slugs.size];
  }));
}
