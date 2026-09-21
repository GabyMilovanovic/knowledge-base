# Post-PR57 migration readiness — 15 September 2026

## Status

Implementation is local on `fix/post-57-migration-readiness`. Nothing in this work
has been pushed, merged, deployed, or applied to DNS. The only rollout target is
`https://d27az1l5lty0u1.cloudfront.net/`. The public support-domain move is excluded.

**The branch is ready for review and temporary-environment integration, not yet
for domain cutover.** Infrastructure deployment, two retired-content destinations,
Growth's actual traffic/backlink export, and deployed performance checks remain.

## Implemented fixes

| Issue | Actual fix |
|---|---|
| `/en` and `/en/` return S3 403 | Viewer-request HTTP 301 to same-host `/`; encoded/repeated queries preserved. Runs before the S3 origin. |
| Old titles/bare IDs fail | ID-to-canonical registry for every article and collection; arbitrary title variants, bare IDs and trailing slashes get a one-hop 301. |
| PR 51 deliberate consolidations remain in old sitemap | 10646301 → 6339152 (How to Create a 10DLC Campaign); 5617538 → 6339158 (Bring Campaigns to Telnyx). Deleted documents are not re-imported. |
| Freemium/Pretrial URL changed | Canonical source identity for ID 14327893 uses `telnyx-pretrial-accounts`; old `telnyx-freemium-accounts` and other titles redirect by ID. Existing GitHub article text is retained. |
| Old custom app routes | `/article/en--articles--ID-title`, `/article/ID-title`, numeric `/collection/ID-title`, and eight known former synthetic collection paths resolve to current pages. Unknown non-ID custom paths await actual URL evidence. |
| 66 empty leaf collections | Restored 355 memberships from the actual published Intercom leaves; no new taxonomy. These were existing, nonempty published collections, not collections invented by PR57. |
| Misleading collection counts | Count unique available articles recursively, including descendants. Direct article lists and their filters remain direct members. |
| Missing published content | Imported 23 missing sitemap articles and one additional live internally linked privacy-policy guide. Restored the existing Telnyx Email and RCS roots. |
| JavaScript-only article body | Build-time React rendering writes complete, page-specific HTML to each exact S3 key. Articles, navigation and anchors work without hydration. |
| Generic/missing SEO head | Initial title from editorial metadata plus ` | Telnyx Help Center`; description from metadata or meaningful text; canonical from stored identity and configured origin. Exactly one H1 per page. |
| Missing structured data | Article JSON-LD and full collection ancestry in BreadcrumbList, plus Open Graph title/description/URL/type. No invented authors or dates. |
| Sitemap/robots missing | Generate sitemap, robots.txt and llms.txt. Article lastmod uses explicit source modification dates or Git file history, never scrape/build time. Omit unavailable dates. |
| Preview indexing risk | Temporary origin is default; HTML contains `noindex,follow`. robots allows crawling so crawlers can read noindex. Indexability requires an explicit production-only setting. |
| Unknown URLs look like origin errors | Unmapped paths pass through to storage; origin configuration must supply real missing-object 404s. Lookup outages remain 503. See edge/README.md. |
| Broken heading links | Recovered source heading IDs, readable heading aliases and 69 reviewed aliases to equivalent headings/paragraph sections; fixed an encoded stray backslash. Checked internal anchor targets now resolve. |
| Lost videos | Recovered 142 video references across 120 articles as labelled links to the original video providers. Includes Vimeo, YouTube, Wistia and Loom; no heavyweight autoplay embeds. |
| Performance | Approximately 4 KB of browser JS; search index fetched only when used. Images use known intrinsic dimensions, lazy loading and asynchronous decoding. Full content no longer waits for JS/body fetches. |
| Cached pages lose assets during deployment | Preserve previous content-hashed assets instead of deleting them during each upload; HTML uploaded after assets. |
| Missing regression checks | PR verification workflow, frozen dependencies, route/redirect tests, DOM interaction tests, complete generated-page audit and CSV URL-export audit. |

### Inventory after repair

- 906 articles; 115 existing collections (17 roots, 98 children).
- 902 source-evidenced article memberships; four explicit fallback assignments.
- Zero empty leaf collections.
- 1,022 complete pages: homepage + 906 articles + 115 collections.
- The four fallback assignments are privacy-policy guide 8159875, Bosnia 3506082,
  Venezuela 3734973 and Turkey porting 6138781. Workspaces now has source-evidenced
  ownership. Fallback assignment does not create a new collection.

## Four retained articles absent from current Intercom

These local article files and their URLs are preserved as requested. A current
Intercom 404 is not evidence that a GitHub article should be removed.

| ID | Local article |
|---|---|
| 14489375 | Turkey DID Requirements |
| 3506082 | Bosnia Herzegovina DID Requirements |
| 3734973 | Venezuela DID Requirements |
| 6138781 | Turkey Number Porting |

Their history goes back to the original import/SEO edits, so they are not proven
to be recently authored additions. The general explanation—GitHub and Intercom
now diverge—is consistent with keeping them. Bosnia also has a newer published
Intercom article, ID 16823820, which was imported under its distinct URL. No
unsupported redirect between those separate IDs has been invented.

## Remaining editorial issues

The generated audit explicitly reports **12 links** to two pages that are absent
from both current Intercom and this repository:

1. **4404575 — TLS and SRTP:** 11 references, including certificate-download and
   configuration instructions in the Mitel article. The newer TLS certificate
   notice is not an equivalent replacement for all those instructions. Restore
   the missing guide/downloads or confirm the correct replacement destinations.
2. **5377454 — Call Recording:** one reference in Bulk Edit Numbers Voice Settings.
   The current developer API reference is not enough to establish an equivalent
   portal-configuration guide. Restore or identify the intended replacement.

These are different from the four deliberately retained local pages above. They
remain explicit exceptions in the automated link audit, not falsely reported as
working links. `bun run verify:strict` intentionally fails until they are resolved.
The deployment-ready verdict must still treat them as unresolved.

Two other obsolete references were repairable:

- Porting API link now points to the verified current [port-in API guide](https://developers.telnyx.com/docs/numbers/porting/getting-started).
- The HVSD “no longer available” notice retains its text without linking to a
  missing retirement notice. Unknown retired IDs still return 404 unless a real
  replacement is established.

## Verification completed locally

- Frozen Bun install, TypeScript checks (including build scripts), 45 Bun tests,
  and three source-manifest tests pass.
- Full build succeeds; all 1,022 pages contain initial content and metadata.
- Generated audit checks 12,352 internal links, image dimensions/files, anchors,
  sitemap coverage, noindex, unique IDs and collection counts. No unacknowledged
  failures; the 12 retired-content links above are separately listed.
- Local HTTP audit passes all **1,035 unique URLs** assembled from the current
  Intercom sitemap, all local canonical pages, language roots and known custom
  aliases. Every row reaches HTTP 200 with a canonical. No traffic weights were
  assigned to this fixture.
- Tests exercise every known ID's canonical, bare-ID, old-title and trailing-slash
  variants, plus consolidations, query handling, unknown IDs and lookup failures.
- Search/filter DOM tests cover lazy index loading, keyboard selection, Escape,
  failed-fetch retry, stale-result suppression and filter reset. No browser used.
- Client JS: 4,020 bytes, approximately 1,652 bytes gzip. This is an artifact
  measurement, not a Lighthouse or real-user Core Web Vitals score.
- CloudFront artifact: approximately 3 KB function + 90 KB import file, within
  the function/store size budgets. AWS execution and association still need testing.

The older deployed PR57 site is not evidence for this branch's behavior. Local
verification must be repeated on the temporary HTTPS host after deployment.

## Outstanding before contacting Osman / approving the move

1. **Temporary AWS integration:** deploy this branch's HTML and install/test the
   generated CloudFront Function plus KeyValueStore on the exact temporary
   distribution. No suitable AWS access is available in this session. See
   `edge/README.md` for staged rollout, association checks and rollback.
2. **Retired content:** resolve the TLS/SRTP and Call Recording destinations above.
3. **Growth export:** run the actual GSC/backlink URL list, including old custom
   URLs, through `scripts/audit-migration-urls.py`. The fixture is broad coverage,
   but is not a substitute for traffic-weighted evidence. The tool preserves
   supplied clicks/impressions/backlink weights and records redirect chains.
4. **Deployed performance/visual checks:** verify HTTPS headers, gzip/Brotli,
   cache behavior, representative mobile/desktop layouts, keyboard behavior and
   Lighthouse/Core Web Vitals on the temporary deployment. No browser was used,
   as requested, and no field-performance result is claimed.
5. **Future explicit cutover approval:** only after those checks, prepare the
   separately approved production-origin/indexability build and domain plan.
   DNS, certificates, aliases and the support-domain move remain out of scope.

## Growth ticket cross-check

[AITS-391](https://linear.app/telnyx/issue/AITS-391/seo-optimized-migration-of-supporttelnyxcom-to-new-static-site)
was reviewed along with Osman's September 11 comments and the three attached
collection/breadcrumb/move-map files. The old move map is unnecessary after PR57's
explicit source-URL routing. Its objective—correct identities and ancestry—is
implemented and checked directly. “Done” child-ticket statuses were not accepted
as evidence that the rendered site satisfied the migration requirements.

No message has been sent to Osman or Growth from this task.
