import { expect, test } from "bun:test";
import { FALLBACK_TOPICS, fallbackRootFor } from "./fallback";

test("maps every unchanged keyword bucket and General to canonical roots", () => {
  const samples = ["SMS", "SIP trunk", "number porting", "IoT SIM", "VPN network", "account", "AI assistant"];
  expect(FALLBACK_TOPICS.map(({ path }) => path)).toEqual(["messaging", "voice-sip-trunking", "numbers-porting", "iot-wireless", "networking-storage", "account-billing", "ai-automation"]);
  expect(samples.map((sample) => fallbackRootFor(sample, "neutral"))).toEqual(["133103-telnyx-sms-guide", "3968237-telnyx-sip-trunking-configurations", "3968222-telnyx-number-management-guide", "1895859-telnyx-global-iot-sims", "5317581-networking-using-telnyx", "133094-general-telnyx-portal-account", "19623087-ai-assistant"]);
  expect(fallbackRootFor("ordinary guide", "neutral")).toBe("133094-general-telnyx-portal-account");
  expect(fallbackRootFor("SMS account", "neutral")).toBe("133103-telnyx-sms-guide");
  expect(fallbackRootFor("voice invoice", "neutral")).toBe("3968237-telnyx-sip-trunking-configurations");
});
