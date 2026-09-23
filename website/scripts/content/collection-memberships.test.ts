import { expect, test } from "bun:test";
import { recoverCollections } from "./collections";
import { applyCollectionMemberships, type MembershipSnapshot } from "./collection-memberships";
import snapshot from "../../../support-docs/_collection-memberships.json";
import { collections, articles } from "../../src/content/manifest";

function fixture() {
  const local = new Set(["1-article", "2-article"]);
  const collections = recoverCollections([{
    slug: "10-root", title: "Root", description: null, sourceUrl: null,
    body: "[## Leaf](https://support.telnyx.com/en/collections/11-leaf)",
  }], local);
  const snapshot: MembershipSnapshot = {
    version: 1, verifiedAt: "2026-09-15",
    collections: [{ path: "11-leaf", sourceUrl: "https://support.telnyx.com/en/collections/11-leaf", sourceHtmlSha256: "", parentSnapshotFiles: [], articleSlugs: ["2-article", "1-article"] }],
  };
  return { local, collections, snapshot };
}

test("restores verified membership in source order without adding collections", () => {
  const f = fixture();
  applyCollectionMemberships(f.collections, f.local, f.snapshot);
  expect(f.collections).toHaveLength(2);
  expect(f.collections[1].articleSlugs).toEqual(["2-article", "1-article"]);
});

test("rejects new collections, missing articles, and duplicate ownership", () => {
  for (const mutation of ["collection", "missing", "duplicate"]) {
    const f = fixture();
    if (mutation === "collection") f.snapshot.collections[0].path = "12-new";
    if (mutation === "missing") f.snapshot.collections[0].articleSlugs = ["3-missing"];
    if (mutation === "duplicate") f.collections[0].articleSlugs.push("1-article");
    expect(() => applyCollectionMemberships(f.collections, f.local, f.snapshot)).toThrow();
    expect(f.collections[1].articleSlugs).toEqual([]);
  }
});

test("all 66 existing leaf collections have their verified local articles", () => {
  expect(snapshot.collections).toHaveLength(66);
  expect(snapshot.collections.flatMap((entry) => entry.articleSlugs)).toHaveLength(355);
  for (const entry of snapshot.collections) {
    expect(collections.find((collection) => collection.path === entry.path)?.articleSlugs).toEqual(expect.arrayContaining(entry.articleSlugs));
    for (const slug of entry.articleSlugs) {
      expect(articles.find((article) => article.slug === slug)).toMatchObject({
        collectionPath: entry.path,
        collectionMembership: "recovered",
      });
    }
  }
  expect(collections).toHaveLength(115);
  expect(collections.filter((collection) => !collection.articleSlugs.length && !collection.childCollectionPaths.length)).toHaveLength(0);
});
