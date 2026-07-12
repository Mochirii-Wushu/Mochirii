import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

function expectIncludes(label, source, snippet) {
  if (!source.includes(snippet)) failures.push(`${label}: missing ${snippet}`);
}

function expectExcludes(label, source, snippet) {
  if (source.includes(snippet)) failures.push(`${label}: must not include ${snippet}`);
}

const hook = read("apps/web/components/site-header/use-header-auth-state.ts");
const runtime = read("apps/web/components/site-header/header-auth-runtime.ts");
const deferredTask = read("apps/web/components/site-header/deferred-task.ts");
const deferredTaskTest = read("apps/web/components/site-header/deferred-task_test.ts");
const header = read("apps/web/components/SiteHeader.tsx");
const headerStyles = read("apps/web/app/styles/shell-header-nav.css");

expectExcludes("header auth hook", hook, "@/lib/supabase/");
expectExcludes("header auth hook", hook, 'from "./header-auth-runtime"');
[
  "createDedupedLoader<HeaderAuthRuntime>",
  '() => import("./header-auth-runtime")',
  "scheduleDeferredTask(",
  "1500,",
  "failClosed",
  "ensureAuthLoaded",
].forEach((snippet) => expectIncludes("header auth hook", hook, snippet));

[
  'from "@/lib/supabase/auth"',
  'from "@/lib/supabase/moderation"',
  'from "@/lib/supabase/profile"',
  "readHeaderAuthState",
  "subscribeToHeaderAuthState",
  "readHeaderModeratorAccess",
].forEach((snippet) => expectIncludes("deferred header auth runtime", runtime, snippet));

[
  "createDedupedLoader",
  "activeLoad = null",
  "requestIdleCallback",
  "setTimeout",
].forEach((snippet) => expectIncludes("deferred task helper", deferredTask, snippet));

[
  "shares one active load",
  "retries after a failed load",
  "prefers idle work with a deadline",
  "falls back to a cancellable timer",
].forEach((snippet) => expectIncludes("deferred task tests", deferredTaskTest, snippet));

[
  "onPointerEnter={() => void ensureAuthLoaded()}",
  "onPointerDown={() => void ensureAuthLoaded()}",
  "onFocusCapture={() => void ensureAuthLoaded()}",
  'className="nav-auth-slot"',
].forEach((snippet) => expectIncludes("SiteHeader interaction load", header, snippet));
expectIncludes("stable auth navigation geometry", headerStyles, ".nav-auth-slot{");
expectIncludes("stable auth navigation geometry", headerStyles, "inline-size:92px;");

if (failures.length) {
  console.error("Header auth loading guard failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Header auth loading guard passed.");
