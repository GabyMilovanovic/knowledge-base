import React from "react";
import imageDimensions from "../../../support-docs/_image-dimensions.json";
const dimensions: Record<string, {width: number; height: number}> = imageDimensions;
import { Link } from "wouter";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { assetBase } from "../utils/base-path";
import { isSupportPath } from "../utils/support-paths";
import { headingAnchors, type HeadingAnchor } from "../utils/heading-anchors";
import "./ArticleContent.css";

// Image references are relative (_images/<hash>.<ext>), which would resolve
// against the current route (/en/articles/<slug>/...) and 404. The files are
// served from the site root, so rewrite them to base-absolute URLs.
function urlTransform(url: string): string | null | undefined {
  if (url.startsWith("_images/")) return `${assetBase}${url}`;
  return defaultUrlTransform(url);
}

export const ArticleContent = React.memo(function ArticleContent({
  body,
  anchors = [],
}: {
  body: string;
  anchors?: HeadingAnchor[];
}) {
  return (
    <div className="article-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize, headingAnchors(anchors)]}
        urlTransform={urlTransform}
        components={{
          img: ({ node: _node, ...props }) => <img {...props} {...dimensions[(props.src ?? "").split("/").pop() ?? ""]} loading="lazy" decoding="async" />,
          a: ({ href, children, ...props }) => {
            const isExternal =
              href && (href.startsWith("http://") || href.startsWith("https://"));
            if (isExternal) {
              return (
                <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                  {children}
                </a>
              );
            }
            if (href && isSupportPath(href)) {
              return (
                <Link to={href} {...props}>
                  {children}
                </Link>
              );
            }
            return <a href={href} {...props}>{children}</a>;
          },
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
});
