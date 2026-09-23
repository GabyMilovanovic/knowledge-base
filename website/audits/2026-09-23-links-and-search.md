# Support article links and search audit

Audited 923 articles on 2026-09-23. Changes are local on `fix/article-links-and-search`.

## Broken autolinks

Found 23 angle-bracket support links in 13 articles. Hostname removal during content generation turned valid Markdown autolinks into non-clickable relative paths. Convert these to explicit Markdown links before canonicalizing their destinations.

| Article | Affected links |
| --- | ---: |
| [10DLC Carrier Error Codes Explanations](https://support.telnyx.com/en/articles/10547022-10dlc-carrier-error-codes-explanations) | 2 |
| [Guide to 10DLC Message Flow Field](https://support.telnyx.com/en/articles/10562019-guide-to-10dlc-message-flow-field) | 1 |
| [10DLC Opt in Form](https://support.telnyx.com/en/articles/10684260-10dlc-opt-in-form) | 1 |
| [10DLC Error (806)](https://support.telnyx.com/en/articles/10744086-10dlc-error-806) | 2 |
| [Do I have to sign a contract?](https://support.telnyx.com/en/articles/1130644-do-i-have-to-sign-a-contract) | 3 |
| [Telnyx + Vapi Integration](https://support.telnyx.com/en/articles/12538402-telnyx-vapi-integration) | 2 |
| [Receiving SMS on your Telnyx number](https://support.telnyx.com/en/articles/4348981-receiving-sms-on-your-telnyx-number) | 1 |
| [International Numbers - Required Documents](https://support.telnyx.com/en/articles/5469551-international-numbers-required-documents) | 1 |
| [How to create a 10DLC brand](https://support.telnyx.com/en/articles/5896911-how-to-create-a-10dlc-brand) | 1 |
| [How to create a 10DLC campaign](https://support.telnyx.com/en/articles/6339152-how-to-create-a-10dlc-campaign) | 6 |
| [Group Messaging - Bulk Sending MMS](https://support.telnyx.com/en/articles/8255134-group-messaging-bulk-sending-mms) | 1 |
| [US / CA Toll Free Number Porting](https://support.telnyx.com/en/articles/8673249-us-ca-toll-free-number-porting) | 1 |
| [Messaging - 10DLC Campaign Checklist](https://support.telnyx.com/en/articles/9038141-messaging-10dlc-campaign-checklist) | 1 |

A full-corpus render comparison checks that every original support hyperlink survives cleaning and canonicalization, including query strings and fragments. The site verifier also rejects visible malformed relative autolinks and checks internal destinations.

## Search

Previously only titles and descriptions were searched. The new index includes unique words from rendered article bodies and headings, excluding site navigation and related-article widgets. Matches rank title first, then headings, descriptions, and body. Multiple search words may match different fields; punctuation/case/accent normalization and final-word completion are supported. Results remain limited to the best eight.

The actual forbidden-messaging article ranks first for `gambling`. All 923 articles have body terms in the index. The index is approximately 1.60 MiB uncompressed / 447 KiB gzip and loads only when search is used. No external search service or infrastructure configuration is required. This is keyword search, without typo correction or semantic synonyms.

## Validation

56 tests passed; TypeScript checks and a full static build passed. Strict verification checked 1,039 pages, 923 articles, 115 collections and 12,747 internal links with zero failures. The reported production page was independently confirmed to still contain the malformed link before deployment; the fix is local only.
