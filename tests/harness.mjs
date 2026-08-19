// Test harness. Not part of the build target — it extracts the <script> block
// from index.html and evaluates it in node so the acceptance tests of §14 can
// be run headlessly.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error("no <script> block found in index.html");
const ctx = { console, module: { exports: {} } };
ctx.globalThis = ctx;
vm.createContext(ctx);
vm.runInContext(m[1], ctx);
export const WARD = ctx.module.exports;
