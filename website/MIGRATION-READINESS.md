# Support site migration readiness — 2026-09-15

## Scope and status

- Local branch: `fix/post-57-migration-readiness`, based on merged PR #57 (`214b197`).
- Deployment target for validation: **https://d27az1l5lty0u1.cloudfront.net/**.
- No push, merge, deployment, DNS change, or public-domain cutover has been performed for this branch.
- Intercom was read only to verify existing collections and article provenance. Its configuration/content was not changed.
- **AITS-391 reviewed through the read-only Linear API**, including its description, Osman's September 11 comment, both child-ticket descriptions/statuses, and all three JSON attachments. Browser use stopped when the user supplied API access. No ticket was modified and no API key was saved into repository files or deliverables.

## Implemented locally

### 1. `/en` and `/en/` redirect to `/`

`edge/homepage-redirect.js` returns a permanent HTTP 301 at CloudFront's viewer-request event. `Location` is relative to the same host, so testing stays on the temporary domain. Encoded query values and repeated parameters are preserved. Other paths pass through unchanged.

Reason: the build emits `en/index.html`, but an S3 REST origin requires an exact object key. CloudFront's default root object does not automatically resolve subdirectory index files. Client-side routing never gets a chance to execute when S3 returns 403.

Local verification runs the actual handler before exact-key file serving (`bun run preview:edge`). Both paths return 301 then 200; query attribution survives. The handler is **not installed on CloudFront yet**. See `edge/README.md` for scoped rollout instructions, existing-handler checks, and rollback. A GitHub merge or file upload alone will not install it.

### 2. Existing collection membership restored

All 66 empty leaf collections were linked from the original checked-in Intercom root snapshots. All 66 current Intercom URLs return 200 and list articles. They are existing published collections, not new categories introduced by PR #57.

The migration snapshot omitted their individual membership lists. Their 355 linked articles were all already present locally, all were previously assigned by keyword fallback, and none overlap another recovered membership. Restoring the live lists therefore requires no new collections or articles.

`support-docs/_collection-memberships.json` records each existing collection URL, its parent snapshot evidence, the fetched HTML's SHA-256, the verification date, and ordered article membership. Ingestion applies it before fallback assignment and rejects new collection identities, missing local articles, conflicting ownership, and duplicate entries. Builds do not fetch Intercom.

| Measure | PR #57 | Local branch |
| --- | ---: | ---: |
| Collection URLs | 113 | 113 |
| Article files | 882 | 882 |
| Empty leaf collections | 66 | 0 |
| Articles with recovered membership | 523 | 878 |
| Articles with fallback membership | 359 | 4 |

Example: `/en/collections/1512996-freepbx-setup-configuration` now lists the same nine articles as the current Intercom collection. The local browser check confirms the list and parent breadcrumbs.

No ongoing creation or manual expansion of collections is needed for this fix. Existing collection landing pages can remain as a frozen compatibility layer while search and other article discovery evolve separately.

### 3. Counts include all descendants

Homepage cards and collection headers now count unique available articles across the entire descendant tree. Direct article lists and filters retain their existing scope; headers explicitly say “including subcollections” where applicable. Missing references are excluded and duplicates are counted once.

Examples: Voice API Essentials shows **15**, Global IoT SIMs **21**, and FreePBX **9**. SMS totals are **289** after replacing keyword assignments with the verified memberships; the earlier provisional descendant total of 292 included articles grouped under the wrong root.

## Validation completed

- 35 Bun tests pass using CI's Bun 1.3.1, including real-data membership/count checks and edge redirect tests.
- Type checking and production build pass.
- Support source manifest check passes; all 882 article files and 113 collection identities are retained.
- Real local HTTP requests: `/en` and `/en/` return 301 with `Location: /`; following returns 200. Encoded/repeated query parameters survive.
- Local browser: `/en/` ends at `/`, homepage totals are corrected, and FreePBX displays all nine verified members.
- The remote temporary domain still runs PR #57; these new changes are **not yet verified remotely**.

## Independent audit: remaining work and concrete fixes

| Priority | Observed issue / outstanding check | Proposed fix | Acceptance check |
| --- | --- | --- | --- |
| Before next preview | Branch code has not been deployed; the current GitHub workflow deploys only pushes to main. No AWS CLI/connector/session is available here. | Establish branch deployment to the temporary origin without merging. Identify the exact distribution and existing viewer-request handlers; publish/associate the tested redirect without replacing unrelated logic. Preserve configuration/ETag for rollback. | Temporary `/en` and `/en/` return a single 301 to the same host's root; corrected counts and all 66 recovered collections render there. |
| Before cutover | Route files are copies of the same empty SPA shell. Article text appears only after JavaScript loads and fetches JSON. | Generate page-specific HTML at build time with the full article/collection content and crawlable links; hydrate that HTML for interactive search/navigation. Do not merely render the existing ArticlePage server-side, because its body currently loads in an effect. | With JavaScript disabled, each important page still contains its title, article body, navigation and links. No hydration errors. |
| Before cutover | Initial HTML uses a generic title/description and has no canonical link or Article/Breadcrumb structured data. The browser only updates the title. | Generate unique title and description, self-consistent canonical URL, Open Graph metadata, and accurate Article/BreadcrumbList JSON-LD per route. Keep metadata synchronized during client navigation. Parameterize deployment origin/indexability; do not hardcode preview canonical URLs into the later public build. | Inspect raw HTML for representative articles, collections and homepage; validate structured data; verify navigation updates metadata. |
| Before cutover | Temporary `/robots.txt` and `/sitemap.xml` return 403. No explicit preview noindex protection was found in the shell. | Serve real files with correct MIME types. Protect the preview using an `X-Robots-Tag: noindex` policy or equivalent page directives; do not rely on robots disallow alone for de-indexing. Generate a canonical-URL sitemap for the later indexable build with truthful modification dates. | Preview serves the intended noindex policy; indexable build's sitemap contains all approved canonical URLs and no aliases/404s. No domain change now. |
| Before cutover | Tested article/collection paths with trailing slashes return 403. Unknown article URLs also return raw 403. | Normalize slash variants to the exact canonical route using permanent edge redirects. Configure missing-object handling to serve a helpful page with a true 404, rather than returning the homepage with 200. Scope error behavior to the static-site origin so genuine access problems remain diagnosable. | Known slash variants redirect once to 200. Unknown routes return HTTP 404 and a useful page. Assets retain proper error behavior. |
| Before cutover | Ten distinct internal article links use outdated title slugs for IDs that exist locally. | Build a stable numeric-ID-to-canonical-slug map; rewrite those internal links and generate explicit permanent aliases for historic inbound URLs. Validate duplicate IDs. Preserve queries/fragments. | All ten old paths resolve to the correct existing article; a link checker reports no unresolved aliases. |
| Before cutover | Five distinct internal article targets have no local page. Four currently return 404 in Intercom; one active page is missing from the snapshot. | Import the active missing 10DLC Privacy Policy & Terms article (`8159875`) with verified content/provenance. For the four retired targets, obtain editorial confirmation of the best equivalent replacement or intentional removal; update internal links and use 301 only when the replacement is relevant, otherwise 404/410. | Active content is preserved. No links point to missing pages. Redirects do not send unrelated topics to the homepage. |
| Before cutover | Old custom `/article/...` and `/collection/...` routes were removed by PR #57. | Preserve article aliases with direct 301s. Map prior synthetic collection URLs to appropriate existing collection URLs using an explicit reviewed table. No new collection pages are required. | Representative bookmarked/shared old URLs resolve in one hop with no redirect loops. |
| Before cutover | Existing Markdown contains 58 cross-page fragment links and same-page Intercom anchors. The renderer does not generate heading IDs from Markdown. | Recover original Intercom heading IDs where evidenced; generate stable IDs for new headings; preserve aliases for old fragments. Scroll to anchors after async article content is ready, instead of unconditionally leaving users at the top. | Known deep links land at the correct heading after direct load and client-side navigation. |
| Before cutover | Root metadata/content includes scraper artifacts and awkward generated descriptions; some article bodies duplicate headings. | Preserve useful source titles/excerpts, remove scrape artifacts from rendering, and review SEO descriptions instead of using blanket boilerplate. Keep one H1 per page and stable section headings. | Spot-check high-traffic pages against Intercom for body, title, heading, description, images, tables and links. |
| Before cutover | Four local articles still use fallback ownership. Workspaces is live and its breadcrumb confirms the current General root. Bosnia Herzegovina DID Requirements, Venezuela DID Requirements and Turkey Number Porting return 404 on Intercom. | Record Workspaces' verified ownership if eliminating fallback metadata is desired. Have content owners decide whether the three removed Intercom articles should remain available or map to replacements. Do not delete them automatically. | Every retained article is discoverable; any retirement has an explicit URL/content decision. |
| Before cutover | Restoring these 66 collections does not prove that every currently published Intercom URL is in the July snapshot. One active missing article is already confirmed. | Export/crawl the current published URL inventory and combine it with high-traffic/backlink URLs from Growth/Search Console. Classify every URL as retained, relevant redirect, or intentional 404/410; compare bodies and metadata for high-traffic pages. | No unexplained missing published or high-traffic URLs. No new collections created as a side effect. |
| Before cutover | Website tests run in the deployment workflow after main is updated. CloudFront invalidation is skipped with the current unset distribution ID. | Add PR-level manifest, test, type-check, build, link and route verification. Add temporary-domain post-deploy smoke checks and explicit cache invalidation. Keep merge approval separate from preview deployment. | Changes fail before merge when routes/content regress; preview deploy proves new assets are served rather than stale copies. |
| Before cutover | Build warns about an approximately 1 MB minified entry bundle. No Core Web Vitals measurement has been performed. | After prerendering, lazy-load heavy article rendering/search work as appropriate, preserve immutable hashed assets during rolling deploys, and measure mobile loading, layout shifts and interactions. Optimize based on measurements. | Run agreed mobile performance checks on the temporary domain; verify images/fonts load and layout remains stable. |
| Launch planning only | Analytics, Search Console ownership, event parity, monitoring and rollback are not yet verified. | Have Growth specify measurement IDs/events and high-traffic acceptance URLs; prepare a reversible cutover plan and post-launch monitoring for 404s, crawl errors, traffic and conversions. | Growth signs off on measurements and URL parity. User explicitly approves merge/cutover in a later step. |

### Active article absent locally

https://support.telnyx.com/en/articles/8159875-10dlc-privacy-policy-terms-and-conditions-best-practices

This is referenced by the existing campaign-approval article. It returned 200 during this audit but has no matching local article ID.

### Retired internal targets requiring editorial decisions

- `5377454-call-recording`
- `4404575-tls-and-srtp`
- `1130736-mission-control-api-porting`
- `6461350-hvsd-outbound-profile-end`

All returned 404 on the current Intercom site during this audit. No replacement destination has been guessed.

## AITS-391: requirement-by-requirement plan

Source: https://linear.app/telnyx/issue/AITS-391/seo-optimized-migration-of-supporttelnyxcom-to-new-static-site

Reviewed the parent description, Osman's comment (posted September 11, using September 10 evidence), the breadcrumb export for 903 live articles, `move_map.json`, and `_tree.json` (115 collections). Child tickets `DOT-1862` and `AITS-423` are marked Done in Linear. That does **not** mean their requirements are satisfied by the currently deployed artifacts.

The original baseline in the ticket is 20,504 clicks and 2.16M impressions over April 10–July 9, including 1,140 collection clicks. Osman's later comment reports a different snapshot: 92 collection URLs, 918 clicks and 122,922 impressions. These are historical ticket figures, not new measurements from this audit; do not combine their periods. The GSC URL-level export for the 92 collection URLs / roughly 500 legacy article variants is not among the three JSON attachments, so it is still needed for exact traffic-weighted verification.

### Recommended architecture

Keep Vite/React and S3/CloudFront. Implement build-time prerendering, a shared metadata builder, and a generated canonical-ID lookup for edge redirects. The ticket's `generateMetadata`, `metadataBase`, and `next.config.js` snippets describe Next.js implementations of the requirements; switching frameworks is not necessary to achieve the required HTML and HTTP behavior.

| Ticket requirement | Current status | Concrete implementation | Completion test |
| --- | --- | --- | --- |
| 1a. Preserve original article paths using `source_url` | Implemented for the 882 currently checked-in articles by PR #57; inventory is incomplete | Keep `source_url` authoritative. Import the missing retained content described below, update confirmed renamed canonical URLs, and preserve old variants with explicit 301s. | Every approved current sitemap/GSC URL returns its intended article at the canonical path or a relevant single-hop 301. |
| 1b. Route by article ID, including bare IDs and arbitrary old slugs | Not implemented; PR #57 matches exact slugs | Generate an ID → canonical path registry from content. At viewer-request, match `/en/articles/<id>` and `/en/articles/<id>-<anything>`; for known IDs, 301 to the stored canonical path if different, preserving query parameters. Unknown IDs remain true 404. Extend the same normalization to collection IDs. | Bare IDs, incorrect title slugs, the ten observed old links, and the roughly 500 GSC variants resolve correctly. Canonical requests do not redirect. |
| 1c. Preserve collection URLs, including second/third tiers | 113 existing URLs are served; this branch fixes 66 empty leaves. Attachment contains 115 collections | Preserve the current 113 identities. Restore the **existing published** Telnyx Email and RCS Support Articles roots and their verified memberships when importing missing content. This is preservation, not creation of new categories. Freeze this registry; do not generate new topical buckets. | All 115 confirmed live collection identities are represented, and every relevant GSC collection URL returns the matching page. Treat `9526270-telnyx-flow` separately because the ticket says it is already gone; confirm before deciding 404/410/redirect. |
| 2a. Self-referencing canonical tags | Absent in initial and rendered metadata | One `buildPageMetadata` function takes canonical identity from stored content, never the requested variant; output a single canonical link in build-time HTML. Strip query parameters from the canonical. Use the configured deployment origin. | Exact canonical route, correct host, no parameters, one tag; legacy aliases cannot canonicalize to themselves. |
| 2b. Explicit origin and no trailing slashes | Origin handling and edge slash policy still needed | Use `SITE_ORIGIN=https://d27az1l5lty0u1.cloudfront.net` and preview noindex for this phase. Store canonical paths without trailing slashes. Edge-redirect slash variants directly to the canonical path. A later separately approved public build switches the origin/indexability settings. | Temporary navigation, redirects and metadata stay on the temporary host. `/en/` redirects to `/`; article/collection slash variants redirect once to their non-slash paths. |
| 3a. SEO title/description frontmatter and exact title template | Fields largely exist from AITS-423, but `build-content.ts` currently chooses the H1 for article title and the browser uses a different suffix | Preserve a separate SEO title from frontmatter while keeping the display H1 where intended. Metadata title = SEO title + ` | Telnyx Help Center`; description = frontmatter description. Use cleaned H1/first substantive paragraph only as fallbacks. Add diagnostics for the ticket's 60-character title-field and 100–160-character description guidance; review poor copy rather than truncating it blindly. | Raw HTML contains the intended per-page values/template; missing-field fixtures exercise real fallbacks; Growth reviews high-traffic snippets. |
| 3b. Strip page furniture, exactly one H1 and useful introduction | Cleanup exists but visible artifacts/duplicate heading content remain in samples | Parse/remove scraper title suffix, skip link, author/avatar/byline, update text, TOC and feedback furniture using focused fixtures. Render the article page H1 once. Select description fallback after cleanup and preserve real instructions/images/tables. | One H1 per article, no page furniture, meaningful fallback description, content comparison for representative complex/high-traffic articles. |
| 4. Content and metadata in initial HTML | Not implemented; all route files are the same SPA shell | Replace route-shell copying with build-time React rendering for each canonical page. Inject the article body synchronously into ArticlePage through initial data/props (not an effect-only fetch). Render shared layout and metadata; hydrate using the same initial data to avoid mismatches. Ensure browser-only bootstrap code is excluded from the server entry. | JavaScript-disabled requests expose the complete article/collection and head tags. Hydration succeeds and client navigation does not restore generic metadata or lose anchors. |
| 5a. New sitemap | Missing; temporary `/sitemap.xml` returns 403 | Generate sitemap entries from the approved canonical content registry, including preserved nested collections. Use verified content modification timestamps or omit `lastmod` where unknown; never use build time as a fake update date. | Valid XML/MIME, canonical 200 URLs only, no alias/error URLs, truthful dates and full approved coverage. |
| 5b. Robots and Search Console | Temporary robots returns 403; launch submission not yet appropriate | Serve robots.txt, add preview noindex, and keep indexability environment-specific. Before an explicitly approved public launch, generate the public sitemap, allow intended crawling, remove staging noindex, and submit/verify the sitemap in the existing Search Console property. | Preview stays non-indexable; a release check blocks public launch if staging directives remain. Search Console verification/submission is a launch action, not performed now. |

**ID-routing implementation detail:** a complete slug registry should not be embedded in the CloudFront Function source. CloudFront Functions have a 10 KB code limit. Use CloudFront KeyValueStore with runtime 2.0 for the generated registry (or an already-approved equivalent edge mechanism). Deploy compatible objects before publishing the corresponding redirect registry, then test the distribution. The small homepage-only redirect implemented in this branch does not require KeyValueStore.

### How Osman's six collection steps change after PR #57

1. **Live breadcrumb registry:** keep this requirement. The attached evidence and current live leaf pages verify identity, title, parent and membership. Current local ownership agrees with all 878 article IDs shared with the breadcrumb export.
2. **Slash-joined internal paths:** no longer necessary. PR #57 stores explicit `parentPath`/`childCollectionPaths` while using the original numeric-slug identity. Validate parents, unique IDs, cycles and membership instead of reconstructing parents from directories.
3. **Write `_tree.json`:** use the attached tree as reconciliation evidence, not as a drop-in replacement for code removed by PR #57. Maintain one frozen explicit collection registry with the same public identities. Do not keep two competing sources of hierarchy.
4. **877 file moves + 15 renames:** no longer necessary to obtain correct routing/membership. PR #57 distinguishes collection sources via `source_url`, and the local membership snapshot restores missing leaf lists. Avoid a mass rename that would add churn and could affect downstream consumers. Still regenerate/validate the manifest whenever actual article files change.
5. **Legacy collection routes:** already implemented for the 113 known identities by PR #57. Add only the two already-published missing roots during content reconciliation; do not reinstate synthetic `/collection/...` identities as new collections.
6. **Traffic-based verification:** still required. Obtain the actual GSC URL export and test every traffic-bearing URL against the temporary domain, including ID aliases and relevant redirects. The attachment's statement about 91/92 coverage is evidence to validate, not a replacement for endpoint tests.

### Reconciled inventory: more precise than “23 missing articles”

The current Intercom sitemap fetched on September 15 contains **920 URLs: 903 articles and 17 top-level collections**. The original ticket's 899 URLs / 884 articles / 15 collections is an older snapshot. Its breadcrumb attachment expands those collections to **115 total**.

Comparing by numeric article ID with this branch's 882 articles:

- **25 sitemap article IDs are absent locally.** Of these, **23 are additions absent from the snapshot**, while two (`10646301`, `5617538`) were intentionally deleted from the repository in PR #51 but remain live in Intercom. Preserve their inbound traffic with the verified consolidation redirects to `6339152-how-to-create-a-10dlc-campaign` and `6339158-bring-campaigns-to-telnyx` (canonical slugs verified in the current registry); the IDs/destinations come from the earlier consolidation, not a blanket homepage redirect. Do not blindly re-import deleted duplicates.
- **One additional active internally linked article**, `8159875-10dlc-privacy-policy-terms-and-conditions-best-practices`, is missing locally and is not in the current sitemap. Sitemap-only checks would miss it. Import its verified content as well.
- **One renamed canonical article:** ID `14327893` changed from `telnyx-freemium-accounts` to `telnyx-pretrial-accounts`. Current Intercom redirects the old form to the new form. Update the canonical identity/content and let the ID redirect preserve the old URL. Do not classify it as deleted.
- **Two missing collections:** `19683795-telnyx-email` and `19730222-rcs-support-articles`. Both return 200 now and are in the attached 115-entry tree. Restoring them preserves existing published pages; it does not introduce new categories.
- **Four local articles return 404 in Intercom:** `14489375-turkey-did-requirements`, `3506082-bosnia-herzegovina-did-requirements`, `3734973-venezuela-did-requirements`, `6138781-turkey-number-porting`. The first is still linked from an existing live leaf collection. Retain locally until content owners confirm replacements/retirement. The new Bosnia article has ID `16823820`; verify equivalence before redirecting the old ID.
- **No collection-owner mismatches** were found for the 878 current article IDs that also occur in Osman's breadcrumb export. This independently corroborates the restored membership rather than relying only on keyword guesses.

The exact missing-URL list is included in the deliverable inventory appendix. Content import and these additional canonical/redirect changes are proposed next work, not implemented by the current branch.

### Work order and release gates

1. Keep the implemented homepage redirect, collection-membership repair and descendant counts as a local checkpoint.
2. Reconcile/import the missing retained content and two existing collection roots; capture final source data before Intercom is retired. Preserve explicit redirects for consolidated/renamed content. Freeze the compatibility registry.
3. Prerender content and generate metadata together; add the exact title/description cleanup rules and structured data as one coherent page-generation change.
4. Add canonical ID redirects, slash handling, proper 404s, sitemap and environment-specific robots/indexability.
5. Deploy the branch to the temporary domain via a branch-capable path, with no merge. Run automated HTTP, no-JS content, link, heading-anchor, metadata and performance checks; verify Growth's top pages and all supplied GSC URLs.
6. Obtain Growth/content sign-off and the user's explicit greenlight before merging. Domain cutover remains a separate, later authorization.

Outstanding inputs: non-browser AWS/deployment access for the temporary distribution; GSC/backlink URL-level exports (not just aggregate figures); content-owner decisions for retired/consolidated material. The read-only Linear credential was used only to read the issue and its attachments.

## Technical references

- AWS explains that CloudFront's default root object does not resolve subdirectory indexes: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html
- AWS viewer-request redirect example: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_redirect_based_on_country_section.html
- Google recommends useful rendered HTML, unique metadata, canonical URLs and meaningful HTTP status codes for JavaScript sites: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google migration guidance: https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes

Keeping URLs and content consistent reduces migration risk; it does not guarantee unchanged search rankings.

## Inventory appendix

### Current sitemap article IDs absent locally

- https://support.telnyx.com/en/articles/5617538-10dlc-shared-campaigns — deliberately consolidated in PR #51; use the relevant redirect
- https://support.telnyx.com/en/articles/10646301-telnyx-10dlc-process — deliberately consolidated in PR #51; use the relevant redirect
- https://support.telnyx.com/en/articles/15853622-getting-started-with-telnyx-email — retained content import required
- https://support.telnyx.com/en/articles/15853623-setting-up-your-email-sending-domain — retained content import required
- https://support.telnyx.com/en/articles/15853624-troubleshooting-email-domain-verification — retained content import required
- https://support.telnyx.com/en/articles/15853625-why-didn-t-my-email-arrive — retained content import required
- https://support.telnyx.com/en/articles/15853626-managing-email-suppressions-and-unsubscribes — retained content import required
- https://support.telnyx.com/en/articles/15864441-custom-voicemail-greetings — retained content import required
- https://support.telnyx.com/en/articles/15948276-upcoming-tls-certificate-changes-for-telnyx-sip-proxies — retained content import required
- https://support.telnyx.com/en/articles/16099889-setting-up-and-troubleshooting-telnyx-email-webhooks — retained content import required
- https://support.telnyx.com/en/articles/16099890-understanding-telnyx-email-errors-and-message-size-limits — retained content import required
- https://support.telnyx.com/en/articles/16099891-preventing-duplicate-emails-with-idempotency — retained content import required
- https://support.telnyx.com/en/articles/16099893-creating-and-sending-email-templates — retained content import required
- https://support.telnyx.com/en/articles/16099894-scheduling-and-cancelling-an-email-send — retained content import required
- https://support.telnyx.com/en/articles/16220836-how-to-use-telnyx-ai-inference-with-openclaw — retained content import required
- https://support.telnyx.com/en/articles/16221027-how-to-use-telnyx-ai-inference-with-hermes-agent — retained content import required
- https://support.telnyx.com/en/articles/16256133-10dlc-campaign-compliance-guide — retained content import required
- https://support.telnyx.com/en/articles/16290008-toll-free-submission-guide — retained content import required
- https://support.telnyx.com/en/articles/16296358-branded-calling-display-requirements — retained content import required
- https://support.telnyx.com/en/articles/16300025-whatsapp-documents-accepted-for-meta-business-verification — retained content import required
- https://support.telnyx.com/en/articles/16624343-rcs-fees-and-charges — retained content import required
- https://support.telnyx.com/en/articles/16624885-rcs-api-onboarding-guide — retained content import required
- https://support.telnyx.com/en/articles/16624919-rcs-agent-submission-form-field-by-field-guide — retained content import required
- https://support.telnyx.com/en/articles/16666680-custom-sip-x-header-propagation-on-telnyx — retained content import required
- https://support.telnyx.com/en/articles/16823820-bosnia-and-herzegovina-did-requirements — retained content import required

### The 66 existing Intercom leaf collections restored locally

All returned 200 and contained local article links on September 15. Membership counts below are direct members verified against the live collection HTML. No new categories were created.

| Existing collection | Articles restored |
| --- | ---: |
| [Reporting Articles and Guides](https://d27az1l5lty0u1.cloudfront.net/en/collections/2484711-reporting-articles-and-guides) | 4 |
| [Telnyx Pricing & Rate Insights](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513032-telnyx-pricing-rate-insights) | 8 |
| [Fees and Agreements](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513029-fees-and-agreements) | 4 |
| [Telnyx Billing & Payment Guide](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513295-telnyx-billing-payment-guide) | 3 |
| [Important to note](https://d27az1l5lty0u1.cloudfront.net/en/collections/2184183-important-to-note) | 4 |
| [DID Requirements](https://d27az1l5lty0u1.cloudfront.net/en/collections/3662308-did-requirements) | 87 |
| [Porting to Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/133180-porting-to-telnyx) | 23 |
| [International Porting](https://d27az1l5lty0u1.cloudfront.net/en/collections/133197-international-porting) | 54 |
| [Porting from Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/133185-porting-from-telnyx) | 4 |
| [Porting Policy & Procedures](https://d27az1l5lty0u1.cloudfront.net/en/collections/133190-porting-policy-procedures) | 3 |
| [Carrier Services (LNP](https://d27az1l5lty0u1.cloudfront.net/en/collections/133199-carrier-services-lnp) | 1 |
| [Porting Away from your current provider](https://d27az1l5lty0u1.cloudfront.net/en/collections/2287218-porting-away-from-your-current-provider) | 4 |
| [3CX Configurations with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/1512990-3cx-configurations-with-telnyx) | 3 |
| [Acrobits Softphone Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3252772-acrobits-softphone-telnyx-setup) | 1 |
| [Alcatel SIP Door Integration Guide](https://d27az1l5lty0u1.cloudfront.net/en/collections/3499438-alcatel-sip-door-integration-guide) | 1 |
| [Algo Technologies](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249205-algo-technologies) | 1 |
| [Asterisk Trunk Configuration Guides](https://d27az1l5lty0u1.cloudfront.net/en/collections/1892172-asterisk-trunk-configuration-guides) | 2 |
| [Audiocodes 400HD Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3262058-audiocodes-400hd-telnyx-setup) | 1 |
| [Avaya SIP Trunk with Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513009-avaya-sip-trunk-with-telnyx-setup) | 2 |
| [BuddyTalk BT Series Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3257454-buddytalk-bt-series-telnyx-setup) | 1 |
| [Cisco SIP Trunk & Setup Guide](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513000-cisco-sip-trunk-setup-guide) | 6 |
| [Counterpath/Bria](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249202-counterpath-bria) | 2 |
| [Demo Software Apps](https://d27az1l5lty0u1.cloudfront.net/en/collections/3776847-demo-software-apps) | 1 |
| [Dinstar C60 Telnyx Configuration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3417828-dinstar-c60-telnyx-configuration) | 1 |
| [Elastix PBX Trunk Setup Guides](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513018-elastix-pbx-trunk-setup-guides) | 4 |
| [Epygi IP PBX Telnyx Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249241-epygi-ip-pbx-telnyx-integration) | 1 |
| [E-SBC Integration & Setup Guides](https://d27az1l5lty0u1.cloudfront.net/en/collections/2470353-e-sbc-integration-setup-guides) | 6 |
| [Fanvil IP Phones Telnyx Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3258925-fanvil-ip-phones-telnyx-integration) | 12 |
| [Flyingvoice Telnyx Configuration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3258915-flyingvoice-telnyx-configuration) | 1 |
| [FreePBX Setup & Configuration](https://d27az1l5lty0u1.cloudfront.net/en/collections/1512996-freepbx-setup-configuration) | 9 |
| [FortiFone Series Telnyx Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3258539-fortifone-series-telnyx-integration) | 2 |
| [FreeSWITCH Trunk Configurations](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513006-freeswitch-trunk-configurations) | 2 |
| [FusionPBX Telnyx Integrations](https://d27az1l5lty0u1.cloudfront.net/en/collections/1893265-fusionpbx-telnyx-integrations) | 1 |
| [Gigaset Devices Telnyx Configuration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3260451-gigaset-devices-telnyx-configuration) | 3 |
| [Grandstream Devices & Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513008-grandstream-devices-telnyx-setup) | 16 |
| [GoAutoDial SIP Trunk Configurations](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513012-goautodial-sip-trunk-configurations) | 2 |
| [Konftel 300 Series Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3257400-konftel-300-series-telnyx-setup) | 2 |
| [Linphone Configuration with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249281-linphone-configuration-with-telnyx) | 1 |
| [Mediatrix C7/4100 Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249245-mediatrix-c7-4100-telnyx-setup) | 1 |
| [MicroSIP Telnyx Configuration Guide](https://d27az1l5lty0u1.cloudfront.net/en/collections/3421144-microsip-telnyx-configuration-guide) | 1 |
| [Microsoft Teams](https://d27az1l5lty0u1.cloudfront.net/en/collections/3421382-microsoft-teams) | 4 |
| [Mitel 5300 & 6900 Series Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3480489-mitel-5300-6900-series-setup) | 2 |
| [NCH Express Talk Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3257168-nch-express-talk-telnyx-setup) | 1 |
| [Panasonic KX Series Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/3257325-panasonic-kx-series-telnyx-setup) | 2 |
| [PBXes Trunk Connection to Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/3251399-pbxes-trunk-connection-to-telnyx) | 1 |
| [PhoneSuite Systems](https://d27az1l5lty0u1.cloudfront.net/en/collections/3252771-phonesuite-systems) | 1 |
| [Polycom & Plantronics Telnyx Setups](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249284-polycom-plantronics-telnyx-setups) | 2 |
| [Positron IP Solutions with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/3021487-positron-ip-solutions-with-telnyx) | 2 |
| [SAML Providers](https://d27az1l5lty0u1.cloudfront.net/en/collections/3021488-saml-providers) | 6 |
| [ScopTEL IP PBX Telnyx Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3254096-scoptel-ip-pbx-telnyx-integration) | 1 |
| [sipXecs PBX Telnyx Configuration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3417753-sipxecs-pbx-telnyx-configuration) | 1 |
| [Synway UC-200 Telnyx Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3252490-synway-uc-200-telnyx-integration) | 1 |
| [Snom Devices Telnyx Configuration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3262008-snom-devices-telnyx-configuration) | 3 |
| [Ubiquiti Unifi Talk Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3417562-ubiquiti-unifi-talk-integration) | 2 |
| [Vicidial Trunk Setups with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/1513007-vicidial-trunk-setups-with-telnyx) | 2 |
| [VitalPBX Configuration with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249200-vitalpbx-configuration-with-telnyx) | 1 |
| [Vodia Multi-Tenant PBX Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249358-vodia-multi-tenant-pbx-integration) | 1 |
| [Voice Elements](https://d27az1l5lty0u1.cloudfront.net/en/collections/3430505-voice-elements) | 1 |
| [VXC Integration & Setup Guide](https://d27az1l5lty0u1.cloudfront.net/en/collections/1512998-vxc-integration-setup-guide) | 3 |
| [Vtech VCS754: Telnyx Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3263617-vtech-vcs754-telnyx-integration) | 1 |
| [Wildix SIP Trunk Setup with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/3252489-wildix-sip-trunk-setup-with-telnyx) | 1 |
| [Xorcom PBX SIP Trunk Integration](https://d27az1l5lty0u1.cloudfront.net/en/collections/3249238-xorcom-pbx-sip-trunk-integration) | 1 |
| [Yealink & Yeastar Telnyx Setup](https://d27az1l5lty0u1.cloudfront.net/en/collections/1892168-yealink-yeastar-telnyx-setup) | 3 |
| [Zoiper Configurations with Telnyx](https://d27az1l5lty0u1.cloudfront.net/en/collections/1892167-zoiper-configurations-with-telnyx) | 4 |
| [General](https://d27az1l5lty0u1.cloudfront.net/en/collections/2492902-general) | 15 |
| [SIP Connection](https://d27az1l5lty0u1.cloudfront.net/en/collections/2505344-sip-connection) | 8 |

These links point to the temporary host for review; the new memberships are local-only until the branch is deployed. Source evidence is recorded in `_collection-memberships.json`.

### Known internal article slug aliases

- `/en/articles/8020222-mission-control-portal-ai-chat-support`
- `/en/articles/1130710-what-is-dtmf`
- `/en/articles/8344129-get-started-with-telnyx-storage-guide`
- `/en/articles/8428806-global-channel-billing`
- `/en/articles/4380325-purchasing-numbers`
- `/en/articles/5253876-ms-teams-telnyx-pstn`
- `/en/articles/6420959-sales-gst-and-telecommunication-taxes`
- `/en/articles/6187273-grandstream-connecting-the-grandstream-gds3710-with-wave-lite-android`
- `/en/articles/3505912-australia-number-requirements`
- `/en/articles/6622229-pstn-local-calling-with-telnyx`

### Edge ID-registry reference

CloudFront Function code has a 10 KB limit; use a generated KeyValueStore registry for all article/collection IDs rather than embedding all slugs in code: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cloudfront-limits.html
