// Progressive enhancement: normal links load complete static HTML, so content,
// metadata and anchor navigation also work without JavaScript or hydration.
import { findSearchResults, type SearchEntry } from "./utils/search";
export function enhance(document: Document, request: (url: string) => Promise<Response> = fetch, navigate: (url: string) => void = url => location.assign(url)) {
let indexPromise: Promise<SearchEntry[]> | undefined;
function loadIndex() {
  return indexPromise ??= request("/content/search-index.json").then((response) => {
    if (!response.ok) throw new Error("Search unavailable");
    return response.json() as Promise<SearchEntry[]>;
  }).catch((error) => { indexPromise = undefined; throw error; });
}
document.querySelectorAll<HTMLElement>(".search").forEach((root) => {
  const input = root.querySelector<HTMLInputElement>("input")!;
  const panel = document.createElement("div");
  panel.className = "search-panel"; panel.hidden = true; root.append(panel);
  let selected = -1, generation = 0;
  let links: HTMLAnchorElement[] = [];
  const close = () => {
    generation++; panel.hidden = true;
    input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
  };
  const select = (index: number) => {
    selected = index;
    links.forEach((link, i) => {
      link.parentElement!.classList.toggle("search-result--active", i === index);
      link.parentElement!.setAttribute("aria-selected", String(i === index));
    });
    if (index >= 0) input.setAttribute("aria-activedescendant", links[index].parentElement!.id);
    else input.removeAttribute("aria-activedescendant");
  };
  async function update() {
    const query = input.value.trim(), attempt = ++generation;
    if (!query) { close(); return; }
    try {
      const index = await loadIndex();
      if (attempt !== generation) return;
      panel.replaceChildren(); links = []; selected = -1;
      input.removeAttribute("aria-activedescendant");
      const list = document.createElement("ul");
      list.className = "search-results"; list.id = input.getAttribute("aria-controls")!;
      list.setAttribute("role", "listbox");
      for (const result of findSearchResults(index, query)) {
        const item = document.createElement("li"); item.className = "search-result";
        item.id = `${list.id}-option-${links.length}`;
        item.setAttribute("role", "option"); item.setAttribute("aria-selected", "false");
        const link = document.createElement("a"); link.href = `/en/articles/${result.slug}`;
        const title = document.createElement("span"); title.className = "search-result-title";
        title.textContent = result.title; link.append(title);
        if (result.description) {
          const description = document.createElement("span"); description.className = "search-result-description";
          description.textContent = result.description; link.append(description);
        }
        const position = links.length;
        item.addEventListener("mouseenter", () => select(position));
        item.append(link); list.append(item); links.push(link);
      }
      panel.append(list);
      if (!links.length) {
        const empty = document.createElement("p"); empty.className = "search-empty";
        empty.setAttribute("role", "status"); empty.textContent = `No articles match “${query}”. Try another term.`;
        panel.append(empty);
      }
      panel.hidden = false; input.setAttribute("aria-expanded", "true");
    } catch {
      if (attempt !== generation) return;
      panel.textContent = "Search could not load. Try again, or browse the topics.";
      panel.hidden = false; input.setAttribute("aria-expanded", "true");
    }
  }
  input.addEventListener("focus", () => { void loadIndex().catch(() => {}); void update(); });
  input.addEventListener("input", () => { void update(); });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") { close(); return; }
    if (panel.hidden || !links.length) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      select(event.key === "ArrowDown" ? (selected + 1) % links.length : (selected <= 0 ? links.length - 1 : selected - 1));
    } else if (event.key === "Enter") {
      event.preventDefault(); navigate(links[Math.max(0, selected)].href);
    }
  });
  document.addEventListener("pointerdown", (event) => { if (!root.contains(event.target as Node)) close(); });
  root.addEventListener("focusout", (event) => { if (!root.contains(event.relatedTarget as Node)) close(); });
});
document.querySelectorAll<HTMLInputElement>(".collection-filter").forEach((input) => {
  const section = input.closest("section")!;
  const items = [...section.querySelectorAll<HTMLElement>(".article-list-item")];
  const status = document.createElement("p");
  status.setAttribute("role", "status"); status.className = "collection-filter-empty"; status.hidden = true; section.append(status);
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase(); let count = 0;
    for (const item of items) {
      const show = (item.textContent || "").toLowerCase().includes(query);
      item.hidden = !show; if (show) count++;
    }
    status.hidden = count > 0;
    status.textContent = `No articles match “${input.value.trim()}”. Clear the filter or try the search above.`;
  });
});

}
