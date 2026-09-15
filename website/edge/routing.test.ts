import { expect, test } from "bun:test";
import fs from "node:fs";
import vm from "node:vm";
import { articles, collections } from "../src/content/manifest";
import { routeRegistry, canonicalizeSupportLinks } from "../scripts/content/routes";
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("./routing.js", import.meta.url), "utf8"), context);
const registry = routeRegistry(articles, collections);
const request = (uri: string, extra = {}) => ({uri, method: "GET", querystring: {}, ...extra});
const route = (uri: string, extra = {}) => context.routeRequest(request(uri,extra), async (key: string) => registry[key]);
test("every known ID serves its canonical path and redirects bare, old-title and trailing slash variants", async () => {
  for (const [key, target] of Object.entries(registry)) {
    if (key.startsWith("path:")) continue;
    const [kind,id] = key.split(":");
    expect((await route(target)).uri).toBe(target);
    for (const alias of [`/en/${kind}s/${id}`,`/en/${kind}s/${id}-old-title`,target+"/"]) {
      const result = await route(alias); expect(result.statusCode).toBe(301); expect(result.headers.location.value).toBe(target);
    }
  }
});
test("PR 51 consolidations redirect to their actual replacements", async () => {
  expect((await route("/en/articles/10646301-telnyx-10dlc-process")).headers.location.value).toBe(registry["article:6339152"]);
  expect((await route("/en/articles/5617538-10dlc-shared-campaigns")).headers.location.value).toBe(registry["article:6339158"]);
});
test("homepage and old custom paths preserve encoded/repeated queries", async () => {
  for (const uri of ["/en","/en/","/en/index.html","/index.html"]) expect((await route(uri)).headers.location.value).toBe("/");
  const result = await route("/article/en--articles--14327893-telnyx-freemium-accounts", {method:"HEAD",querystring:{q:{value:"a%2Fb",multiValue:[{value:"a%2Fb"},{value:"c%26d"}]}}});
  expect(result.headers.location.value).toBe("/en/articles/14327893-telnyx-pretrial-accounts?q=a%2Fb&q=c%26d");
  for (const key of Object.keys(registry).filter(k=>k.startsWith("path:"))) expect((await route(key.slice(5))).headers.location.value).toBe(registry[key]);
});
test("unknown URLs are 404, lookup outages are 503 and unsafe methods are rejected", async () => {
  for (const uri of ["/garbage","/en/articles/99999999-nonexistent","/en/collections/99999999-missing"]) expect((await route(uri)).statusCode).toBe(404);
  expect((await route("/garbage", {method:"HEAD"})).body).toBe("");
  expect((await context.routeRequest(request("/en/articles/6339152"), async () => {throw Error("unavailable");})).statusCode).toBe(503);
  expect((await route("/",{method:"POST"})).statusCode).toBe(405);
});
test("body links use canonical targets while retaining suffixes and third-party URLs", () => {
  expect(canonicalizeSupportLinks("[x](https://support.telnyx.com/en/articles/10646301-old?q=1#h_test)",registry)).toBe(`[x](${registry['article:6339152']}?q=1#h_test)`);
  const external="https://example.com/en/articles/6339152-other";
  expect(canonicalizeSupportLinks(external,registry)).toBe(external);
});
