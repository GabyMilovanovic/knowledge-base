export type SearchEntry = { slug: string; title: string; description: string | null };
export function findSearchResults(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase(); if (!q) return [];
  const titles: SearchEntry[] = [], descriptions: SearchEntry[] = [];
  for (const entry of entries) {
    if (entry.title.toLowerCase().includes(q)) titles.push(entry);
    else if (entry.description?.toLowerCase().includes(q)) descriptions.push(entry);
    if (titles.length >= 8) break;
  }
  return [...titles, ...descriptions].slice(0, 8);
}
