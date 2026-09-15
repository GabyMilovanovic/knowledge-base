import fs from "fs";
import path from "path";
import { collections, articles } from "../src/content/manifest";
import { articlePath, collectionPath } from "../src/utils/support-paths";

// The site is a client-side-routed SPA deployed to S3 as static files. A deep
// link like /en/articles/<slug> only works if an object exists at that exact key,
// so after `vite build` we materialize every route as a copy of index.html.
// Routes are written as extensionless files (matching the URL) unless another
// route nests beneath them, in which case they must be directories on disk and
// get a <route>/index.html instead.

export function canonicalRoutes(
  routeArticles: ReadonlyArray<{ slug: string }>,
  routeCollections: ReadonlyArray<{ path: string }>,
): string[] {
  return [
    ...routeArticles.map((article) => articlePath(article.slug)),
    ...routeCollections.map((collection) => collectionPath(collection.path)),
    "/en",
  ];
}

export function materializeRouteFiles(
  distDir: string,
  routes: readonly string[],
): { plainFiles: number; indexFiles: number } {
  const indexHtmlPath = path.join(distDir, "index.html");
  const indexHtml = fs.readFileSync(indexHtmlPath, "utf8");
  const routeKeys = routes.map((route) => route.replace(/^\/+|\/+$/g, ""));

  let plainFiles = 0;
  let indexFiles = 0;
  for (const route of routeKeys) {
    const prefix = `${route}/`;
    const hasChildRoute = routeKeys.some((candidate) => candidate.startsWith(prefix));
    const dest = hasChildRoute
      ? path.join(distDir, route, "index.html")
      : path.join(distDir, route);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, indexHtml);
    if (hasChildRoute) {
      indexFiles++;
    } else {
      plainFiles++;
    }
  }

  // Copy for the S3 website error document (and CloudFront custom error
  // response) so unknown URLs load the app's styled 404 page instead of
  // returning raw S3 XML.
  fs.writeFileSync(path.join(distDir, "404.html"), indexHtml);

  return { plainFiles, indexFiles };
}

function main() {
  const distDir = path.resolve(import.meta.dir, "..", "dist");
  const routes = canonicalRoutes(articles, collections);
  const { plainFiles, indexFiles } = materializeRouteFiles(distDir, routes);

  console.log(
    `Route files: ${routes.length} routes (${plainFiles} plain, ${indexFiles} as index.html) + 404.html`,
  );
}

if (import.meta.main) {
  main();
}
