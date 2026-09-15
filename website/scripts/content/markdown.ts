export function parseFrontmatter(content: string): {
  fm: Record<string, string>;
  body: string;
} {
  if (!content.startsWith("---")) {
    return { fm: {}, body: content };
  }
  const lines = content.split("\n");
  if (lines[0].trim() !== "---") {
    return { fm: {}, body: content };
  }
  let index = 1;
  const fm: Record<string, string> = {};
  while (index < lines.length && lines[index].trim() !== "---") {
    const separator = lines[index].indexOf(":");
    if (separator !== -1) {
      const key = lines[index].slice(0, separator).trim();
      if (key) {
        const value = lines[index].slice(separator + 1).trim();
        try { fm[key] = value.startsWith('"') ? JSON.parse(value) : value; }
        catch { fm[key] = value.replace(/^"(.*)"$/, "$1"); }
      }
    }
    index++;
  }
  return { fm, body: lines.slice(index + 1).join("\n") };
}

export function firstH1(body: string): string | null {
  for (const line of body.split("\n")) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}
