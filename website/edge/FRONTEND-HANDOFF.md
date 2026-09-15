# Frontend handoff: temporary CloudFront migration

## Scope

Deploy the routing infrastructure for **d27az1l5lty0u1.cloudfront.net only**.
The main GitHub Actions workflow publishes site files to the existing
`s3://support.telnyx.com` origin. The bucket name does not authorize a public-domain
cutover. Do not change DNS, aliases, certificates, or the production domain.
Keep preview pages `noindex,follow` and canonical URLs on the temporary hostname.

Site HTML, content, metadata, collections, counts, images and search deploy through
the existing main workflow. The following infrastructure work remains separate.

## 1. Install the generated routing function and KeyValueStore

Build the exact deployed commit with Bun 1.3.1 (`bun install --frozen-lockfile`,
`bun run build`, in `website/`). The build creates:

- `dist-edge/cloudfront-function.js`: CloudFront JavaScript runtime 2.0 function.
- `dist-edge/key-value-store.json`: canonical route entries for store import.
- `dist-edge/routes.json`: readable ID-to-path inventory for review.

These artifacts must not be uploaded to the public website. Use a versioned store
and function so rollback preserves the prior pair. Inspect any existing
viewer-request CloudFront Function or Lambda@Edge association and integrate its
behavior; do not overwrite an existing handler blindly. Attach the tested,
published LIVE function to every relevant content cache behavior.

This activates:

- `/en`, `/en/`, `/en/index.html`, `/index.html` → one HTTP 301 to `/`.
- Bare IDs, old title variants and trailing slashes → canonical article/collection.
- Consolidated article 10646301 → 6339152; 5617538 → 6339158.
- Previous custom article routes and known former collection routes → canonical.
- Unknown content IDs/paths → HTTP 404, not 403 or a 200 homepage.
- Store failures → HTTP 503, not a false permanent 404.

Preserve encoded/repeated query parameters. URL fragments are handled by the
browser and corresponding targets already exist in the rendered HTML.

## 2. Check distribution behavior and clear stale responses

Resolve the distribution by its exact CloudFront domain name. Export its current
config and ETag before changes, preserving all unrelated settings.

- Default root object: `index.html`.
- Preserve exact extensionless S3 object paths and HTML Content-Type.
- Missing origin content should serve `/404.html` with status 404, not SPA 200.
- Verify content/asset cache policies and gzip/Brotli compression.
- Wait for propagation; invalidate stale HTML and cached errors after rollout.
- The repository currently has no `CLOUDFRONT_DISTRIBUTION_ID` secret, so its
  existing automatic invalidation step is skipped. Configure the correct
  temporary distribution ID and role permission if automatic invalidation is wanted.

## 3. AWS access needed

The frontend team's identity needs rights to inspect/update the target distribution,
create/test/publish the function, create/populate its KeyValueStore, and invalidate
that distribution. Scope access to the relevant resources. The exact permission
policy depends on whether the team imports the initial store or writes its keys
through the KeyValueStore data API; inspect existing IAM before editing it.

The branch deployment attempt failed at authentication, before any S3/CloudFront
API call: `Not authorized to perform sts:AssumeRoleWithWebIdentity`.
Main deployment already has an established authentication path; enabling future
branch deployments is **optional** for this handoff. If wanted, inspect the trust
policy for the role referenced by `AWS_ASSUME_ROLE` and allow the exact subject:

`repo:team-telnyx/knowledge-base:ref:refs/heads/fix/post-57-migration-readiness`

Keep audience `sts.amazonaws.com` and preserve existing trusted subjects and
conditions. Do not broaden trust to every repository or branch merely to fix this.

## Acceptance checks on the temporary HTTPS domain

1. Root, representative articles, and all collection tiers return populated HTML.
2. Both language roots return one 301 then homepage 200.
3. Both consolidated IDs and several bare/old-title IDs return one 301 then 200.
4. HEAD and encoded/repeated query tests pass; no redirect leaves the temporary host.
5. Unknown content URL returns actual 404; canonical pages never return an app shell.
6. Canonicals/sitemap use the temporary origin and HTML retains noindex.
7. Search, filters, heading anchors and mobile/desktop layout are checked.
8. Confirm compression/cache headers and run deployed Lighthouse/performance checks.
9. Run `scripts/audit-migration-urls.py` against Growth's GSC/backlink URL export.
   It records redirect chains and preserves actual traffic weights.

Rollback: restore the previous association using a fresh ETag and redeploy prior
content if necessary. Retain the prior function/store and hashed assets. Do not
wipe the bucket. Detailed rollout guidance is in `edge/README.md`.

## Separate non-infrastructure work

- Restore/confirm replacements for retired TLS/SRTP article 4404575 and Call
  Recording article 5377454 (12 existing links total).
- Receive Growth's actual GSC/backlink URL export; traffic-weighted coverage is
  not established by the local sitemap fixture.
- Public-domain cutover remains a later, explicitly approved task.
