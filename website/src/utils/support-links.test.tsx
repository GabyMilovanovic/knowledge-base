import {Router} from "wouter";
import {expect, test} from "bun:test";
import {renderToStaticMarkup} from "react-dom/server";
import {ArticleContent} from "../components/ArticleContent";
import {rewriteLegacyArticleLinks} from "./clean-article";
import {canonicalizeSupportLinks} from "../../scripts/content/routes";
test("support autolinks remain clickable through canonicalization", () => {
 const registry={"article:10684260":"/en/articles/10684260-10dlc-opt-in-form","collection:123":"/en/collections/123-current"};
 for(const prefix of ["https://support.telnyx.com","http://support.telnyx.com","https://intercom.help/telnyx",""]){
  const body=canonicalizeSupportLinks(rewriteLegacyArticleLinks(`See <${prefix}/en/articles/10684260-old?source=test#heading> and <${prefix}/en/collections/123-old>.`),registry);
  const html=renderToStaticMarkup(<Router ssrPath="/"><ArticleContent body={body}/></Router>);
  expect(html).toContain('href="/en/articles/10684260-10dlc-opt-in-form?source=test#heading"');
  expect(html).toContain('href="/en/collections/123-current"');
  expect(html).not.toContain('&lt;/en/');
 }
});
test("ordinary links and external autolinks still render",()=>{
 const html=renderToStaticMarkup(<Router ssrPath="/"><ArticleContent body={rewriteLegacyArticleLinks('[Guide](https://support.telnyx.com/en/articles/123-guide) <https://example.com/path>')}/></Router>);
 expect(html).toContain('href="/en/articles/123-guide"');expect(html).toContain('href="https://example.com/path"');
});
