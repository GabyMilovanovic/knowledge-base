export function articlePath(slug: string): string {
  return `/en/articles/${slug}`;
}

export function collectionPath(slug: string): string {
  return `/en/collections/${slug}`;
}

export function isSupportPath(path: string): boolean {
  return path.startsWith("/en/articles/") || path.startsWith("/en/collections/");
}
