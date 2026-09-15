import { afterEach, describe, expect, test } from "bun:test";
import fs from "fs";
import os from "os";
import path from "path";
import { canonicalRoutes, materializeRouteFiles } from "./generate-route-files";

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("static canonical route generation", () => {
  test("materializes canonical article and collection objects with route parents and fallback", () => {
    const distDir = fs.mkdtempSync(path.join(os.tmpdir(), "route-files-"));
    temporaryDirectories.push(distDir);
    const appShell = "<!doctype html><div id=\"root\"></div>";
    fs.writeFileSync(path.join(distDir, "index.html"), appShell);

    const routes = canonicalRoutes(
      [{ slug: "10245573-us-short-code-ordering-process" }],
      [{ path: "133094-general-telnyx-portal-account" }],
    );
    const result = materializeRouteFiles(distDir, routes);

    expect(result).toEqual({ plainFiles: 2, indexFiles: 1 });
    expect(
      fs.readFileSync(
        path.join(distDir, "en", "articles", "10245573-us-short-code-ordering-process"),
        "utf8",
      ),
    ).toBe(appShell);
    expect(
      fs.readFileSync(
        path.join(distDir, "en", "collections", "133094-general-telnyx-portal-account"),
        "utf8",
      ),
    ).toBe(appShell);
    expect(fs.readFileSync(path.join(distDir, "en", "index.html"), "utf8")).toBe(appShell);
    expect(fs.readFileSync(path.join(distDir, "404.html"), "utf8")).toBe(appShell);
    expect(fs.existsSync(path.join(distDir, "article"))).toBe(false);
    expect(fs.existsSync(path.join(distDir, "collection"))).toBe(false);
  });
});
