export type ContentPageKind = "article" | "collection";

export interface Article {
  slug: string;
  title: string;
  seoTitle?: string;
  robots?: "noindex,nofollow";
  modifiedAt?: string;
  headingAnchors?: { text: string; id: string }[];
  description: string | null;
  sourceUrl: string | null;
  scraped: string | null;
  collectionPath: string;
  collectionMembership: "recovered" | "fallback";
  body: string;
}

export interface Collection {
  path: string;
  title: string;
  description: string | null;
  sourceUrl: string | null;
  sourceSlug: string | null;
  intercomCollectionId: string | null;
  metadataStub: boolean;
  parentPath: string | null;
  childCollectionPaths: string[];
  articleSlugs: string[];
}
