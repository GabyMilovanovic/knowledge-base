---
title: "Identify Your Connection in the First SIP INVITE (X-Telnyx-Username)"
summary: "For credential-based SIP connections, we recommend including your connection's username in the first INVITE that your PBX or SBC sends to Telnyx."
sources:
- url: "https://support.telnyx.com/en/articles/2026092301-identify-your-connection-in-the-first-sip-invite"
updated_at: 2026-09-23T21:43:28Z
tags: [support-docs]
source_path: "support-docs/en--articles--2026092301-identify-your-connection-in-the-first-sip-invite.md"
generated_by: incremental-support-docs-wiki
---
<!-- generated_from=support-docs/en--articles--2026092301-identify-your-connection-in-the-first-sip-invite.md -->

# Identify Your Connection in the First SIP INVITE (X-Telnyx-Username)

For credential-based SIP connections, we recommend including your connection's username in the **first** INVITE that your PBX or SBC sends to Telnyx. Doing so lets Telnyx identify your connection during initial routing and use its [AnchorSite®](https://support.telnyx.com/en/articles/5271423-guide-to-sip-anchorsite-settings) setting when selecting where to anchor the call's media.

## Why the first INVITE?

Credential-based connections use SIP digest authentication. A PBX or SBC may initially send an INVITE without digest authentication, receive an authentication challenge, and then retry with the required authentication information. Some clients can reuse cached authentication information on the first INVITE.

Including your connection's username in the Contact header or X-Telnyx-Username header lets Telnyx identify the connection when the first INVITE arrives and use its AnchorSite® setting when selecting the media anchor. Without that early identification, Telnyx may be unable to apply the intended AnchorSite® setting during initial routing.

Providing the username does not replace digest authentication or guarantee a particular number of SIP signaling hops. Normal authentication requirements still apply, and AnchorSite® failover may select another site if the preferred site is unavailable.

## How to include the username

Use either of these methods in the first INVITE. Both carry the username of your credential-based SIP connection; you do not need to use both.

**Option 1: `X-Telnyx-Username` header**

```text
X-Telnyx-Username: YOUR_SIP_USERNAME
```

**Option 2: `Contact` header**

Put the username in the user part of the Contact URI:

```text
Contact: <sip:YOUR_SIP_USERNAME@192.0.2.10:5060>
```

Example first INVITE using the custom header (abbreviated):

```text
INVITE sip:+1XXXXXXXXXX@sip.telnyx.com SIP/2.0
Via: SIP/2.0/TLS 192.0.2.10:5061;branch=z9hG4bK...
From: <sip:+1XXXXXXXXXX@192.0.2.10:5061>;tag=...
To: <sip:+1XXXXXXXXXX@sip.telnyx.com>
Contact: <sip:sbc@192.0.2.10:5061;transport=tls>
X-Telnyx-Username: YOUR_SIP_USERNAME
```

Replace `YOUR_SIP_USERNAME` with the exact username of your credential-based connection. The IP address `192.0.2.10` is reserved for documentation; replace it with the appropriate address for your SBC. The phone numbers and abbreviated fields are placeholders, and the example is not a complete SIP message.

Most PBXs and SBCs can add a custom header or set the Contact user part on outbound INVITEs. Check your platform's documentation for how to do this on the initial INVITE.

### Find your connection username

1. Open [SIP Connections in the Mission Control Portal](https://portal.telnyx.com/#/voice/connections).
2. Select your credential-based connection.
3. Find its authentication settings and copy the SIP **Username**. Use the connection's SIP username, not your Portal login or connection ID.

## IP-based connections on shared IPs

If your connection uses IP authentication and the IP address is shared with other customers, configure a unique token or tech prefix so Telnyx can distinguish each connection's traffic:

* **X-Telnyx-Token:** a custom header carrying a token you configure on the connection. See [IP Authentication with X-Telnyx-Token](https://support.telnyx.com/en/articles/4860170-ip-authentication-with-x-telnyx-token). For FreePBX, see [Configure Token Authentication Header (X-Telnyx-Token) in FreePBX](https://support.telnyx.com/en/articles/12580952-configure-token-authentication-header-x-telnyx-token-in-freepbx).
* **Tech prefix:** see [IP Authentication with Tech Prefix](https://support.telnyx.com/en/articles/2602782-ip-authentication-with-tech-prefix).

For token authentication, the INVITE must contain the token configured on that connection and come from an IP address associated with it. For tech-prefix identification, prepend the configured prefix to the dialed number.

## Best practices

* Send the username in the first INVITE of every call for credential-based connections.
* If you share SBC infrastructure with other customers, make sure each tenant sends its own identifier appropriate to its connection type: a username, a token, or a tech prefix.
* Avoid ambiguous IP-only identification on shared infrastructure. When multiple IP-based connections share an address, configure the appropriate unique token or tech prefix on each connection and send it on every outbound call.

## Summary

Include your credential-based connection's username in the first INVITE so Telnyx can identify the connection early and use its AnchorSite® setting when selecting the media anchor. Normal authentication and failover behavior still apply.
