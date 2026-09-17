# Temporary-site routing and rollout

**Architecture change prepared locally; not deployed.** Activate only after the
origin prerequisites below are complete. Public-domain cutover is out of scope.
Target only `d27az1l5lty0u1.cloudfront.net` and its existing origin.

## Generated artifacts

`bun run build` writes complete pages to `dist/` and routing artifacts to
`dist-edge/` (never upload this directory as public website content):

- `routes.json`: canonical article/collection paths keyed by numeric Intercom ID.
- `key-value-store.json`: CloudFront KeyValueStore import data (`data`, `key`, `value`).
- `cloudfront-function.js`: JavaScript runtime 2.0 viewer-request function using
  the associated KeyValueStore. Missing entries pass through to the origin;
  store outages remain 503.

`routing.js` is the shared routing implementation used by tests, local HTTP
preview, and the generated CloudFront Function. The older standalone
`homepage-redirect.js` is superseded by this combined handler; do not attach both.

The store keeps the complete routing inventory outside CloudFront Functions'
10 KB code limit. The build fails if generated code exceeds that limit.

## Behavior

- `/en`, `/en/`, `/en/index.html`, `/index.html` → HTTP 301 `/`.
- Bare numeric article/collection IDs, old titles, and trailing slash variants →
  one HTTP 301 to the current canonical URL, on the same host.
- PR 51 IDs 10646301 → 6339152 and 5617538 → 6339158.
- Previous `/article/en--articles--ID-title`, `/article/ID-title`, and
  `/collection/ID-title` paths resolve by ID. Known former synthetic collection
  paths have explicit mappings. Unmapped paths reach the origin unchanged;
  absent objects return 404 once the origin prerequisites are configured.
- Encoded/repeated query parameters are preserved. Browsers retain fragments
  when following a redirect with no fragment in Location; fragments never reach
  the server. The rendered HTML contains the verified heading/section aliases.
- Unmapped pages reach storage: an uploaded exact-key page returns 200, while
  a missing object returns 404. GET/HEAD supported; others 405.

## Local verification

```sh
bun run build
bun run type-check
bun test
bun run verify
bun run preview:edge
curl -I http://127.0.0.1:4173/en/
curl -I 'http://127.0.0.1:4173/en/articles/10646301-old-title?utm_source=test'
```

The preview serves exact S3 keys behind the actual routing function, without
an SPA fallback that could disguise missing objects. No JavaScript is needed to
read an article, follow collection links, or follow a heading anchor. Search and
filtering progressively enhance the static HTML.

## AWS rollout procedure (requires infrastructure access)

1. Resolve the distribution by **exact** domain name above. Save its current
   configuration, ETag, origins, ordered cache behaviors, function associations,
   cache policies, compression settings, and custom error responses.
2. Confirm which cache behaviors handle content URLs. Integrate with any existing
   CloudFront/Lambda@Edge viewer-request logic; never overwrite an association
   blindly. Leave DNS, aliases, certificates, origins, and public-domain settings
   unchanged.
3. Populate and verify the KeyValueStore before activating the function with
   `cloudfront-js-2.0`. Preserve existing retired-ID and historical mappings.
   Normal new canonical pages do not require a store entry; mapping updates
   are still needed for renamed/retired IDs and ID-based aliases. Do not clear
   the live store during updates. Automating those updates remains separate work.
4. Test the generated function in CloudFront's development stage: homepage roots,
   existing canonical pages, arbitrary title variants, both consolidations,
   unknown IDs, HEAD, and repeated/encoded query parameters. Test that lookup
   failures do not masquerade as permanently missing pages.
5. Upload the approved release's `dist/` to the temporary distribution's existing
   origin through the existing GitHub deployment workflow. Assets first; HTML last. Preserve
   prior hashed assets for cached pages and rollback. Extensionless article and
   collection objects need `Content-Type: text/html; charset=utf-8`.
6. Publish the function; attach its LIVE ARN to the relevant viewer-request
   behaviors using a fresh ETag while preserving the rest of the configuration.
   Ensure the default root object is `index.html`. Apply the origin prerequisites
   below: real missing-object 404s use `/404.html`, never a 200 SPA fallback or
   a blanket conversion of permission failures.
7. Wait for deployment, invalidate stale HTML/errors, then run the same route and
   URL-export checks against the temporary HTTPS host. Confirm Content-Type,
   gzip/Brotli compression, initial HTML, noindex, canonical origin, and statuses.
8. Save the deployment/version/verification record. No public-domain cutover.

Rollback: restore prior function association with a fresh ETag and redeploy the
previous content build. Keep the previous store/function and hashed assets until
rollback is no longer needed. Do not delete the bucket.

The current push-to-main workflow uploads website files; it **does not install
this function/store**. A successful build is not evidence of a deployed redirect.
Before any future approved public launch, rebuild with the production origin and
explicit indexability setting; that is deliberately outside this branch rollout.

References:

- [CloudFront Functions event/response format](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/functions-event-structure.html)
- [CloudFront KeyValueStore](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/kvs-with-functions.html)
- [Default root object behavior](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html)

## Origin prerequisites for pages without route registration

This handler no longer decides that a missing route entry means missing content.
The production S3 REST origin must distinguish nonexistent objects from access
failures before this function is activated:

- Grant `s3:ListBucket` on the content bucket to the CloudFront origin identity
  (the existing OAI, or the configured OAC principal if migrated). Preserve
  `s3:GetObject` for the intended content. Do not grant public bucket access.
- Test both GET and HEAD for missing objects: S3 must return 404, not 403.
  Keep genuine permission failures as 403; do not blanket-map 403 to 404.
- Configure a CloudFront custom 404 response using `/404.html` with status 404.
  Remove homepage-body error substitutions for this distribution only.
- Preserve the default root object and prevent public bucket-list requests;
  do not forward S3 listing query parameters to the bucket root.
- Use a short documented error-cache TTL and invalidate stale cached errors
  on deployment, including errors cached before a newly published page existed.
- Publish and associate the generated function; uploading website files alone
  does not activate its revised behavior. Integrate with infra PR #250 rather
  than deploying its earlier registry-gated handler.

Local regression verification must include an uploaded article deliberately
absent from the lookup store (GET 200 / HEAD 200), unknown article/collection/
arbitrary paths (404), existing legacy mappings (301 then 200), and lookup
failure (503). Repeat the same checks on the temporary distribution after rollout.

This change removes the need to register a new canonical article, not the need
for historical redirect data. A stale entry for an existing renamed ID can still
redirect to the prior URL, so coordinate that mapping update with its content
release and retain the old destination until propagation completes. Missing
entries are distinct from an unavailable lookup service: service failures still
return 503 to avoid silently dropping established redirect behavior. This is
not a fully lookup-free architecture.

AWS reference: [S3 GetObject missing-key status and ListBucket permission](https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html).
