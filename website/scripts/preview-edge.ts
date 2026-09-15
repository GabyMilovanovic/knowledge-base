import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

// Exercise the actual CloudFront handler ahead of exact-key static serving.
// Vite's SPA fallback hides missing-object errors that occur at an S3 origin.
const dist = path.resolve(import.meta.dir, "../dist");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.resolve(import.meta.dir, "../edge/routing.js"), "utf8"), context);

const registry = JSON.parse(fs.readFileSync(path.resolve(dist, "../dist-edge/routes.json"), "utf8"));
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: Number(process.env.PORT || 4173),
  async fetch(request) {
    const url = new URL(request.url);
    const querystring: Record<string, { value: string; multiValue?: { value: string }[] }> = Object.create(null);
    for (const parameter of url.search.slice(1).split("&").filter(Boolean)) {
      const separator = parameter.indexOf("=");
      const key = separator < 0 ? parameter : parameter.slice(0, separator);
      const value = separator < 0 ? "" : parameter.slice(separator + 1);
      const existing = querystring[key];
      if (existing) {
        existing.multiValue = [...(existing.multiValue || [{ value: existing.value }]), { value }];
      } else {
        querystring[key] = { value };
      }
    }
    const result = await context.routeRequest({ uri: url.pathname, method: request.method, querystring }, async (key: string) => registry[key]);
    if (result.statusCode) {
      return new Response(request.method === "HEAD" ? null : result.body || null, {
        status: result.statusCode,
        headers: Object.fromEntries(Object.entries(result.headers).map(([key, item]) => [key, (item as { value: string }).value])),
      });
    }
    let pathname: string;
    try { pathname = decodeURIComponent(url.pathname); }
    catch { return new Response("Bad request", { status: 400 }); }
    const filename = path.resolve(dist, "." + (pathname === "/" ? "/index.html" : pathname));
    if (!filename.startsWith(dist + path.sep)) return new Response("Not found", { status: 404 });
    const stat = fs.statSync(filename, { throwIfNoEntry: false });
    if (!stat?.isFile()) return new Response("Not found", { status: 404 });
    const file = Bun.file(filename);
    const isHtml = !path.extname(filename) || filename.endsWith(".html");
    return new Response(request.method === "HEAD" ? null : file, {
      headers: { "content-type": isHtml ? "text/html; charset=utf-8" : file.type },
    });
  },
});
console.log(`Exact-key preview with CloudFront ID routing: ${server.url}`);
