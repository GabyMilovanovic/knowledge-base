type Node = { type: string; tagName?: string; value?: string; properties?: Record<string, unknown>; children?: Node[] };
export type HeadingAnchor = { text: string; id: string };
const textOf = (node: Node): string => node.value ?? node.children?.map(textOf).join("") ?? "";
const normalize = (s: string) => s.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
const safeId = (s: string) => /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(s) && !/^(?:location|name|constructor|document|window|forms|images|links|scripts|body|head|children)$/i.test(s);
// Run after sanitization. Only IDs from the checked-in source/alias inventory
// or generated readable slugs are allowed; arbitrary Markdown IDs stay sanitized.
export function headingAnchors(anchors: readonly HeadingAnchor[] = []) {
 return () => (tree: Node) => {
  const seen = new Set<string>(), byText = new Map<string,string[]>();
  for (const a of anchors) if (safeId(a.id)) byText.set(normalize(a.text),[...(byText.get(normalize(a.text))??[]),a.id]);
  function visit(node: Node) {
   const heading = node.type === "element" && /^h[1-6]$/.test(node.tagName??"");
   if (heading || node.type === "element" && node.tagName === "p") {
    const text = textOf(node), key = normalize(text);
    const legacy = [...new Set(byText.get(key)??[])].filter(id=>!seen.has(id));
    if (heading || legacy.length) {
     byText.delete(key);
     if (node.tagName === "h1") node.tagName = "h2";
     const stem = text.normalize("NFKD").toLowerCase().replace(/[^a-z0-9\s-]/g,"").trim().replace(/[\s-]+/g,"-")||"heading";
     let slug=stem, suffix=1;
     while(seen.has(slug)||seen.has(`section-${slug}`)) slug=`${stem}-${++suffix}`;
     const id=legacy.shift()??`section-${slug}`; seen.add(id);
     const aliases=[...legacy]; if(safeId(slug)&&!seen.has(slug)) aliases.push(slug);
     node.properties={...node.properties,id};
     node.children=[...aliases.filter(a=>{if(seen.has(a))return false;seen.add(a);return true;}).map(id=>({type:"element",tagName:"span",properties:{id,"aria-hidden":"true"},children:[]})),...(node.children??[])];
    }
   }
   for(const child of node.children??[]) visit(child);
  }
  visit(tree);
 };
}
