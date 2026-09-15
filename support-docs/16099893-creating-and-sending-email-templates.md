---
source_url: "https://support.telnyx.com/en/articles/16099893-creating-and-sending-email-templates"
title: "Creating and sending email templates"
scraped: "2026-09-15"
modified_at: "2026-07-28T20:57:32Z"
collection_path: "19683795-telnyx-email"
content_hash: "6021818ddfba94d926eaef7064dc638f90b5e0c806c027f4b7ac5c5f3971c9d5"
---

# Creating and sending email templates

Email templates let you store reusable Liquid subject and body content, then provide customer-specific values at send time. This guide shows you how to create, preview, update, and send a template without the most common rendering mistakes.

---

# **Step 1: Create a template**

Create the template with a unique name and Liquid variables in double braces:

```
curl -X POST "https://api.telnyx.com/v2/email_templates" \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -H "Content-Type: application/json" \  
  -d '{  
    "name": "Welcome_Email",  
    "subject": "Welcome, \u007b\u007b first_name \u007d\u007d!",  
    "html_body": "<h1>Hello \u007b\u007b first_name \u007d\u007d</h1><p>Your account is ready.</p>",  
    "text_body": "Hello \u007b\u007b first_name \u007d\u007d. Your account is ready."  
  }'
```

This example uses JSON Unicode escapes for the double curly braces. When the JSON is parsed, `\u007b\u007b first_name \u007d\u007d` becomes the Liquid expression with two opening and two closing curly braces.

A successful request returns `201 Created`. Save the template `id`. When you omit the `variables` array, Telnyx auto-extracts a limited set of Liquid variables from the subject and bodies. Unfiltered output such as `first_name` is recorded. Filtered output such as `first_name | upcase` is skipped; dot notation such as `user.name` records only the root `user`; and a loop variable is recorded only if it is separately referenced in output. Treat the extracted list as advisory and render with representative data.

Template names may contain letters, numbers, spaces, hyphens, and underscores. Invalid Liquid syntax is rejected with `422` at create time.

---

# **Step 2: Render before sending**

Render the template with representative variables before using it in production:

```
curl -X POST "https://api.telnyx.com/v2/email_templates/{template_id}/render" \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -H "Content-Type: application/json" \  
  -d '{  
    "template_variables": {  
      "first_name": "Ada"  
    }  
  }'
```

The response returns the rendered `subject`, `html_body`, and `text_body`. Missing variables can render as empty text, so inspect every required field instead of assuming a successful render means every business value was supplied.

**The render response is a pre-send preview, not byte-for-byte final MIME.** The send pipeline can still inline CSS, rewrite tracked links, and add an open-tracking pixel according to the message's effective settings.

---

# **Step 3: Send with the template**

Pass the saved `template_id` and a JSON object of `template_variables`:

```
curl -X POST "https://api.telnyx.com/v2/email_messages" \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -H "Content-Type: application/json" \  
  -d '{  
    "from": "sender@mail.yourcompany.com",  
    "to": ["recipient@example.com"],  
    "template_id": "{template_id}",  
    "template_variables": {  
      "first_name": "Ada"  
    }  
  }'
```

Do not also send `subject`, `html_body`, or `text_body` when `template_id` is present. The template owns those fields.

The rendered subject must be non-empty. A template with no subject, or one whose subject renders empty, is rejected before the message is queued.

---

# **Update only the fields that changed**

`PUT` behaves as a partial update for `name`, `subject`, `html_body`, and `text_body`: omitted fields are preserved rather than cleared. The `variables` field is the exception. If you omit `variables`, Telnyx regenerates it from the resulting template content. Include `variables` explicitly in the update to preserve a custom list:

```
curl -X PUT "https://api.telnyx.com/v2/email_templates/{template_id}" \  
  -H "Authorization: Bearer YOUR_API_KEY" \  
  -H "Content-Type: application/json" \  
  -d '{  
    "subject": "Your Telnyx account is ready, \u007b\u007b first_name \u007d\u007d"  
  }'
```

Render again after every template change. Updating the stored template does not prove that your send-time variable object still matches it.

---

# **Troubleshoot template errors**

|  |  |
| --- | --- |
| **Symptom** | **What to check** |
| `422 Validation Failed` on create or update | Fix invalid Liquid syntax or a template-name validation error. |
| `422 Template Render Failed` | Render the template directly, then inspect the Liquid expression and required values. |
| `422 Validation Failed` on send — `template_variables` must be a JSON object | Send `template_variables` as a top-level JSON object. Standalone render may coerce a non-object to `{}`, so a successful preview does not prove that send will accept its shape. |
| A variable is blank | Check exact spelling, capitalization, nesting, and whether the value was actually present in the object. |
| `400` on send with a template ID | Confirm the template exists in the same Telnyx account. Template lookup failures during send return `400`, not `404`. |
| Preview and final HTML differ | Check CSS inlining and open/click tracking. Those send-time transformations occur after template rendering. |

---

# **Recommended workflow**

1. Create or update the template.
2. Render it with complete representative data.
3. Verify the rendered subject and both body formats.
4. Send with only `template_id` and `template_variables` for template-owned content.

---

Related Articles

- [Getting started with Telnyx Email](https://support.telnyx.com/en/articles/15853622-getting-started-with-telnyx-email)
- [Managing email suppressions and unsubscribes](https://support.telnyx.com/en/articles/15853626-managing-email-suppressions-and-unsubscribes)
- [Custom Voicemail Greetings](https://support.telnyx.com/en/articles/15864441-custom-voicemail-greetings)
- [Setting up and troubleshooting Telnyx Email webhooks](https://support.telnyx.com/en/articles/16099889-setting-up-and-troubleshooting-telnyx-email-webhooks)
- [Scheduling and cancelling an email send](https://support.telnyx.com/en/articles/16099894-scheduling-and-cancelling-an-email-send)
