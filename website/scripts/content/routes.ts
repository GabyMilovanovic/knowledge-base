export const consolidatedArticles: Record<string, string> = {
  "10646301": "6339152", // PR #51: Telnyx 10DLC Process → Create a 10DLC Campaign
  "5617538": "6339158", // PR #51: Shared Campaigns → Bring Campaigns to Telnyx
};
const oldCollections: Record<string, string> = {
  messaging: "133103", "voice-sip-trunking": "3968237", "numbers-porting": "3968222",
  "iot-wireless": "1895859", "networking-storage": "5317581", "account-billing": "133094",
  "ai-automation": "19623087", general: "133094",
};
export function routeRegistry(articles: readonly { slug: string }[], collections: readonly { path: string }[]) {
  const registry: Record<string, string> = {};
  for (const [kind, entries] of [["article", articles.map(a => a.slug)], ["collection", collections.map(c => c.path)]] as const) {
    for (const slug of entries) {
      const id = slug.match(/^\d+/)?.[0];
      if (!id || registry[`${kind}:${id}`]) throw new Error(`Invalid/duplicate ${kind} ID: ${slug}`);
      registry[`${kind}:${id}`] = `/en/${kind}s/${slug}`;
    }
  }
  for (const [oldId, newId] of Object.entries(consolidatedArticles)) {
    const target = registry[`article:${newId}`];
    if (!target) throw new Error(`Missing consolidation target ${newId}`);
    if (registry[`article:${oldId}`]) throw new Error(`Consolidated article ${oldId} was reintroduced`);
    registry[`article:${oldId}`] = target;
  }
  for (const [slug, id] of Object.entries(oldCollections)) {
    const target = registry[`collection:${id}`];
    if (!target) throw new Error(`Missing legacy collection target ${id}`);
    registry[`path:/collection/${slug}`] = target;
  }
  return registry;
}

export function canonicalizeSupportLinks(body: string, registry: Record<string, string>): string {
  // Match only complete support URLs or root-relative support paths, not URLs
  // on third-party Intercom sites. Query strings and fragments remain in place.
  return body.replace(/https:\/\/support\.telnyx\.com\/llms\.txt/g, "/llms.txt").replace(/https?:\/\/support\.telnyx\.com(?:\/en\/?)?(?:\/)?(?=[#?\s)\]"\']|$)/g, "/").replace(/(?:https?:\/\/(?:support\.telnyx\.com|intercom\.help\/telnyx))?\/en\/(articles|collections)\/(\d+)(?:-[^\s/#?<>"')\]]*)?/g,
    (match, kind: string, id: string, offset: number) => {
      if (match.startsWith("/") && /[\w.:/]$/.test(body.slice(0, offset))) return match;
      return registry[`${kind === "articles" ? "article" : "collection"}:${id}`] ?? match;
    });
}
