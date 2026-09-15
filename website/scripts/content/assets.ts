import fs from "fs";
import path from "path";
import type { Article } from "../../src/content/types";

export function writeArticleBodies(articleJsonDir: string, articles: Article[]): void {
  fs.rmSync(articleJsonDir, { recursive: true, force: true });
  fs.mkdirSync(articleJsonDir, { recursive: true });
  for (const article of articles) {
    fs.writeFileSync(path.join(articleJsonDir, `${article.slug}.json`), JSON.stringify({ slug: article.slug, title: article.title, body: article.body }), "utf8");
  }
  console.log(`Article bodies: ${articles.length} JSON files`);
}

export function copyArticleImages(sourceDir: string, destinationDir: string, referenced: Set<string>): void {
  fs.mkdirSync(destinationDir, { recursive: true });
  let copied = 0;
  let missing = 0;
  for (const name of referenced) {
    const source = path.join(sourceDir, name);
    const destination = path.join(destinationDir, name);
    if (fs.existsSync(destination)) {
      continue;
    }
    if (!fs.existsSync(source)) {
      missing++;
      continue;
    }
    fs.copyFileSync(source, destination);
    copied++;
  }
  console.log(`Article images: ${referenced.size} referenced, ${copied} copied, ${missing} missing`);
}

export function copyThemeFonts(sourceDir: string, destinationDir: string): void {
  const fonts = fs.readdirSync(sourceDir).filter((file) => file.endsWith(".woff") || file.endsWith(".woff2"));
  fs.mkdirSync(destinationDir, { recursive: true });
  let copied = 0;
  for (const font of fonts) {
    const destination = path.join(destinationDir, font);
    if (!fs.existsSync(destination)) {
      fs.copyFileSync(path.join(sourceDir, font), destination);
      copied++;
    }
  }
  console.log(`Theme fonts: ${fonts.length} found, ${copied} copied`);
}
