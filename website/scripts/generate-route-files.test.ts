import {expect,test} from "bun:test";
import {descriptionFor} from "./render-site";
test("SEO descriptions prefer metadata and fall back to meaningful body text",()=>{
 expect(descriptionFor("Provided description","ignored body")).toBe("Provided description");
 expect(descriptionFor(null,"## Contents\n\nA meaningful explanation of how to configure a Telnyx SIP trunk and troubleshoot connection failures.")).toBe("A meaningful explanation of how to configure a Telnyx SIP trunk and troubleshoot connection failures.");
 expect(descriptionFor("a ".repeat(100)).length).toBeLessThanOrEqual(160);
 expect(descriptionFor(null, "# Only a title")).toContain("Telnyx support guides");
});
