import type { Collection } from "../../src/content/types";

export type MembershipSnapshot = {
  version: number;
  verifiedAt: string;
  collections: {
    path: string;
    sourceUrl: string;
    sourceHtmlSha256: string;
    parentSnapshotFiles: string[];
    articleSlugs: string[];
  }[];
};

// Restore the existing Intercom leaf memberships omitted from the flat scrape.
// This is a frozen migration snapshot, not a new collection taxonomy or scraper
// dependency during builds. Unknown collections/articles fail instead of being
// silently created or dropped.
export function applyCollectionMemberships(
  collections: Collection[],
  localArticles: Set<string>,
  snapshot: MembershipSnapshot,
): void {
  if (snapshot.version !== 1) throw new Error("Unsupported collection membership snapshot version");
  const byPath = new Map(collections.map((collection) => [collection.path, collection]));
  const seenCollections = new Set<string>();
  const ownedArticles = new Set(collections.flatMap((collection) => collection.articleSlugs));

  // Validate everything before mutating the recovered graph.
  for (const entry of snapshot.collections) {
    const collection = byPath.get(entry.path);
    if (!collection) throw new Error(`Membership snapshot cannot create collection ${entry.path}`);
    if (seenCollections.has(entry.path)) throw new Error(`Duplicate membership collection ${entry.path}`);
    seenCollections.add(entry.path);
    if (entry.sourceUrl !== `https://support.telnyx.com/en/collections/${entry.path}`) {
      throw new Error(`Invalid membership source URL for ${entry.path}`);
    }
    if (collection.articleSlugs.length || collection.childCollectionPaths.length) {
      throw new Error(`Membership snapshot must target an empty leaf: ${entry.path}`);
    }
    for (const slug of entry.articleSlugs) {
      if (!localArticles.has(slug)) throw new Error(`Missing local article ${slug} in ${entry.path}`);
      if (ownedArticles.has(slug)) throw new Error(`Duplicate article membership ${slug}`);
      ownedArticles.add(slug);
    }
  }

  for (const entry of snapshot.collections) {
    const collection = byPath.get(entry.path)!;
    collection.articleSlugs.push(...entry.articleSlugs);
    collection.sourceUrl = entry.sourceUrl;
  }
}
