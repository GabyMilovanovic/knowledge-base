# Language-root redirects

`homepage-redirect.js` is a CloudFront Function for the **viewer-request** event
using JavaScript runtime 2.0. It returns an HTTP 301 from `/en` and `/en/` to `/`,
on the same host, preserving encoded/repeated query parameters. Other paths pass
through unchanged. Fragments are not sent to the server; normal browser redirect
handling retains them when the Location header has no fragment.

## Why the function is necessary

The build produces `en/index.html`. An S3 REST origin does not map the keys `en`
or `en/` to that file. CloudFront's default root object only applies to `/`.
A React redirect or S3 website redirect metadata cannot repair this REST-origin
403. The viewer-request redirect runs before the request reaches the origin.

## Local validation

```sh
bun test
bun run type-check
bun run build
bun run preview:edge
curl -I http://127.0.0.1:4173/en
curl -I 'http://127.0.0.1:4173/en/?utm_source=migration-check'
```

Both requests should return 301 with a relative `Location` pointing to `/`
(including the query for the second). Following the redirect must return 200.
This preview executes the same function source and serves exact file keys;
it intentionally does not use Vite's automatic SPA fallback.

## Temporary-domain rollout (not performed by this branch)

Target only `d27az1l5lty0u1.cloudfront.net`. Do not alter DNS, aliases, origins,
certificates, or the current public support domain.

1. Find the distribution ID by its exact CloudFront domain name. Export its
   current distribution configuration and ETag before making changes.
2. Inspect the ordered cache behaviors to identify which handle `/en` and `/en/`.
   Check for existing CloudFront/Lambda@Edge viewer-request associations. If one
   exists, integrate this logic into it; do not replace an existing handler blindly.
3. Create a dedicated function with this source and runtime `cloudfront-js-2.0`.
   Test it with GET/HEAD requests for both roots, query strings, and an article URL.
4. Publish the function and associate its LIVE ARN with the relevant behaviors'
   viewer-request event. Preserve all other distribution settings and use the
   current ETag when updating. Wait for distribution deployment to finish.
5. Invalidate `/en` and `/en/` to clear any previously cached errors, then verify
   the real temporary URLs return a single 301 to the same host's root and 200
   after following. Verify an article and a collection still return HTML with 200.
6. Deploy this branch's built content to the temporary site's existing origin
   through a branch-capable deployment path, without merging. Verify updated
   homepage/collection counts and nested navigation on the temporary host.

Rollback: restore the previous viewer-request association using a fresh ETag;
do not disable unrelated handlers. Keep the prior configuration with the rollout
record. Content rollback should redeploy the previous build, not delete the bucket.

**Status:** source and local validation only. Repository push-to-main deployment
does not automatically install CloudFront Functions. AWS access/distribution
configuration is required before claiming the live 403 is fixed.

References:
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/DefaultRootObject.html
- https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_redirect_based_on_country_section.html
