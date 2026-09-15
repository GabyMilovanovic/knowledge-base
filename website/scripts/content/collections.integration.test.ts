import fs from "fs";
import path from "path";
import { expect, test } from "bun:test";
import { collectionLinks, recoverCollections } from "./collections";
import { fallbackRootFor } from "./fallback";
import { firstH1, parseFrontmatter } from "./markdown";
import { parseSourcePages } from "./source-pages";
import { applyCollectionMemberships, type MembershipSnapshot } from "./collection-memberships";

const supportDocsDir = path.resolve(import.meta.dir, "..", "..", "..", "support-docs");

test("recovers the checked-in collection hierarchy and assigns every local article", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(supportDocsDir, "_manifest.json"), "utf8")) as { files: string[] };
  const files = manifest.files.filter((filePath) => filePath.endsWith(".md"));
  const sources = files.map((filePath) => ({ filePath, content: fs.readFileSync(path.join(supportDocsDir, filePath), "utf8") }));
  const fixture = {
    filePath: "99999999-fixture-support-article.md",
    content: "---\nsource_url: https://support.telnyx.com/en/articles/99999999-fixture-support-article\ntitle: Stale fixture title\n---\n# SMS fixture article",
  };
  const articleSources = [...sources, fixture];
  const pages = parseSourcePages(articleSources.map(({ filePath, content }) => ({ filePath, sourceUrl: parseFrontmatter(content).fm.source_url })));
  const byFile = new Map(sources.map((source) => [source.filePath, source]));
  const localArticleSlugs = new Set(pages.filter(({ kind }) => kind === "article").map(({ slug }) => slug));
  const roots = pages.filter(({ kind }) => kind === "collection").map((page) => {
    const { fm, body } = parseFrontmatter(byFile.get(page.filePath)!.content);
    return { slug: page.slug, title: fm.title ?? firstH1(body) ?? page.slug, description: fm.description ?? null, sourceUrl: page.sourceUrl, body };
  });
  const collections = recoverCollections(roots, localArticleSlugs);
  const membershipSnapshot = JSON.parse(fs.readFileSync(path.join(supportDocsDir, "_collection-memberships.json"), "utf8")) as MembershipSnapshot;
  applyCollectionMemberships(collections, localArticleSlugs, membershipSnapshot);
  const links = roots.flatMap(({ body, slug }) => collectionLinks(body).filter((link) => link.kind === "collection" && link.slug !== slug));
  const recoveredArticleSlugs = collections.flatMap(({ articleSlugs }) => articleSlugs);
  const recovered = new Set(recoveredArticleSlugs);
  const articleTitles = new Map(
    pages
      .filter(({ kind }) => kind === "article")
      .map((page) => {
        const content = articleSources.find(({ filePath }) => filePath === page.filePath)!.content;
        return [page.slug, firstH1(parseFrontmatter(content).body) ?? page.slug];
      }),
  );
  const fallback = [...localArticleSlugs].filter((slug) => !recovered.has(slug));
  const recoveredChildSlugs = new Set(collections.filter(({ parentPath }) => parentPath).map(({ path }) => path));
  const linkedChildSlugs = new Set(links.map(({ slug }) => slug));
  const rootSlugs = new Set(roots.map(({ slug }) => slug));

  expect(new Set(pages.map(({ filePath }) => filePath))).toEqual(new Set(articleSources.map(({ filePath }) => filePath)));
  expect(new Set(collections.filter(({ parentPath }) => !parentPath).map(({ path }) => path))).toEqual(rootSlugs);
  expect(recoveredChildSlugs).toEqual(linkedChildSlugs);
  expect(recoveredArticleSlugs).toHaveLength(recovered.size);
  expect(recoveredArticleSlugs.every((slug) => localArticleSlugs.has(slug))).toBe(true);
  expect(fallback.every((slug) => collections.some(({ path }) => path === fallbackRootFor(articleTitles.get(slug)!, slug)))).toBe(true);
  expect(fallbackRootFor(articleTitles.get("99999999-fixture-support-article")!, "99999999-fixture-support-article")).toBe("133103-telnyx-sms-guide");
  expect(new Set([...recovered, ...fallback])).toEqual(localArticleSlugs);
});
