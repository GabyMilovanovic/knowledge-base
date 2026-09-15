---
source_url: "https://support.telnyx.com/en/articles/16099894-scheduling-and-cancelling-an-email-send"
title: "Scheduling and cancelling an email send"
scraped: "2026-09-15"
modified_at: "2026-07-28T20:57:51Z"
collection_path: "19683795-telnyx-email"
content_hash: "0c2763a14ebb3037341d4dcadc72b3d12c0f9f9ad094fcf709d45e4b321fae2c"
---

# Scheduling and cancelling an email send

Add `scheduled_at` when Telnyx should accept an email now and queue it for a future time. This guide shows you how to schedule, confirm, and cancel a send—and how to avoid accidentally sending it immediately.

---

# **Step 1: Schedule with a future timestamp**

Use the canonical `scheduled_at` field with a valid ISO 8601 timestamp in the future:

```
curl -X POST "https://api.telnyx.com/v2/email_messages" \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -H "Content-Type: application/json" \  
  -d '{  
    "from": "sender@mail.yourcompany.com",  
    "to": ["recipient@example.com"],  
    "subject": "Scheduled maintenance reminder",  
    "text_body": "Maintenance starts in one hour.",  
    "scheduled_at": "2030-01-15T15:00:00Z"  
  }'
```

A successful request returns `202 Accepted` with `status: "scheduled"` and the stored `scheduled_at` timestamp.

**Use `scheduled_at` for new integrations.** `send_at` remains a deprecated request alias for backward compatibility, but responses use `scheduled_at`.

---

# **Avoid accidental immediate sends**

The timestamp must parse as ISO 8601 and compare later than the current time. If it is invalid or already in the past, the Email API treats it as an immediate send: the response is queued instead of scheduled.

Always check both response fields before assuming the schedule was saved:

- `status` must be `scheduled`.
- `scheduled_at` must be present and match the intended instant.

---

# **Step 2: Confirm the schedule**

Retrieve the message by ID:

```
curl "https://api.telnyx.com/v2/email_messages/{message_id}" \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

Before the send fires, the message should remain `scheduled`. The `scheduled_at` field remains on the message after processing or cancellation, so use `status` to determine what happened most recently.

---

# **Step 3: Cancel before it is queued**

Cancel the schedule with the message ID:

```
curl -X DELETE "https://api.telnyx.com/v2/email_messages/{message_id}/schedule" \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

A successful cancellation returns `200` with `status: "cancelled"`. Cancelling a message that is no longer scheduled returns `400`; once delivery processing has begun, the schedule endpoint cannot recall the message.

There is no schedule-edit operation. To change the time, cancel the still-scheduled message and create a new scheduled send.

---

# **Check fire-time failures**

Scheduled sends are accepted before they enter the delivery queue and are exempt from the submission-time recipient quota. Telnyx rechecks account eligibility and enforces the daily recipient limit when the schedule fires. The two fire-time rejection paths have different status outcomes.

If a scheduled message did not queue at the expected time, retrieve its events:

```
curl "https://api.telnyx.com/v2/email_messages/{message_id}/events" \  
  -H "Authorization: Bearer YOUR_API_KEY"
```

A `daily_limit_exceeded` event means the recipient quota was unavailable at fire time. The parent message becomes `failed`, while its recipient rows may remain `queued`. If account eligibility fails instead, recipient rows become `failed` and the parent message rolls up to `completed`. Neither path reaches the mail queue. Inspect the parent `status`, `recipient_statuses`, and event reason together; `completed` means all recipients are terminal, not that delivery succeeded.

---

# **Troubleshooting summary**

|  |  |
| --- | --- |
| **Symptom** | **Cause and next step** |
| The response says `queued` | The timestamp was missing, invalid, or not in the future. The send was treated as immediate. |
| The response omits `scheduled_at` | No future schedule was stored. Do not assume it will wait. |
| Cancel returns `400` | The message is not currently scheduled. Retrieve the message and inspect its status. |
| The parent message becomes `failed` at fire time | This is the daily-limit rejection path. Inspect events for `daily_limit_exceeded` and check `recipient_statuses`; recipient rows may remain `queued` even though the parent is `failed`. The message was not injected for delivery. |
| The parent is `completed`, but no delivery occurred | Account-eligibility rejection marks recipient rows `failed`, then the parent rolls up to `completed`. Inspect `recipient_statuses` and recipient event reasons. `Completed` means all recipients are terminal, not delivered. |

---

Related Articles

- [Getting started with Telnyx Email](https://support.telnyx.com/en/articles/15853622-getting-started-with-telnyx-email)
- [Why didn't my email arrive?](https://support.telnyx.com/en/articles/15853625-why-didn-t-my-email-arrive)
- [Setting up and troubleshooting Telnyx Email webhooks](https://support.telnyx.com/en/articles/16099889-setting-up-and-troubleshooting-telnyx-email-webhooks)
- [Preventing duplicate emails with idempotency](https://support.telnyx.com/en/articles/16099891-preventing-duplicate-emails-with-idempotency)
- [Creating and sending email templates](https://support.telnyx.com/en/articles/16099893-creating-and-sending-email-templates)
