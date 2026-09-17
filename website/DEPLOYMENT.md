# Temporary support-site deployment and recovery

This change is prepared for review. Do not merge, deploy, or apply before owner approval.
Only `https://d27az1l5lty0u1.cloudfront.net` / `support-v2.telnyx.com` is in scope.
There is no DNS or public `support.telnyx.com` cutover.

## Ownership and one-time setup

The knowledge-base workflow uploads content and synchronizes redirect **data**.
Infra manages the CloudFront function, KeyValueStore, association, private origin
permissions, and deployment-role policy. Routine new articles do not need an
infra PR. A missing mapping passes through to an exact S3 object; historical URLs
still use mappings, updated automatically from repository metadata.

Infra changes in `infra-svc-aws-resources` are deliberately staged:

1. Review the real plan. Apply the supporting resources with
   `support_v2_routing_enabled=false` (default). This creates the unassociated
   function/store and additive role policy, grants this origin identity ListBucket
   on this content bucket, and configures genuine 404s with `/404.html` and a
   one-second error-cache TTL. Existing read grants must be preserved. Compression
   is coordinated separately by infra; preserve their current approved settings.
2. Set knowledge-base repository variable `CLOUDFRONT_KVS_ARN` to infra's
   `support_v2_kvs_arn` output. Keep secret `CLOUDFRONT_DISTRIBUTION_ID` equal to
   `E3TMOKZN8HQ7AZ` and the existing `AWS_ASSUME_ROLE` secret unchanged.
3. After approval, merge this workflow to main. Its first automatic normal run
   will intentionally stop at preflight, before uploads, if routing is inactive.
   Manually run **Deploy website** on **main**, with `bootstrap=true` and no
   rollback ID. It uploads exact-key pages, populates the store, invalidates and
   waits, verifies every rendered page against the local build plus genuine
   missing-object GET/HEAD responses, and only then writes `_meta:ready`.
4. Infra reviews a separate activation plan with `support_v2_routing_enabled=true`.
   Its read-only guard checks the store and readiness marker before association.
   Persist this flag in infra's approved configuration so later applies do not
   accidentally disable it. The runner needs Python 3, AWS CLI v2, and read access
   to this KVS. Never enable it in the initial apply against an empty store.
5. After CloudFront reports the distribution deployed, run **Deploy website** on
   main with defaults. It verifies canonical pages, all ID mappings and old-title
   aliases, custom paths, homepage redirects, repeated/encoded query parameters,
   and genuine missing paths. Review the release report before considering the
   temporary rollout complete. Production-domain launch remains a separate task.

## Deployment-role permissions

Continue assuming `INFRA-462-team-telnyx-knowledge-base-publish-s3-bucket` using
existing GitHub OIDC. The trust remains restricted to this repository's main.
Infra adds a separate inline policy to that existing role (its role and original
policy are managed in `infra-svc-aws-generic-iam-resources`):

- On the dedicated KVS ARN only: `cloudfront-keyvaluestore:DescribeKeyValueStore`,
  `ListKeys`, `GetKey`, `UpdateKeys`.
- On distribution `E3TMOKZN8HQ7AZ` only: `cloudfront:GetDistribution` and
  `cloudfront:GetInvalidation`.

Existing S3 upload/list/delete and `cloudfront:CreateInvalidation` permissions
remain as they are. The workflow does not grant itself permissions or get
`UpdateDistribution`, IAM administration, DNS changes, or another bucket's access.
The AWS CLI uses regional STS credentials for KVS signing.

## Normal releases

The main workflow serializes releases without cancelling an in-flight deployment:

1. Build and check the entire site, tests, metadata, links, and route targets.
2. Validate exact AWS account, distribution, origin, store ARN and readiness;
   snapshot the previous routes. Reject disappearance of a previously published
   identity: retain that ID with a direct redirect in repository metadata.
3. Upload immutable assets first, then mutable content and exact extensionless
   HTML keys with `text/html; charset=utf-8`. Mutable objects are copied regardless
   of timestamp/size so rollback can restore older content correctly.
4. Update only changed routes in batches of at most 50 using conditional ETags.
   Do not clear/import over the live store. A detected concurrent writer stops
   publication without overwriting its data.
5. Invalidate `/*`, wait for completion (up to 15 minutes), then verify live
   responses against the uploaded release. Preview HTML must remain noindex.
6. Retain generated content, routes, before-state and HTTP evidence as the Actions
   artifact `support-site-release-<run ID>` for up to 90 days (subject to repository
   retention limits). Artifacts contain no credentials and no archived code is run.

A new page works without a pre-existing ID entry when the store is available.
A KVS outage still returns 503 for looked-up routes: this preserves established
redirect behavior rather than treating an outage as a genuinely absent mapping.
This is not a fully lookup-free architecture. Changes to the routing algorithm
itself require infra review; routine article/collection data changes do not.

## Failure and rollback

Route-update/verification failures attempt to restore the prior route snapshot and
invalidate again, unless a concurrent writer is detected. This is **not** an atomic
content rollback: partial uploads or changed HTML may already be visible. See the
failure report and rerun recovery; a failed recovery or invalidation needs operator
attention. GitHub reports a failed run rather than silently declaring success.

To restore a prior release after approval, dispatch the current main workflow with
`rollback_run_id` set to a **successful main deployment from this workflow** whose
artifact has `release-verified` evidence. Leave bootstrap false. Current approved
scripts restore only generated content/routes from that artifact, then invalidate
and verify. Before the first verified release, recovery needs the saved pre-rollout
content/configuration and infra's function-disable procedure; old pre-automation
workflow artifacts are not accepted automatically.

Uploads deliberately retain superseded objects and hashed assets. This keeps old
redirect destinations available during propagation and enables rollback. A rollback
restores overwritten objects and routes but does not unpublish new objects added
later: an unmapped exact URL can still serve them. Removal of sensitive/withdrawn
content and eventual storage cleanup require a separately reviewed deletion and
invalidation; do not add blanket `sync --delete` to this workflow.

## Local validation

Run `python3 -m unittest discover -s website/scripts/deployment -p 'test_*.py'`
without AWS credentials. Then run the website's build, Bun tests, type check and
`bun run verify:strict`. See [edge behavior](edge/README.md) for the local preview.
The infra PR's authenticated plan and live temporary-host checks remain necessary;
local validation cannot prove deployed AWS permissions or global propagation.
