import { describe, expect, test } from "bun:test";
import { collectionLinks, recoverCollections, validateCollections } from "./collections";

const articleSlugs = new Set(["1-root", "2-child", "3-card"]);
const source = {
  slug: "10-root",
  title: "Root",
  description: "Root description",
  sourceUrl: "https://support.telnyx.com/en/collections/10-root",
  body: `[Root](https://support.telnyx.com/en/articles/1-root)
[## Child](https://support.telnyx.com/en/collections/11-child)
[Child](https://support.telnyx.com/en/articles/2-child)
[Card3 articles](https://support.telnyx.com/en/collections/12-card)
[Ignored](https://support.telnyx.com/en/articles/3-card)`,
};

describe("collection recovery", () => {
  test("preserves root, heading child, card order, and active heading membership", () => {
    const collections = recoverCollections([source], articleSlugs);
    expect(collections.map((item) => item.path)).toEqual(["10-root", "11-child", "12-card"]);
    expect(collections[0].articleSlugs).toEqual(["1-root"]);
    expect(collections[1]).toMatchObject({ parentPath: "10-root", articleSlugs: ["2-child", "3-card"] });
    expect(collections[2]).toMatchObject({ parentPath: "11-child", title: "Card", description: null, articleSlugs: [] });
  });

  test("skips absent articles and source-less children have no invented metadata", () => {
    const collections = recoverCollections([{ ...source, body: "[Missing](https://support.telnyx.com/en/articles/9-missing)[Card](https://support.telnyx.com/en/collections/12-card)" }], articleSlugs);
    expect(collections[0].articleSlugs).toEqual([]);
    expect(collections[1]).toMatchObject({ sourceUrl: null, description: null, articleSlugs: [] });
  });

  test("rejects invalid ownership graphs", () => {
    const base = { ...recoverCollections([source], articleSlugs)[0], articleSlugs: [] };
    expect(() => validateCollections([base, { ...base }])).toThrow("duplicate collection slug");
    expect(() => validateCollections([{ ...base, parentPath: "missing" }])).toThrow("missing parent");
    expect(() => validateCollections([{ ...base, parentPath: base.path }])).toThrow("cannot parent itself");
    expect(() => validateCollections([{ ...base, path: "a", parentPath: "b" }, { ...base, path: "b", parentPath: "a" }])).toThrow("cycle");
    expect(() => validateCollections([{ ...base, path: "a", articleSlugs: ["1"] }, { ...base, path: "b", articleSlugs: ["1"] }])).toThrow("duplicate article membership");
  });

  test("preserves multi-root and repeated heading and card encounter order", () => {
    const second = {
      ...source,
      slug: "20-second",
      body: `[## First](https://support.telnyx.com/en/collections/21-first)[One](https://support.telnyx.com/en/collections/22-one)[Two](https://support.telnyx.com/en/collections/23-two)[## Second](https://support.telnyx.com/en/collections/24-second)[Three](https://support.telnyx.com/en/collections/25-three)`,
    };
    const recovered = recoverCollections([source, second], articleSlugs);
    expect(recovered.map(({ path }) => path)).toEqual(["10-root", "20-second", "11-child", "12-card", "21-first", "22-one", "23-two", "24-second", "25-three"]);
    expect(recovered.find(({ path }) => path === "20-second")!.childCollectionPaths).toEqual(["21-first", "24-second"]);
    expect(recovered.find(({ path }) => path === "21-first")!.childCollectionPaths).toEqual(["22-one", "23-two"]);
    expect(recoverCollections([source, second], articleSlugs)).toEqual(recovered);
  });

  test("rejects conflicting parsed parents and duplicate parsed membership", () => {
    const duplicateChild = { ...source, slug: "20-root", body: "[Child](https://support.telnyx.com/en/collections/11-child)" };
    expect(() => recoverCollections([source, duplicateChild], articleSlugs)).toThrow("conflicting parents");
    expect(() => recoverCollections([{ ...source, body: "[One](https://support.telnyx.com/en/articles/1-root)[Again](https://support.telnyx.com/en/articles/1-root)" }], articleSlugs)).toThrow("duplicate article membership");
  });

  test("preserves proper names in heading labels and removes supported card descriptions", () => {
    const links = collectionLinks(
      `[## Call Control / TeXML](https://support.telnyx.com/en/collections/2529888-call-control-texml)
[FreePBX Setup & ConfigurationStep-by-step guides to set up FreePBX with Telnyx.9 articles](https://support.telnyx.com/en/collections/1512996-freepbx-setup-configuration)`,
    );

    expect(links).toEqual([
      expect.objectContaining({ label: "Call Control / TeXML", heading: true }),
      expect.objectContaining({ label: "FreePBX Setup & Configuration", heading: false }),
    ]);
  });

  test("retains uncertain card labels rather than truncating them", () => {
    expect(
      collectionLinks(
        "[Unclear titleDescription that cannot be verified](https://support.telnyx.com/en/collections/12-unrelated-slug)",
      )[0].label,
    ).toBe("Unclear titleDescription that cannot be verified");
  });
});
