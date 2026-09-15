import { describe, expect, test } from "bun:test";
import {
  articlePath,
  collectionPath,
  isSupportPath,
} from "./support-paths";
import { rewriteLegacyArticleLinks } from "./clean-article";

describe("canonical support paths", () => {
  test("builds article and collection paths", () => {
    expect(articlePath("10245573-us-short-code-ordering-process")).toBe(
      "/en/articles/10245573-us-short-code-ordering-process",
    );
    expect(collectionPath("133094-general-telnyx-portal-account")).toBe(
      "/en/collections/133094-general-telnyx-portal-account",
    );
  });

  test("recognizes canonical support paths", () => {
    expect(isSupportPath("/en/articles/10245573-us-short-code-ordering-process")).toBe(true);
    expect(isSupportPath("/en/collections/133094-general-telnyx-portal-account")).toBe(true);
    expect(isSupportPath("/en/about")).toBe(false);
  });
});

describe("support link rewriting", () => {
  test("rewrites same-host article and collection links while preserving suffixes", () => {
    const body = [
      "[Article](https://support.telnyx.com/en/articles/10245573-us-short-code-ordering-process?source=related#ordering)",
      "[Collection](http://support.telnyx.com/en/collections/133094-general-telnyx-portal-account?source=nav#billing)",
    ].join("\n");

    expect(rewriteLegacyArticleLinks(body)).toBe([
      "[Article](/en/articles/10245573-us-short-code-ordering-process?source=related#ordering)",
      "[Collection](/en/collections/133094-general-telnyx-portal-account?source=nav#billing)",
    ].join("\n"));
  });

  test("does not rewrite unrelated external links", () => {
    const body = "[External](https://telnyx.com/en/articles/10245573-us-short-code-ordering-process)";

    expect(rewriteLegacyArticleLinks(body)).toBe(body);
  });
});
