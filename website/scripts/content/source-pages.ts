import path from "path";
import type { ContentPageKind } from "../../src/content/types";

export type SourcePage = {
  filePath: string;
  kind: ContentPageKind;
  slug: string;
  sourceUrl: string | null;
};

const SOURCE_PATH = /^\/en\/(articles|collections)\/(\d+-[^/]+)\/?$/;
const PREFIXED_FILENAME = /^(?:[a-z]{2}(?:-[a-z]{2})?)--(articles|collections)--(\d+-[^/]+)\.md$/;

function requiredSourceUrlError(filePath: string): Error {
  return new Error(
    `${filePath}: a valid type-bearing source_url is required for a clean numeric-title filename.`,
  );
}

function parseSourceUrl(filePath: string, sourceUrl: string): Omit<SourcePage, "filePath"> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new Error(`${filePath}: source_url must be a valid type-bearing support URL.`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`${filePath}: source_url must be a valid type-bearing support URL.`);
  }

  if (
    url.hostname !== "support.telnyx.com" ||
    url.port ||
    url.username ||
    url.password
  ) {
    throw new Error(`${filePath}: source_url must be a valid type-bearing support URL.`);
  }

  const match = url.pathname.match(SOURCE_PATH);
  if (!match) {
    throw new Error(`${filePath}: source_url must be a valid type-bearing support URL.`);
  }

  return {
    kind: match[1] === "articles" ? "article" : "collection",
    slug: match[2],
    sourceUrl,
  };
}

export function parseSourcePage(filePath: string, sourceUrl?: string | null): SourcePage {
  const metadataUrl = sourceUrl?.trim();
  if (metadataUrl) {
    return { filePath, ...parseSourceUrl(filePath, metadataUrl) };
  }

  const match = path.basename(filePath).match(PREFIXED_FILENAME);
  if (!match) {
    throw requiredSourceUrlError(filePath);
  }

  return {
    filePath,
    kind: match[1] === "articles" ? "article" : "collection",
    slug: match[2],
    sourceUrl: null,
  };
}

export function parseSourcePages(
  pages: Iterable<{ filePath: string; sourceUrl?: string | null }>,
): SourcePage[] {
  const identities = new Set<string>();
  const parsed: SourcePage[] = [];

  for (const page of pages) {
    const sourcePage = parseSourcePage(page.filePath, page.sourceUrl);
    const identity = `${sourcePage.kind}:${sourcePage.slug}`;
    if (identities.has(identity)) {
      throw new Error(`${page.filePath}: duplicate canonical identity ${identity}.`);
    }
    identities.add(identity);
    parsed.push(sourcePage);
  }

  return parsed;
}
