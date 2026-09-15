import path from "node:path";
import { renderSite } from "./render-site";
// Each S3 object contains the full rendered page and its own canonical metadata.
if (import.meta.main) renderSite(path.resolve(import.meta.dir, "../dist"));
