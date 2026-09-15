import { describe, expect, test } from "bun:test";
import { parseSourcePage, parseSourcePages } from "./source-pages";

describe("source page parsing", () => {
  test("uses source metadata for current prefixed articles and collections", () => {
    expect(
      parseSourcePage(
        "en--articles--10245573-us-short-code-ordering-process.md",
        "https://support.telnyx.com/en/articles/10245573-us-short-code-ordering-process",
      ),
    ).toMatchObject({ kind: "article", slug: "10245573-us-short-code-ordering-process" });

    expect(
      parseSourcePage(
        "en--collections--133094-general-telnyx-portal-account.md",
        "https://support.telnyx.com/en/collections/133094-general-telnyx-portal-account",
      ),
    ).toMatchObject({ kind: "collection", slug: "133094-general-telnyx-portal-account" });
  });

  test("accepts clean numeric-title article and collection filenames with source URLs", () => {
    expect(
      parseSourcePage(
        "10245573-us-short-code-ordering-process.md",
        "https://support.telnyx.com/en/articles/10245573-us-short-code-ordering-process",
      ).kind,
    ).toBe("article");
    expect(
      parseSourcePage(
        "133094-general-telnyx-portal-account.md",
        "https://support.telnyx.com/en/collections/133094-general-telnyx-portal-account",
      ).kind,
    ).toBe("collection");
  });

  test("rejects malformed source URLs", () => {
    expect(() =>
      parseSourcePage("10245573-us-short-code-ordering-process.md", "not a URL"),
    ).toThrow("source_url must be a valid type-bearing support URL");
  });

  test("rejects source metadata outside the canonical English support URL contract", () => {
    const filePath = "10245573-us-short-code-ordering-process.md";
    const invalidUrls = [
      "https://example.com/en/articles/10245573-us-short-code-ordering-process",
      "https://support.telnyx.com/es/articles/10245573-us-short-code-ordering-process",
      "https://user:password@support.telnyx.com/en/articles/10245573-us-short-code-ordering-process",
      "https://support.telnyx.com:8443/en/articles/10245573-us-short-code-ordering-process",
    ];

    for (const sourceUrl of invalidUrls) {
      expect(() => parseSourcePage(filePath, sourceUrl)).toThrow(
        "source_url must be a valid type-bearing support URL",
      );
    }
  });

  test("accepts HTTP and HTTPS canonical support source URLs", () => {
    for (const protocol of ["http", "https"]) {
      expect(
        parseSourcePage(
          "stale-storage-name.md",
          `${protocol}://support.telnyx.com/en/articles/10245573-us-short-code-ordering-process`,
        ),
      ).toMatchObject({ kind: "article", slug: "10245573-us-short-code-ordering-process" });
    }
  });

  test("requires a type-bearing source URL for clean ambiguous names", () => {
    expect(() => parseSourcePage("10245573-us-short-code-ordering-process.md")).toThrow(
      "10245573-us-short-code-ordering-process.md: a valid type-bearing source_url is required",
    );
  });

  test("retains prefixed filename compatibility when source metadata is absent", () => {
    expect(parseSourcePage("en--articles--10245573-us-short-code-ordering-process.md")).toMatchObject({
      kind: "article",
      slug: "10245573-us-short-code-ordering-process",
    });
  });

  test("rejects duplicate canonical identities", () => {
    expect(() =>
      parseSourcePages([
        {
          filePath: "en--articles--10245573-us-short-code-ordering-process.md",
          sourceUrl:
            "https://support.telnyx.com/en/articles/10245573-us-short-code-ordering-process",
        },
        {
          filePath: "10245573-us-short-code-ordering-process.md",
          sourceUrl:
            "https://support.telnyx.com/en/articles/10245573-us-short-code-ordering-process",
        },
      ]),
    ).toThrow("duplicate canonical identity article:10245573-us-short-code-ordering-process");
  });
});
