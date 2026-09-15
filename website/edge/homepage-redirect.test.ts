import { expect, test } from "bun:test";
import fs from "node:fs";
import vm from "node:vm";

const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("./homepage-redirect.js", import.meta.url), "utf8"), context);
const handler = context.handler;

test("redirects both language roots to the current host's homepage", () => {
  for (const uri of ["/en", "/en/"]) {
    for (const method of ["GET", "HEAD"]) {
      const response = handler({ request: { uri, method, querystring: {} } });
      expect(response.statusCode).toBe(301);
      expect(response.headers.location.value).toBe("/");
    }
  }
});

test("preserves encoded and repeated query parameters", () => {
  const response = handler({ request: {
    uri: "/en/",
    querystring: {
      utm_source: { value: "email%20campaign" },
      tag: { value: "one", multiValue: [{ value: "one" }, { value: "two%2Bthree" }] },
    },
  } });
  expect(response.headers.location.value).toBe("/?utm_source=email%20campaign&tag=one&tag=two%2Bthree");
});

test("passes article, collection, asset and unknown paths through unchanged", () => {
  for (const uri of ["/", "/en/articles/1-article", "/en/collections/2-collection", "/assets/site.js", "/english", "/en/missing"]) {
    const request = { uri, querystring: {} };
    expect(handler({ request })).toBe(request);
  }
});
