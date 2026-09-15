---
source_url: "https://support.telnyx.com/en/articles/16099890-understanding-telnyx-email-errors-and-message-size-limits"
title: "Understanding Telnyx Email errors and message size limits"
scraped: "2026-09-15"
modified_at: "2026-07-28T20:57:24Z"
collection_path: "19683795-telnyx-email"
content_hash: "7e906aa9bdaa51053e2ac429534fec3c04f4bae5a58bbb0925ac34386deac267"
---

# Understanding Telnyx Email errors and message size limits

Telnyx Email has two different kinds of errors: request errors returned immediately by the API and delivery errors produced after a message is accepted. Use this guide to tell them apart, read the right fields, and decide whether a retry is safe.

---

# **Start with the HTTP response**

Send requests return a standard `errors` array when the API cannot accept the message. Use `-i` while troubleshooting so you can see the HTTP status as well as the JSON body:

```
curl -i -X POST "https://api.telnyx.com/v2/email_messages" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "sender@mail.yourcompany.com",
    "to": ["recipient@example.com"],
    "subject": "Order update",
    "text_body": "Your order has shipped."
  }'
```

Each immediate error contains `code`, `title`, and `detail`, and may include a `source` pointer. Fix the field or account condition named in `detail` before retrying.

|  |  |
| --- | --- |
| **Common response** | **What to do** |
| `400` / `10015` | Correct the malformed, missing, or conflicting request field. |
| `401` or `403` | Check the API key, account state, permissions, trial-recipient restrictions, or sender-domain eligibility. |
| `422 recipient_suppressed` | Every recipient was suppressed, so no message was created. Inspect the top-level `suppressed` array. |
| `429` | Read the error code before retrying. A daily quota can be retried after reset, but `reputation_suspended` requires remediation rather than an automatic retry loop. |

---

# **Keep the size limits separate**

The Email API, its HTTP parser, and Edge idempotency enforce different limits. They do not all return the same status.

|  |  |  |
| --- | --- | --- |
| **Limit** | **What is measured** | **Result when exceeded** |
| 1 MB | Decoded `html_body` plus `text_body`. | `422`: body exceeds the size limit. |
| 25 MB | Decoded bodies plus decoded attachment bytes. Base64 characters are not the attachment measurement. | `422`: message exceeds the size limit. |
| 150 MB | The complete HTTP request handled by the Email API parser. | The request is rejected before normal send validation. |
| 8,000,000 bytes | The raw request body only when `Idempotency-Key` is present on the send endpoint. | Edge returns `413 Payload Too Large`; the Email API never receives it. |

An unkeyed request bypasses the 8,000,000-byte Edge cap, but it is still subject to the 1 MB body, 25 MB total-message, and 150 MB parser limits.

---

# **Read delivery errors after acceptance**

A `202 Accepted` response means Telnyx created the message; it does not guarantee final delivery. Retrieve the message event history with the message ID:

```
curl "https://api.telnyx.com/v2/email_messages/{message_id}/events" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Delivery failures use normalized 30xxx codes. Raw SMTP evidence, when available, is preserved separately.

|  |  |  |
| --- | --- | --- |
| **Code** | **Meaning** | **Action** |
| `30001` | Hard bounce | Do not retry the same address. Correct it or remove it. |
| `30002` | Deferred | Temporary SMTP failure. This is the retryable 30xxx outcome. |
| `30003` | Injection failure | Do not retry automatically. Record the evidence and investigate the injection failure. |
| `30004` | Suppressed recipient | Defined for normalized delivery records, but the public send-time path filters suppressions before recipient persistence. All-suppressed sends instead return synchronous `422 recipient_suppressed`. |
| `30005` | Queue expiry | Terminal `expired` outcome. Investigate repeated deferrals before attempting another send. |
| `30006` | Gateway rejection | The recipient was rejected before it entered the delivery queue. Do not assume it is billable or safe to retry. |
| `30099` | Internal error | Do not loop automatically. Preserve the message and recipient IDs and contact support if it persists. |

**Queue expiry is not the same as a generic failure.** The recipient status is terminal `expired`, while its public webhook is delivered as `email.bounced` with code `30005`.

---

# **Use error\_evidence as the decision record**

|  |  |
| --- | --- |
| **Field** | **Meaning** |
| `code` | Normalized Telnyx 30xxx outcome. |
| `message` | Available delivery detail. It may come from an MTA or operator path, so do not always label it as remote-server text. |
| `enhanced_code` | Enhanced SMTP status when available, such as `5.1.1`. |
| `smtp_status` | Raw SMTP numeric status, kept separate from the normalized code. |
| `source` | The classifying layer, such as `smtp`, `mta`, or `api`. |
| `retryable` | Whether the normalized delivery outcome is safe to treat as temporary. |

---

# **What to include in a support request**

Include the Telnyx message ID, recipient ID, UTC occurrence time, HTTP status, API error object, and delivery `error_evidence`. Never include your API key or the message body.

---

Related Articles

- [Telnyx Messaging Error Codes](https://support.telnyx.com/en/articles/6505121-telnyx-messaging-error-codes)
- [Getting started with Telnyx Email](https://support.telnyx.com/en/articles/15853622-getting-started-with-telnyx-email)
- [Why didn't my email arrive?](https://support.telnyx.com/en/articles/15853625-why-didn-t-my-email-arrive)
- [Managing email suppressions and unsubscribes](https://support.telnyx.com/en/articles/15853626-managing-email-suppressions-and-unsubscribes)
- [Setting up and troubleshooting Telnyx Email webhooks](https://support.telnyx.com/en/articles/16099889-setting-up-and-troubleshooting-telnyx-email-webhooks)
