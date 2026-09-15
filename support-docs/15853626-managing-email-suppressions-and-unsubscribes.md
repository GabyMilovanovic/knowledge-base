---
source_url: "https://support.telnyx.com/en/articles/15853626-managing-email-suppressions-and-unsubscribes"
title: "Managing email suppressions and unsubscribes"
description: "Understand suppression reasons, profile- and group-scoped unsubscribe, paginated listing and deletion, and auto-detected CSV import/export limits."
scraped: "2026-09-15"
modified_at: "2026-07-28T20:57:18Z"
collection_path: "19683795-telnyx-email"
content_hash: "7cfdc1ab076d285671d89d364d9ad0158915afef27d37085fbbe1811c9a81bd1"
---

# Managing email suppressions and unsubscribes

Suppressions protect your sender reputation by preventing delivery attempts to addresses that should not receive a message. This guide explains how suppressions are created, how profile-scoped one-click unsubscribe works, and how to list, remove, import, and export suppression records.

**Email is currently managed through the Telnyx API**, so this guide uses `curl`.

---

# **Why suppressions matter**

Mailbox providers such as Gmail and Yahoo watch how recipients react to your mail. Repeatedly sending to nonexistent addresses or to people who mark messages as spam damages your sender reputation and can reduce inbox placement for other recipients.

Suppressions break that cycle by making the send path skip matching recipients. If some recipients are suppressed, the accepted response identifies the skipped addresses; if all recipients are suppressed, the send returns `422` with `recipient_suppressed`.

---

# **How suppressions are created**

Each suppression records a `reason`:

|  |  |
| --- | --- |
| **Reason** | **How it is created** |
| `hard_bounce` | Created automatically for eligible permanent delivery failures, when a queued message expires after retries, or when repeated soft bounces reach the escalation threshold. The reason alone does not prove one permanent SMTP rejection. |
| `spam_complaint` | Created automatically when Telnyx receives a supported complaint signal. |
| `unsubscribe` | Created when a recipient unsubscribes, including through one-click unsubscribe. |
| `invalid` | Created automatically when the address is classified as invalid. |
| `manual_block` | Created through the public suppression-create endpoint or by an import. |

The public create endpoint always stores `manual_block` with a manual source. A caller-supplied `reason` does not create an automatic reason such as `hard_bounce` or `spam_complaint`.

---

# **One-click unsubscribe is profile-scoped**

Telnyx adds standards-based one-click unsubscribe headers (RFC 8058) when `unsubscribe_tracking` is enabled. It is enabled by default. The setting is stored on the sending profile associated with the domain; it is not a per-message switch. A profile-level change affects sends that use that profile.

Unsubscribe groups let recipients opt out of one category without opting out of every message. When a one-click unsubscribe comes from a message with a `group_id`, Telnyx retains that `group_id` on the suppression. Future sends in that group are blocked, while other groups are not. If the original message has no `group_id`, the unsubscribe is global.

Keep one-click unsubscribe enabled for eligible mail. Gmail and Yahoo require it for many bulk senders, and a clear unsubscribe path reduces spam complaints.

---

# **View and page through suppressions**

List the first page of suppression records:

```
curl "https://api.telnyx.com/v2/email_blocks?page[size]=25" \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

The list endpoint does not support `filter[to]`. Supported filters include reason, domain ID, and creation date. To inspect more results with cursor pagination, copy `meta.next_cursor` from the response into `page[after]`:

```
curl "https://api.telnyx.com/v2/email_blocks?page[size]=25&page[after]={next_cursor}" \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

Repeat until `meta.has_next` is false. Each record includes fields such as `to`, `reason`, `scope`, `source`, `status`, and `expires_at`. Status values include `active`, `expired`, and `removed`.

**Important:** `expires_at` is stored but is not currently enforced by an automatic expiry process. Do not rely on it as a timer; an active suppression remains effective until it is explicitly removed.

---

# **Add, remove, and override suppressions**

Create a manual block:

```
curl -X POST https://api.telnyx.com/v2/email_blocks \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -H "Content-Type: application/json" \  
  -d '{"to":"recipient@example.com"}'
```

The service stores this as `manual_block` regardless of any supplied `reason`.

Remove any suppression by its ID:

```
curl -X DELETE https://api.telnyx.com/v2/email_blocks/{block_id} \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

The delete endpoint can remove suppressions of any reason, including automatic reasons. This is different from `ignore_suppression: true` on a send: that send-time option can override only `unsubscribe` and `manual_block`. It cannot override `hard_bounce`, `invalid`, or `spam_complaint`.

Remove a record only when you have a lawful and verified reason to resume sending. A later qualifying delivery or complaint event can create a new suppression.

---

# **Import suppressions from another provider**

Telnyx auto-detects supported CSV formats from their header row. Dedicated detectors are available for:

- SendGrid
- Mailgun
- Amazon SES
- Generic CSV with an email address and a Telnyx suppression reason

Postmark is not a dedicated detected format. Convert a Postmark export to the generic format before importing it. Upload only the file; do not send a `format` field:

```
curl -X POST https://api.telnyx.com/v2/email_blocks/import \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -F "file=@suppressions.csv"
```

The import is asynchronous. Use the returned import ID to check progress:

```
curl https://api.telnyx.com/v2/email_blocks/import/{import_id} \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

Imports support files up to 25 MB or 250,000 rows.

---

# **Export suppressions, but do not treat the CSV as fully restorable**

Export the account's suppression records for reporting or audit:

```
curl https://api.telnyx.com/v2/email_blocks/export \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Warning:** export and import are not a lossless round trip. The importer restores the recipient, mapped reason, and expiry data, but it does not recreate sender (`from`), `domain_id`, or `group_id` scoping. Re-importing a previously scoped suppression can therefore create an account-wide suppression. Keep the original scope configuration separately and review imported records before relying on them as a restore.

---

# **Distinguish suppression failures from domain failures**

A suppression rejection returns `422` with `recipient_suppressed` when every recipient is blocked. A sending-domain policy failure is different: a degraded domain returns `403 Forbidden` with public error code `10007`. Do not treat an internal domain-state name as a public error code.

---

# **Key takeaways**

- `hard_bounce` can represent eligible permanent failures, queue expiry, or soft-bounce escalation.
- One-click unsubscribe is profile-scoped; a message's `group_id` is retained for group-scoped opt-outs.
- The suppression list does not support `filter[to]`; use pagination and supported filters.
- Any suppression can be deleted, while `ignore_suppression` overrides only unsubscribe and manual blocks.
- The public create endpoint always creates a manual block.
- Import format is auto-detected for SendGrid, Mailgun, Amazon SES, and generic CSV; there is no dedicated Postmark format.
- Export-to-import is lossy for sender, domain, and group scope, and `expires_at` does not currently auto-expire a record.

---

Related Articles

- [Getting started with Telnyx Email](https://support.telnyx.com/en/articles/15853622-getting-started-with-telnyx-email)
- [Why didn't my email arrive?](https://support.telnyx.com/en/articles/15853625-why-didn-t-my-email-arrive)
- [Setting up and troubleshooting Telnyx Email webhooks](https://support.telnyx.com/en/articles/16099889-setting-up-and-troubleshooting-telnyx-email-webhooks)
- [Creating and sending email templates](https://support.telnyx.com/en/articles/16099893-creating-and-sending-email-templates)
- [Scheduling and cancelling an email send](https://support.telnyx.com/en/articles/16099894-scheduling-and-cancelling-an-email-send)
