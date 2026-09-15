import type { Collection } from "../../src/content/types";

type CollectionSource = {
  slug: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  body: string;
};

type CollectionLink = { kind: "article" | "collection"; slug: string; label: string; heading: boolean };

const SUPPORT_LINK = /https?:\/\/support\.telnyx\.com\/[a-z]{2}(?:-[a-z]{2})?\/(articles|collections)\/(\d+-[^/)?#]+)/g;

function collectionLabel(rawLabel: string, slug: string, heading: boolean): string {
  const label = rawLabel.replace(/^##\s*/, "").trim();
  if (heading) {
    return label;
  }

  const canonicalTitle = slug.replace(/^\d+-/, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (let end = 1; end <= label.length; end++) {
    const candidate = label.slice(0, end).replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (candidate === canonicalTitle) {
      return label.slice(0, end);
    }
  }

  return label;
}

export function collectionLinks(body: string): CollectionLink[] {
  return [...body.matchAll(SUPPORT_LINK)].map((match) => {
    const beforeUrl = body.slice(0, match.index);
    const rawLabel = beforeUrl.slice(beforeUrl.lastIndexOf("[") + 1).replace(/\]\($/, "");
    const heading = /^##\s/.test(rawLabel);
    const label = collectionLabel(rawLabel, match[2], heading);
    return {
      kind: match[1] === "articles" ? "article" : "collection",
      slug: match[2],
      label,
      heading,
    };
  });
}

function collection(slug: string, title: string, parentPath: string | null, sourceUrl: string | null, description: string | null): Collection {
  return {
    path: slug,
    title,
    description,
    sourceUrl,
    sourceSlug: slug,
    intercomCollectionId: slug.match(/^(\d+)/)?.[1] ?? null,
    metadataStub: false,
    parentPath,
    childCollectionPaths: [],
    articleSlugs: [],
  };
}

export function validateCollections(collections: Collection[]): void {
  const byPath = new Map<string, Collection>();
  const articleOwners = new Set<string>();

  for (const item of collections) {
    if (byPath.has(item.path)) {
      throw new Error(`duplicate collection slug ${item.path}.`);
    }
    byPath.set(item.path, item);
    for (const slug of item.articleSlugs) {
      if (articleOwners.has(slug)) {
        throw new Error(`duplicate article membership ${slug}.`);
      }
      articleOwners.add(slug);
    }
  }

  for (const item of collections) {
    if (item.parentPath === item.path) {
      throw new Error(`collection ${item.path} cannot parent itself.`);
    }
    if (item.parentPath && !byPath.has(item.parentPath)) {
      throw new Error(`collection ${item.path} has missing parent ${item.parentPath}.`);
    }
  }

  for (const item of collections) {
    const seen = new Set<string>();
    let current: Collection | undefined = item;
    while (current?.parentPath) {
      if (seen.has(current.path)) {
        throw new Error(`collection cycle includes ${current.path}.`);
      }
      seen.add(current.path);
      current = byPath.get(current.parentPath);
    }
  }
}

export function recoverCollections(sources: CollectionSource[], localArticleSlugs: Set<string>): Collection[] {
  const result = sources.map((source) =>
    collection(source.slug, source.title, null, source.sourceUrl, source.description),
  );
  const byPath = new Map(result.map((item) => [item.path, item]));
  const assigned = new Set<string>();

  for (const source of sources) {
    const root = byPath.get(source.slug)!;
    let active = root;
    for (const link of collectionLinks(source.body)) {
      if (link.kind === "collection") {
        if (link.slug === root.path) {
          continue;
        }
        const parentPath = link.heading ? root.path : active.path;
        if (byPath.has(link.slug)) {
          throw new Error(`collection ${link.slug} has conflicting parents.`);
        }
        const child = collection(link.slug, link.label || link.slug, parentPath, null, null);
        result.push(child);
        byPath.set(child.path, child);
        byPath.get(parentPath)!.childCollectionPaths.push(child.path);
        if (link.heading) {
          active = child;
        }
        continue;
      }
      if (!localArticleSlugs.has(link.slug)) {
        continue;
      }
      if (assigned.has(link.slug)) {
        throw new Error(`duplicate article membership ${link.slug}.`);
      }
      assigned.add(link.slug);
      active.articleSlugs.push(link.slug);
    }
  }

  validateCollections(result);
  return result;
}
