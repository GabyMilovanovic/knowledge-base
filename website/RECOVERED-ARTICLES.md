# Recovered articles and backlink redirects

Release notes for `fix/recovered-articles-and-redirects`. Content deployment and CloudFront routing activation are separate steps; verify both on the temporary domain.

## Imported articles

- 4404575 — TLS and SRTP (4 images).
- 96934 — Rate Limits for Messaging (0 images).
- 10523949 — Forwarding SMS/MMS Automation using Telnyx Flow (8 images).
- 3078492 — Migrate Your LRN Lookup API from v1 to v1.1 (3 images).
- 4394516 — Configuring Programmable Fax Applications (9 images).
- 5377454 — Call Recording (4 images).

All 35 image instances across the 16 imported articles are stored locally with content hashes and dimensions. Image enlargement links also use local files. Source URLs, titles, descriptions, scrape dates, source modification timestamps and original heading IDs are retained. Existing source collection memberships are retained; Flow has no published collection and uses the existing messaging fallback. No collections were created.

Flow starts with a bold deprecation notice. The privacy guide (8159875) and Flow (10523949) intentionally use the normal production index,follow behavior and appear in the production sitemap, as requested. Intercom's noindex,nofollow is not carried over. The temporary site remains noindex,follow.

## Redirect mappings

- 1189026, 1189027, 1272690, 1272784, 3264020, 3264037 → 8683996 (3CX v20).
- 5510874 → 6161111 (3CX v18).
- 6589599 → 3679260 (10DLC FAQ).
- 4230755 → 96934 (Rate Limits for Messaging).
- Old title variants of 96934 use the existing ID-based canonical redirect.

These mappings are defined in website/scripts/content/routes.ts and generated into the CloudFront KeyValueStore import. The build rejects redirects whose destinations are absent.

## Infra deployment dependency

Deploy the content build first, then publish the matching route lookup data and verify the associated viewer-request function. GitHub content deployment alone does not update CloudFront routing. Coordinate with the current infrastructure rollout; preserve unrelated routes/configuration. The accompanying routing bundle is a full registry generated from this local branch; do not activate its new targets before the matching content is deployed. No public-domain change is included.

## Validation

- 49 tests pass; TypeScript passes; source manifest and git diff checks pass.
- 922 articles, 115 collections, 1,038 rendered canonical pages; 1,028 sitemap URLs (the 10 noindex pages are excluded).
- Strict audit: 12,625 internal links, zero unresolved links, zero empty collections, zero missing images.
- The former 12 TLS/SRTP and Call Recording link exceptions are resolved and removed.
- Production-mode HTML and sitemap inclusion for 8159875 and 10523949 checked locally; generated artifacts restored to temporary origin/noindex afterward.

## Final historical redirect mappings

- UAE requirements 10087890 → 6683438, United Arab Emirates: SMS Guidelines.
- South Korea DID requirements 5467053 → 5469551, International Numbers - Required Documents (approved general fallback).
- Private Gateway 11409065 → https://developers.telnyx.com/docs/iot-sim/private-wireless-gateway-how-to.

The UAE editor content ID 6463516 maps to public article ID 6683438; it was not an unpublished public article. All three destinations were verified live before implementation. Redirects are approved replacements, not a claim that old country-specific content was recovered.

Infra must publish BOTH the updated function and its matching KeyValueStore data: the earlier function rejects external destinations. This version permits only the exact Private Gateway destination for that article ID; arbitrary external targets remain rejected. Encoded and repeated query parameters are preserved. Existing viewer-request behavior must be retained when integrating changes. Infrastructure deployment and live validation remain pending.

## Additional unlisted articles imported locally

- 2819215 — Bulk Edit Numbers - Caller ID (inbound) (4 images).
- 9670281 — Transition of Canadian Numbers to from Global Channel Billing US Zone to Zone B (0 images).
- 8762970 — Supported Emergency Numbers (0 images).
- 9118675 — New Mobile Charges for International Markets (0 images).
- 2807944 — Bulk Edit Numbers - Call Forwarding (2 images).
- 8380587 — T Mobile Special Business Review (0 images).
- 8173789 — Short Code Best Practices (0 images).
- 8008542 — 403 Restricted origination number D54 (0 images).
- 1130726 — Pending Order Error (0 images).
- 1130719 — What does the “Tech Prefix” option do? (1 images).

These 10 articles preserve their source noindex,nofollow directives and are omitted from the sitemap in both preview and production builds. Their metadata passes through the generated manifest to the HTML renderer. Privacy and Flow remain index,follow in production as explicitly requested. All articles remain directly accessible. No new collections were created; these articles had no source collection, so the existing fallback assignment is used.

Seven additional source images (including an animated GIF) were copied byte-for-byte. Image enlargement links point to local assets. No Intercom CDN links remain in these 10 imported source files. A production-mode render checked all 10 restrictions plus the Privacy/Flow exceptions; preview artifacts were then restored.

All 920 published Intercom article IDs from the API audit now have a repository article (918) or one of the two deliberate consolidation redirects. Four GitHub-only articles remain, giving 922 local articles. This is local coverage, not a claim of deployment or complete historical-URL coverage. The three historical topics above are now covered by approved redirects.
