type FallbackTopic = { path: string; pattern: RegExp };

export const FALLBACK_TOPICS: FallbackTopic[] = [
  { path: "messaging", pattern: /\bsms\b|\bmms\b|messag|10 ?dlc|toll[- ]?free verification|whatsapp|short ?code|campaign|alphanumeric|sender id|\btext(s|ing)?\b/i },
  { path: "voice-sip-trunking", pattern: /\bsip\b|trunk|voice|call|texml|webrtc|\bfax\b|dial|\bpbx\b|asterisk|freepbx|3cx|codec|\brtp\b|dtmf|\bivr\b|softphone|polycom|zoiper|audiocodes|acrobits|snom|grandstream|bria|yealink|sansay|\bsbc\b|\bn11\b|routing|termination|obihai|fanvil|cisco|linphone|zoho|vitalpbx/i },
  { path: "numbers-porting", pattern: /number|porting|\bport\b|port[- ](out|in)|fastport|e911|cnam|caller id|\bdid\b|\bdids\b|emergency|\blrn\b|coverage/i },
  { path: "iot-wireless", pattern: /\biot\b|\bsim\b|wireless|esim/i },
  { path: "networking-storage", pattern: /storage|network|\bvpn\b|cloud|bucket|\bip\b|\bips\b/i },
  { path: "account-billing", pattern: /account|billing|payment|invoice|portal|api key|\bteam\b|\bsso\b|2fa|refund|balance|pricing|rate sheet|verification/i },
  { path: "ai-automation", pattern: /\bai\b|assistant|inference|insight/i },
];

const FALLBACK_ROOTS: Record<string, string> = {
  messaging: "133103-telnyx-sms-guide", "voice-sip-trunking": "3968237-telnyx-sip-trunking-configurations", "numbers-porting": "3968222-telnyx-number-management-guide", "iot-wireless": "1895859-telnyx-global-iot-sims", "networking-storage": "5317581-networking-using-telnyx", "account-billing": "133094-general-telnyx-portal-account", "ai-automation": "19623087-ai-assistant", general: "133094-general-telnyx-portal-account",
};

export function fallbackRootFor(title: string, slug: string): string {
  const topic = FALLBACK_TOPICS.find(({ pattern }) => pattern.test(`${title} ${slug}`));
  return FALLBACK_ROOTS[topic?.path ?? "general"];
}
