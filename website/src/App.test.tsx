import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { AppRoutes } from "./App";
import { articles, collections } from "./content/manifest";
import { articlePath, collectionPath } from "./utils/support-paths";

function renderPath(path: string): string {
  return renderToString(
    <Router ssrPath={path}>
      <AppRoutes />
    </Router>,
  );
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };
    return entities[character];
  });
}

describe("AppRoutes", () => {
  const article = articles.find(
    (item) => item.slug === "10245573-us-short-code-ordering-process",
  );
  const collection = collections.find(
    (item) => item.path === "133094-general-telnyx-portal-account",
  );

  if (!article || !collection) {
    throw new Error("The content manifest needs the canonical route fixtures");
  }

  test("renders a canonical article directly", () => {
    const html = renderPath(articlePath(article.slug));

    expect(html).toContain(escapeHtml(article.title));
    expect(html).not.toContain("Article not found");
    expect(html).not.toContain("Page not found");
  });

  test("renders a canonical collection directly", () => {
    const html = renderPath(collectionPath(collection.path));

    expect(html).toContain(escapeHtml(collection.title));
    expect(html).not.toContain("Collection not found");
    expect(html).not.toContain("Page not found");
  });

  test("shows descendant counts on collection pages and homepage cards", () => {
    const voice = renderPath(collectionPath("133140-voice-api-essentials"));
    const iot = renderPath(collectionPath("1895859-telnyx-global-iot-sims"));
    expect(voice).toMatch(/15(?:<!-- -->)? (?:<!-- -->)?articles(?:<!-- -->)? including subcollections/);
    expect(iot).toMatch(/21(?:<!-- -->)? (?:<!-- -->)?articles(?:<!-- -->)? including subcollections/);
    const homepage = renderPath("/");
    expect(homepage).toMatch(/topic-card-count">15(?:<!-- -->)? (?:<!-- -->)?articles/);
    expect(homepage).toMatch(/topic-card-count">21(?:<!-- -->)? (?:<!-- -->)?articles/);
  });

  test("renders article and collection not-found states for unknown canonical paths", () => {
    expect(renderPath(articlePath("99999999-missing-article"))).toContain(
      "Article not found",
    );
    expect(renderPath(collectionPath("99999999-missing-collection"))).toContain(
      "Collection not found",
    );
  });

  test("renders the help center home page at /en and /en/", () => {
    for (const path of ["/en", "/en/"]) {
      const html = renderPath(path);

      expect(html).toContain("How can we help?");
      expect(html).not.toContain("Page not found");
    }
  });
});
