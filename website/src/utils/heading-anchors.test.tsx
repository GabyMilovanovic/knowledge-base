import {expect,test} from "bun:test";
import {renderToStaticMarkup} from "react-dom/server";
import {ArticleContent} from "../components/ArticleContent";
import {cleanArticle} from "./clean-article";
import {findSearchResults} from "./search";
test("restores verified legacy and readable anchors, preserves links, and demotes body H1s",()=>{
 const raw="# Title\n\n[Setup](#h_abc)\n\n## Setup\n\n# More\n\n<script>alert(1)</script>";
 const html=renderToStaticMarkup(<ArticleContent body={cleanArticle(raw)} anchors={[{text:"Setup",id:"h_abc"}]}/>);
 expect(html).toContain('id="h_abc"');expect(html).toContain('id="setup"');expect(html).toContain('href="#h_abc"');expect(html).not.toContain('<h1');expect(html).not.toContain('<script');
});
test("cleaning preserves code fences",()=>{
 expect(cleanArticle('# Title\n\n```sh\n# comment\nWritten by Example\n```')).toContain('```sh\n# comment\nWritten by Example\n```');
});
test("search prioritizes titles, falls back to descriptions and handles empty queries",()=>{
 const rows=[{slug:"1-one",title:"One",description:"Voice setup"},{slug:"2-voice",title:"Voice",description:null}];
 expect(findSearchResults(rows,"VOICE").map(a=>a.slug)).toEqual(["2-voice","1-one"]);expect(findSearchResults(rows," ")).toEqual([]);
});
