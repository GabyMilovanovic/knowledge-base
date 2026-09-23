import fs from 'node:fs';
import path from 'node:path';
import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {Router} from 'wouter';
import {ArticleContent} from '../../src/components/ArticleContent';
import {cleanArticle,stripFeedbackTrailer,rewriteLegacyArticleLinks} from '../../src/utils/clean-article';
import {parseFrontmatter} from './markdown';
import {canonicalizeSupportLinks} from './routes';
import {routeRegistry} from './routes';
import {articles,collections} from '../../src/content/manifest';
const registry=routeRegistry(articles,collections);
const docs=path.resolve(import.meta.dir,'../../../support-docs');
test('all source support hyperlinks survive cleaning and URL canonicalization',()=>{
const findings=[];
for(const file of fs.readdirSync(docs).filter(f=>f.startsWith('en--articles--')&&f.endsWith('.md'))){
 const body=stripFeedbackTrailer(cleanArticle(parseFrontmatter(fs.readFileSync(path.join(docs,file),'utf8')).body));
 const before=renderToStaticMarkup(<Router ssrPath="/"><ArticleContent body={body}/></Router>);
 const after=renderToStaticMarkup(<Router ssrPath="/"><ArticleContent body={canonicalizeSupportLinks(rewriteLegacyArticleLinks(body),registry)}/></Router>);
 const original=[...before.matchAll(/href="(https?:\/\/(?:support\.telnyx\.com|intercom\.help\/telnyx)\/en\/(?:articles|collections)\/[^"\s]+)"/g)].map(m=>m[1]);
 const missing=original.filter(url=>!after.includes(`href="${canonicalizeSupportLinks(url,registry)}"`));
 if(missing.length)findings.push({file,missing});
}
expect(findings).toEqual([]);
}, 30000);
