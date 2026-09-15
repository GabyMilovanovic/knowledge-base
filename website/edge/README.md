# Temporary-site routing and rollout

**Not deployed.** The local branch must not be merged or switch the public domain.
Target only `d27az1l5lty0u1.cloudfront.net` and its existing origin.

## Generated artifacts

`bun run build` writes complete pages to `dist/` and routing artifacts to
`dist-edge/` (never upload this directory as public website content):

- `routes.json`: canonical article/collection paths keyed by numeric Intercom ID.
- `key-value-store.json`: CloudFront KeyValueStore import data (`data`, `key`, `value`).
- `cloudfront-function.js`: JavaScript runtime 2.0 viewer-request function using
  the associated KeyValueStore. Unknown IDs return 404; store outages return 503.

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
  paths have explicit mappings. Unidentified custom paths are 404 until mapped
  from the actual historical URL export.
- Encoded/repeated query parameters are preserved. Browsers retain fragments
  when following a redirect with no fragment in Location; fragments never reach
  the server. The rendered HTML contains the verified heading/section aliases.
- Unknown content paths return real HTTP 404. GET/HEAD supported; others 405.

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
3. Create/import a versioned KeyValueStore from `key-value-store.json`. Associate
   it with a dedicated function using `cloudfront-js-2.0`. For subsequent releases,
   stage a new store/function pair instead of deleting active keys mid-rollout.
4. Test the generated function in CloudFront's development stage: homepage roots,
   existing canonical pages, arbitrary title variants, both consolidations,
   unknown IDs, HEAD, and repeated/encoded query parameters. Test that lookup
   failures do not masquerade as permanently missing pages.
5. Upload this branch's `dist/` to the temporary distribution's existing origin
   through a branch-capable deployment path. Assets first; HTML last. Preserve
   prior hashed assets for cached pages and rollback. Extensionless article and
   collection objects need `Content-Type: text/html; charset=utf-8`.
6. Publish the function; attach its LIVE ARN to the relevant viewer-request
   behaviors using a fresh ETag while preserving the rest of the configuration.
   Ensure the default root object is `index.html`. Missing origin objects should
   use `/404.html` with response code **404**, never a 200 SPA fallback.
7. Wait for deployment, invalidate stale HTML/errors, then run the same route and
   URL-export checks against the temporary HTTPS host. Confirm Content-Type,
   gzip/Brotli compression, initial HTML, noindex, canonical origin, and statuses.
8. Save the deployment/version/verification record. No merge or domain cutover.

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
