export type SearchEntry = {
  slug: string; title: string; description: string | null;
  headings?: string; terms?: string;
};
export const normalizeSearch = (text: string) => text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const preparedFields = new WeakMap<SearchEntry, string[]>();
function fieldsFor(entry: SearchEntry): string[] {
  let fields = preparedFields.get(entry);
  if (!fields) {
    fields = [entry.title, entry.headings || "", entry.description || "", entry.terms || ""].map(normalizeSearch);
    preparedFields.set(entry, fields);
  }
  return fields;
}
export function findSearchResults(entries: readonly SearchEntry[], query: string): SearchEntry[] {
  const q = normalizeSearch(query);
  if (!q) return [];
  const terms = [...new Set(q.split(/\s+/))];
  const ranked = entries.map(entry => {
    const fields = fieldsFor(entry);
    let score = 0;
    for (const [i, term] of terms.entries()) {
      // Exact words, plus completion of the final word as the user types.
      const matches = fields.map(field => (` ${field} `).includes(` ${term} `) ||
        (i === terms.length - 1 && term.length >= 3 && (` ${field} `).includes(` ${term}`)));
      const weight = [100, 40, 20, 1].find((_, index) => matches[index]);
      if (!weight) return {entry, score: 0};
      score += weight;
    }
    if (fields[0] === q) score += 200;
    else if (fields[0].includes(q)) score += 100;
    return {entry, score};
  });
  return ranked.filter(row => row.score > 0).sort((a,b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title)).slice(0,8).map(row => row.entry);
}
