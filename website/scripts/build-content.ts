import fs from "fs";
import path from "path";
import type { Article, Collection } from "../src/content/types";
import {
  cleanArticle,
  rewriteLegacyArticleLinks,
  stripFeedbackTrailer,
} from "../src/utils/clean-article";
import { parseSourcePages } from "./content/source-pages";
import { recoverCollections } from "./content/collections";
import { fallbackRootFor } from "./content/fallback";
import { copyArticleImages, copyThemeFonts, writeArticleBodies } from "./content/assets";
import { firstH1, parseFrontmatter } from "./content/markdown";

const supportDocsDir = path.resolve(import.meta.dir, "..", "..", "support-docs");
const manifestPath = path.join(supportDocsDir, "_manifest.json");
const outPath = path.resolve(import.meta.dir, "..", "src", "content", "manifest.ts");
const publicDir = path.resolve(import.meta.dir, "..", "public");
const bootstrapDistDir = path.resolve(
  import.meta.dir,
  "..",
  "node_modules",
  "@telnyx-private",
  "bootstrap",
  "dist",
);

type ManifestData = {
  files: string[];
};


function readJson<T>(p: string): T {
  return JSON.parse(fs.readFileSync(p, "utf8")) as T;
}

const imagesSrcDir = path.join(supportDocsDir, "_images");
const imagesDestDir = path.join(publicDir, "_images");
const IMAGE_REF = /_images\/([A-Za-z0-9._-]+)/g;
const articleJsonDir = path.join(publicDir, "content", "articles");

function main() {
  copyThemeFonts(bootstrapDistDir, publicDir);
  const manifestData = readJson<ManifestData>(manifestPath);

  const sourceFiles = manifestData.files
    .filter((relPath) => {
      const segments = relPath.split("/");
      return (
        path.basename(relPath) !== "_collection.md" &&
        !segments.includes("_uncategorized") &&
        relPath !== "_tree.json" &&
        relPath !== "_manifest.json"
      );
    })
    .map((relPath) => {
      const absPath = path.join(supportDocsDir, relPath);
      return {
        filePath: relPath,
        content: fs.readFileSync(absPath, "utf8"),
      };
    });
  const sourcePages = parseSourcePages(
    sourceFiles.map(({ filePath, content }) => ({
      filePath,
      sourceUrl: parseFrontmatter(content).fm.source_url,
    })),
  );
  const sourceFilesByPath = new Map(sourceFiles.map((file) => [file.filePath, file]));
  const sourcePagesByFile = new Map(sourcePages.map((page) => [page.filePath, page]));
  const localArticleSlugs = new Set(
    sourcePages.filter((page) => page.kind === "article").map((page) => page.slug),
  );
  const collections = recoverCollections(
    sourcePages
      .filter((page) => page.kind === "collection")
      .map((page) => {
        const { fm, body } = parseFrontmatter(sourceFilesByPath.get(page.filePath)!.content);
        return {
          slug: page.slug,
          title: fm.title ?? firstH1(body) ?? page.slug,
          description: fm.description ?? null,
          sourceUrl: page.sourceUrl,
          body,
        };
      }),
    localArticleSlugs,
  );

  const articles: Article[] = [];
  const referencedImages = new Set<string>();
  let skippedCollectionMd = 0;
  let skippedUncategorized = 0;
  let missingFile = 0;

  for (const relPath of manifestData.files) {
    const segments = relPath.split("/");
    if (path.basename(relPath) === "_collection.md") {
      skippedCollectionMd++;
      continue;
    }
    if (segments.includes("_uncategorized")) {
      skippedUncategorized++;
      continue;
    }
    if (relPath === "_tree.json" || relPath === "_manifest.json") {
      continue;
    }

    const sourceFile = sourceFilesByPath.get(relPath);
    if (!sourceFile) {
      missingFile++;
      continue;
    }
    const content = sourceFile.content;
    const sourcePage = sourcePagesByFile.get(relPath);
    if (!sourcePage) {
      throw new Error(`${relPath}: source page was not parsed.`);
    }
    if (sourcePage.kind === "collection") {
      skippedCollectionMd++;
      continue;
    }

    const { fm, body } = parseFrontmatter(content);
    const cleanedBody = rewriteLegacyArticleLinks(
      stripFeedbackTrailer(cleanArticle(body)),
    );
    for (const m of cleanedBody.matchAll(IMAGE_REF)) {
      referencedImages.add(m[1]);
    }
    const slug = sourcePage.slug;
    const title = firstH1(body) ?? slug;
    const recoveredCollection = collections.find((collection) =>
      collection.articleSlugs.includes(slug),
    );
    const collectionPath = recoveredCollection?.path ?? fallbackRootFor(title, slug);
    const collectionMembership = recoveredCollection ? "recovered" : "fallback";

    articles.push({
      slug,
      title,
      description: fm.description ?? null,
      sourceUrl: fm.source_url ?? null,
      scraped: fm.scraped ?? null,
      collectionPath,
      collectionMembership,
      body: cleanedBody,
    });

    if (!recoveredCollection) {
      const col = collections.find((collection) => collection.path === collectionPath);
      if (!col) {
        throw new Error(`fallback root ${collectionPath} does not exist.`);
      }
      col.articleSlugs.push(slug);
    }
  }

  copyArticleImages(imagesSrcDir, imagesDestDir, referencedImages);
  writeArticleBodies(articleJsonDir, articles);

  const buildTimestamp = new Date().toISOString();
  const articlesPublic = articles.map((a) => ({
    slug: a.slug,
    title: a.title,
    description: a.description,
    sourceUrl: a.sourceUrl,
      scraped: a.scraped,
      collectionPath: a.collectionPath,
      collectionMembership: a.collectionMembership,
  }));

  const output =
    "/* eslint-disable */\n" +
    "// @generated by scripts/build-content.ts — do not edit manually\n" +
    'import type { Article, Collection } from "./types";\n\n' +
    `export const collections: Collection[] = ${JSON.stringify(collections)} as Collection[];\n\n` +
    `export const articles: Omit<Article, "body">[] = ${JSON.stringify(articlesPublic)} as Omit<Article, "body">[];\n\n` +
    "export const manifest = {\n" +
    "  collections,\n" +
    "  articles,\n" +
    `  buildTimestamp: ${JSON.stringify(buildTimestamp)},\n` +
    "};\n";

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output, "utf8");

  console.log(`Collections: ${collections.length}`);
  for (const c of collections) {
    console.log(`  ${c.path}: ${c.articleSlugs.length} articles`);
  }
  console.log(`Articles: ${articles.length}`);
  console.log(`Skipped _collection.md: ${skippedCollectionMd}`);
  console.log(`Skipped _uncategorized: ${skippedUncategorized}`);
  console.log(`Missing files on disk: ${missingFile}`);
  console.log(`Output: ${outPath}`);
}

main();
