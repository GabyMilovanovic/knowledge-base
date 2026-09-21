# Production support deployment and recovery

Target: `https://support.telnyx.com`, served by distribution `E3TMOKZN8HQ7AZ`
(`d27az1l5lty0u1.cloudfront.net`), bucket `support.telnyx.com`, account
`144076755730`. Production builds set SITE_ORIGIN to the public host and
SITE_INDEXABLE=true; explicit article exclusions and 404 noindex remain intact.

## Ownership and configuration

Infra PR #251 creates and bootstraps the dedicated routing store/function and
adds scoped permissions to the existing publishing role. Set repository variable
CLOUDFRONT_KVS_ARN to its support_v2_kvs_arn output; retain the existing
AWS_ASSUME_ROLE and CLOUDFRONT_DISTRIBUTION_ID secrets. The public hostname must
be attached to this distribution. The workflow verifies those targets before uploads.

GitHub Actions assumes the existing role using main-only OIDC. Its scoped policy
allows KVS DescribeKeyValueStore/ListKeys/GetKey/UpdateKeys and distribution
GetDistribution/GetInvalidation. Existing S3 publishing and CreateInvalidation
permissions are retained. The workflow cannot change IAM, DNS or CloudFront
configuration. Infra owns infrastructure and the routing algorithm; KB owns route data.

A new exact-key page works without a mapping. Historical URLs still require the
registry, now synchronized automatically on deployment. Missing lookup entries
reach the origin; KVS service failures remain 503. No manual infra update is needed
for ordinary article publishing, renaming or retained retired-ID redirects.

## Normal releases

The workflow serializes releases without cancelling an in-flight run:

1. Build, test, type-check and audit the site and archived download hashes.
2. Check the exact AWS account, distribution, public alias, S3 origin, store and
   bootstrap readiness; snapshot the prior routes. Reject disappeared IDs unless
   explicitly rolling back. Normal retirements must retain an ID-to-target redirect.
3. Upload hashed assets/images/downloads first with immutable caching, then mutable
   content and extensionless HTML keys with the correct HTML Content-Type. Mutable
   objects are copied regardless of timestamps or size so rollback restores bytes.
4. Update changed routes with conditional ETags in batches of at most 50. Never
   clear/import over the live store. Concurrent changes stop publication.
5. Invalidate `/*` and wait up to 15 minutes, then verify all canonical HTML against
   the build, ID/old-title/custom redirects, roots, query strings, GET/HEAD missing
   paths, and every hosted download's SHA-256 on the production hostname.
6. Retain generated content/routes, prior state and HTTP evidence as Actions artifact
   `support-site-release-<run ID>` for up to 90 days, subject to repository limits.

HTML is compared to the exact approved build: ordinary pages stay indexable and
explicitly excluded articles retain their exclusions. Downloads are fetched from
production and compared byte-for-byte by hash. Missing objects must be real 404s.

## Failure and recovery

A route-update/verification failure attempts to restore the route snapshot and
invalidate again unless another writer is detected. This is not atomic content
rollback: uploads may already have changed pages. A failure report records whether
recovery succeeded. Upload failures, failed recovery or invalidation need operator
attention; the run fails rather than declaring success.

To restore after approval, dispatch the current main workflow with rollback_run_id
set to a successful main deployment from this workflow whose retained artifact has
`release-verified` evidence. Current approved scripts restore only generated data,
never archived executable code, then invalidate and verify. Runs before this
artifact/verification scheme are not eligible; before the first verified release,
retain the preceding Git revision/content for a separately reviewed recovery.

Old objects/assets/downloads are deliberately retained for propagation and rollback.
Rollback restores overwritten files/routes but does not remove new files introduced
later; an unmapped exact URL can still serve them. Withdrawal of content and eventual
cleanup require reviewed deletion and invalidation. Do not add blanket sync --delete.

## Local checks

Run `python3 -m unittest discover -s website/scripts/deployment -p 'test_*.py'`
without AWS credentials, then the website build, Bun tests, type check and
verify:strict with production environment settings. Default local builds remain
preview/noindex. See edge/README.md for routing details. Live deployment verification
is necessary; local checks cannot establish deployed permissions or global cache state.
