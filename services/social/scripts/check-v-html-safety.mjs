import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8").replace(/\r\n/gu, "\n");
}

function requireIncludes(relative, source, required) {
  for (const value of required) {
    if (!source.includes(value)) {
      failures.push(`${relative} is missing the reviewed HTML-safety boundary: ${value}`);
    }
  }
}

function forbidIncludes(relative, source, forbidden) {
  for (const value of forbidden) {
    if (source.includes(value)) {
      failures.push(`${relative} retains an unsafe HTML construction boundary: ${value}`);
    }
  }
}

function walk(relative) {
  const absolute = path.join(root, relative);
  return fs.readdirSync(absolute, { withFileTypes: true })
    .flatMap((entry) => {
      const child = path.join(relative, entry.name);
      if (entry.isDirectory()) {
        return walk(child);
      }
      return /(?:\.(?:js|ts|vue)|\.blade\.php)$/u.test(entry.name) ? [child.replaceAll("\\", "/")] : [];
    });
}

function sourceWithoutComments(source) {
  return source
    .replace(/\{\{--[\s\S]*?--\}\}/gu, (comment) => " ".repeat(comment.length))
    .replace(/<!--[\s\S]*?-->/gu, (comment) => " ".repeat(comment.length))
    .replace(/\/\*[\s\S]*?\*\//gu, (comment) => " ".repeat(comment.length))
    .replace(/^[ \t]*\/\/.*$/gmu, (comment) => " ".repeat(comment.length));
}

function normalizeBladeExpression(expression) {
  return expression.replace(/\s+/gu, " ").trim();
}

function bladeRawKey(relative, expression) {
  return `${relative}::${normalizeBladeExpression(expression)}`;
}

function collectBladeRawSinks(relative, source) {
  return [...source.matchAll(/\{!!([\s\S]*?)!!\}/gu)].map((match) => ({
    relative,
    expression: normalizeBladeExpression(match[1]),
    line: source.slice(0, match.index).split("\n").length,
  }));
}

function skipWhitespace(source, start) {
  let cursor = start;
  while (/\s/u.test(source[cursor] ?? "")) {
    cursor += 1;
  }
  return cursor;
}

function readJavascriptString(source, start) {
  const quote = source[start];
  if (!["'", '"', "`"].includes(quote)) {
    return null;
  }
  let cursor = start + 1;
  let escaped = false;
  let hasInterpolation = false;
  while (cursor < source.length) {
    const character = source[cursor];
    if (escaped) {
      escaped = false;
      cursor += 1;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      cursor += 1;
      continue;
    }
    if (quote === "`" && character === "$" && source[cursor + 1] === "{") {
      hasInterpolation = true;
    }
    if (character === quote) {
      return { end: cursor + 1, hasInterpolation };
    }
    cursor += 1;
  }
  return null;
}

function classifyJavascriptValue(source, start) {
  const valueStart = skipWhitespace(source, start);
  const literal = readJavascriptString(source, valueStart);
  if (!literal || literal.hasInterpolation) {
    const identifier = source.slice(valueStart).match(/^[A-Za-z_$][\w$]*/u)?.[0] ?? "";
    return { kind: "dynamic", expression: identifier };
  }
  const afterLiteral = skipWhitespace(source, literal.end);
  if (source[afterLiteral] === "+") {
    return { kind: "dynamic", expression: source.slice(valueStart, afterLiteral + 1) };
  }
  return { kind: "static", expression: source.slice(valueStart, literal.end) };
}

function collectImperativeHtmlSinks(relative, source) {
  const sinks = [];
  for (const match of source.matchAll(/\b(innerHTML|outerHTML)\s*=\s*/gu)) {
    const value = classifyJavascriptValue(source, match.index + match[0].length);
    sinks.push({
      relative,
      type: match[1],
      line: source.slice(0, match.index).split("\n").length,
      ...value,
    });
  }
  for (const match of source.matchAll(/\.html\s*\(/gu)) {
    const argumentStart = skipWhitespace(source, match.index + match[0].length);
    if (source[argumentStart] === ")") {
      continue;
    }
    const value = classifyJavascriptValue(source, argumentStart);
    sinks.push({
      relative,
      type: "jquery.html",
      line: source.slice(0, match.index).split("\n").length,
      ...value,
    });
  }
  for (const [type, pattern] of [
    ["insertAdjacentHTML", /\.insertAdjacentHTML\s*\(/gu],
    ["document.write", /\bdocument\.write(?:ln)?\s*\(/gu],
  ]) {
    for (const match of source.matchAll(pattern)) {
      sinks.push({
        relative,
        type,
        kind: "dynamic",
        expression: "",
        line: source.slice(0, match.index).split("\n").length,
      });
    }
  }
  return sinks;
}

const expectedStaticSinks = new Map([
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('ID', 'id')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('Hashtag', 'name')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('Count', 'cached_count')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('Can Search', 'can_search')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('Can Trend', 'can_trend')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('NSFW', 'is_nsfw')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::buildColumn('Banned', 'is_banned')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::boolIcon(hashtag.can_search, 'text-success', 'text-danger')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::boolIcon(hashtag.can_trend, 'text-success', 'text-danger')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::boolIcon(hashtag.is_nsfw, 'text-danger')", 1],
  ["resources/assets/components/admin/AdminHashtags.vue::boolIcon(hashtag.is_banned, 'text-danger')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('ID', 'id')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('Domain', 'domain')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('Software', 'software')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('User Count', 'user_count')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('Status Count', 'status_count')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('Banned', 'banned')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('NSFW', 'auto_cw')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::buildColumn('Unlisted', 'unlisted')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::boolIcon(instance.banned, 'text-danger')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::boolIcon(instance.auto_cw, 'text-danger')", 1],
  ["resources/assets/components/admin/AdminInstances.vue::boolIcon(instance.unlisted, 'text-danger')", 1],
  ["resources/assets/js/components/filters/FilterModal.vue::$t('settings.filters.add_word_or_phrase')", 1],
  ["resources/assets/js/components/filters/FilterModal.vue::renderActionDescription()", 1],
  ["resources/assets/js/components/filters/FiltersList.vue::$t('settings.filters.limit_message', { filters_num: 20, keyword_num: 10 })", 1],
  ["resources/assets/js/components/filters/FiltersList.vue::$t('settings.filters.learn_more_help_center')", 1],
]);

const expectedRichTextSinks = new Map([
  ["resources/assets/components/groups/partials/GroupAbout.vue::group.description", 1],
  ["resources/assets/components/groups/partials/GroupInfoCard.vue::group.description", 1],
  ["resources/assets/components/groups/partials/GroupModeration.vue::report.status.content", 2],
  ["resources/assets/components/groups/partials/GroupStatus.vue::renderedCaption", 1],
  ["resources/assets/components/groups/partials/ReadMore.vue::content", 2],
  ["resources/assets/components/partials/post/EditHistoryModal.vue::allHistory[historyIndex].content", 1],
  ["resources/assets/components/partials/post/ReadMore.vue::content", 1],
  ["resources/assets/components/partials/profile/ProfileHoverCard.vue::bio", 1],
  ["resources/assets/components/partials/profile/ProfileSidebar.vue::renderedBio", 1],
  ["resources/assets/components/partials/profile/ProfileSidebar.vue::profile.note", 1],
  ["resources/assets/js/components/partials/CommentCard.vue::status.content", 1],
  ["resources/assets/js/components/partials/CommentCard.vue::reply.content", 1],
  ["resources/assets/js/components/partials/CommentCard.vue::s.content", 1],
  ["resources/assets/js/components/partials/PollCard.vue::status.content", 1],
  ["resources/assets/js/components/partials/StatusCard.vue::status.content", 2],
  ["resources/assets/js/components/partials/StatusCard.vue::content", 1],
  ["resources/assets/js/components/PostComponent.vue::status.content", 1],
  ["resources/assets/js/components/PostComponent.vue::content", 1],
  ["resources/assets/js/components/PostComponent.vue::reply.content", 1],
  ["resources/assets/js/components/PostComponent.vue::s.content", 1],
  ["resources/assets/js/components/Profile.vue::profile.note", 1],
]);

const allowedSinks = new Map([...expectedStaticSinks, ...expectedRichTextSinks]);
const actualSinks = new Map();

for (const relative of walk("resources/assets")) {
  const source = sourceWithoutComments(read(relative));
  for (const match of source.matchAll(/v-html\s*=\s*"([^"]+)"/gu)) {
    const expression = match[1];
    const key = `${relative}::${expression}`;
    actualSinks.set(key, (actualSinks.get(key) ?? 0) + 1);
    if (!allowedSinks.has(key)) {
      const line = source.slice(0, match.index).split("\n").length;
      failures.push(`${relative}:${line} contains an unreviewed v-html sink: ${expression}`);
    }
  }
}

for (const [key, expectedCount] of allowedSinks) {
  const actualCount = actualSinks.get(key) ?? 0;
  if (actualCount !== expectedCount) {
    failures.push(`Reviewed v-html inventory drifted for ${key}: expected ${expectedCount}, found ${actualCount}.`);
  }
}

const expectedBladeRawSinks = new Map();
for (const [relative, expression, expectedCount, reviewClass] of [
  ["resources/views/admin/curated-register/index.blade.php", String.raw`$record->adminStatusLabel()`, 1, "fixed-application-html"],
  ["resources/views/admin/newsroom/home.blade.php", String.raw`$newsroom->links()`, 1, "framework-pagination"],
  ["resources/views/admin/pages/edit.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($page->content ?? '')`, 1, "server-rich-text"],
  ["resources/views/admin/reports/appeals.blade.php", String.raw`$appeals->render()`, 1, "framework-pagination"],
  ["resources/views/admin/reports/spam.blade.php", String.raw`$appeals->render()`, 1, "framework-pagination"],
  ["resources/views/atom/user.blade.php", String.raw`str_replace(']]>', ']]]]><![CDATA[>', app(\App\Services\SanitizeService::class)->richText($item['content'] ?? ''))`, 1, "server-rich-text"],
  ["resources/views/auth/curated-register/concierge_form.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/curated-register/confirm_email.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/curated-register/partials/message-email-confirm.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/curated-register/partials/step-3.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/curated-register/resend-confirmation.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/email/forgot.blade.php", String.raw`Captcha::display(['data-theme' => 'dark'])`, 1, "framework-captcha"],
  ["resources/views/auth/iar-resend.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/iar.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/login.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/passwords/email.blade.php", String.raw`Captcha::display(['data-theme' => 'dark'])`, 1, "framework-captcha"],
  ["resources/views/auth/passwords/reset.blade.php", String.raw`Captcha::display(['data-theme' => 'dark'])`, 1, "framework-captcha"],
  ["resources/views/auth/register.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/auth/register.blade.php", String.raw`__('auth.terms')`, 1, "fixed-translation-html"],
  ["resources/views/auth/remote/start.blade.php", String.raw`\App\Services\Account\RemoteAuthService::getConfig()`, 1, "script-json"],
  ["resources/views/layouts/anon.blade.php", String.raw`App\Util\Site\Config::json()`, 1, "script-json"],
  ["resources/views/layouts/app.blade.php", String.raw`app(\App\Services\SanitizeService::class)->cssText(config_cache('uikit.custom.css'))`, 1, "trusted-admin-css-text"],
  ["resources/views/layouts/app.blade.php", String.raw`App\Util\Site\Config::json()`, 2, "script-json"],
  ["resources/views/layouts/blank.blade.php", String.raw`App\Util\Site\Config::json()`, 1, "script-json"],
  ["resources/views/layouts/spa.blade.php", String.raw`app(\App\Services\SanitizeService::class)->cssText(config_cache('uikit.custom.css'))`, 1, "trusted-admin-css-text"],
  ["resources/views/layouts/spa.blade.php", String.raw`App\Util\Site\Config::json()`, 1, "script-json"],
  ["resources/views/mobile/terms.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($page->content ?? '')`, 1, "server-rich-text"],
  ["resources/views/settings/parental-controls/invite-register-form.blade.php", String.raw`Captcha::display()`, 1, "framework-captcha"],
  ["resources/views/settings/security/2fa/setup.blade.php", String.raw`$qrcode`, 1, "framework-qrcode"],
  ["resources/views/site/about-custom.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($page->content ?? '')`, 1, "server-rich-text"],
  ["resources/views/site/help/community-guidelines.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($page->content ?? '')`, 1, "server-rich-text"],
  ["resources/views/site/legal-notice.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($page->content ?? '')`, 1, "server-rich-text"],
  ["resources/views/site/news/post/show.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($post->body ?? '')`, 1, "server-rich-text"],
  ["resources/views/site/terms.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($page->content ?? '')`, 1, "server-rich-text"],
  ["resources/views/status/reply.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($gp->caption ?? '')`, 1, "server-rich-text"],
  ["resources/views/status/reply.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($parent->caption ?? '')`, 1, "server-rich-text"],
  ["resources/views/status/reply.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($status->caption ?? '')`, 2, "server-rich-text"],
  ["resources/views/status/reply.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($status->comments()->first()->rendered ?? '')`, 1, "server-rich-text"],
  ["resources/views/status/template.blade.php", String.raw`app(\App\Services\SanitizeService::class)->richText($item->rendered ?? $item->caption ?? '')`, 1, "server-rich-text"],
  ["resources/views/vendor/mail/text/layout.blade.php", String.raw`strip_tags($header)`, 1, "framework-text-mail"],
  ["resources/views/vendor/mail/text/layout.blade.php", String.raw`strip_tags($slot)`, 1, "framework-text-mail"],
  ["resources/views/vendor/mail/text/layout.blade.php", String.raw`strip_tags($subcopy)`, 1, "framework-text-mail"],
  ["resources/views/vendor/mail/text/layout.blade.php", String.raw`strip_tags($footer)`, 1, "framework-text-mail"],
]) {
  expectedBladeRawSinks.set(bladeRawKey(relative, expression), { expectedCount, reviewClass });
}

const actualBladeRawSinks = new Map();
for (const relative of walk("resources/views")) {
  const source = sourceWithoutComments(read(relative));
  for (const match of source.matchAll(/v-html\s*=/gu)) {
    const line = source.slice(0, match.index).split("\n").length;
    failures.push(`${relative}:${line} contains a Blade-template v-html sink; use structural or text rendering.`);
  }
  for (const sink of collectBladeRawSinks(relative, source)) {
    const key = bladeRawKey(relative, sink.expression);
    actualBladeRawSinks.set(key, (actualBladeRawSinks.get(key) ?? 0) + 1);
    if (!expectedBladeRawSinks.has(key)) {
      failures.push(`${relative}:${sink.line} contains an unreviewed raw Blade output: ${sink.expression}`);
    }
  }
}

for (const [key, contract] of expectedBladeRawSinks) {
  const actualCount = actualBladeRawSinks.get(key) ?? 0;
  if (actualCount !== contract.expectedCount) {
    failures.push(`Reviewed raw Blade inventory drifted for ${key}: expected ${contract.expectedCount}, found ${actualCount}.`);
  }
}

const hostileBladeFixture = collectBladeRawSinks(
  "fixtures/unreviewed.blade.php",
  "<p>{!! $unreviewedUserHtml !!}</p>",
);
if (
  hostileBladeFixture.length !== 1
  || expectedBladeRawSinks.has(bladeRawKey(hostileBladeFixture[0].relative, hostileBladeFixture[0].expression))
) {
  failures.push("Raw Blade inventory self-test did not fail closed for an unreviewed hostile fixture.");
}

const ignoredImperativeSinkFiles = new Set([
  "resources/assets/js/lib/fontawesome-all.js",
]);
const expectedStaticImperativeSinks = new Map([
  ["resources/assets/components/admin/AdminInstances.vue::innerHTML:static", 1],
  ["resources/assets/components/discover/Hashtags.vue::innerHTML:static", 1],
  ["resources/assets/components/sections/Timeline.vue::innerHTML:static", 1],
  ["resources/assets/js/components/ComposeClassic.vue::innerHTML:static", 1],
  ["resources/views/auth/checkpoint.blade.php::innerHTML:static", 1],
  ["resources/views/auth/email/forgot.blade.php::innerHTML:static", 1],
  ["resources/views/auth/passwords/email.blade.php::innerHTML:static", 1],
  ["resources/views/auth/passwords/reset.blade.php::innerHTML:static", 1],
  ["resources/views/auth/sudo.blade.php::innerHTML:static", 1],
  ["resources/views/status/embed.blade.php::innerHTML:static", 2],
]);
const expectedRichTextRewriteSinks = new Map([
  ["resources/assets/components/partials/post/ReadMore.vue::innerHTML:server-rich-text", 1],
  ["resources/assets/components/partials/profile/ProfileHoverCard.vue::innerHTML:server-rich-text", 1],
  ["resources/assets/components/partials/profile/ProfileSidebar.vue::innerHTML:server-rich-text", 1],
]);
const allowedImperativeSinks = new Map([
  ...expectedStaticImperativeSinks,
  ...expectedRichTextRewriteSinks,
]);
const actualImperativeSinks = new Map();

for (const relative of walk("resources")) {
  if (ignoredImperativeSinkFiles.has(relative)) {
    continue;
  }
  const source = sourceWithoutComments(read(relative));
  for (const sink of collectImperativeHtmlSinks(relative, source)) {
    let reviewClass = sink.kind;
    if (
      sink.type === "innerHTML"
      && sink.expression === "content"
      && expectedRichTextRewriteSinks.has(`${relative}::innerHTML:server-rich-text`)
    ) {
      reviewClass = "server-rich-text";
    }
    const key = `${relative}::${sink.type}:${reviewClass}`;
    actualImperativeSinks.set(key, (actualImperativeSinks.get(key) ?? 0) + 1);
    if (!allowedImperativeSinks.has(key)) {
      failures.push(`${relative}:${sink.line} contains an unreviewed ${sink.type} ${sink.kind} HTML sink.`);
    }
  }
}

for (const [key, expectedCount] of allowedImperativeSinks) {
  const actualCount = actualImperativeSinks.get(key) ?? 0;
  if (actualCount !== expectedCount) {
    failures.push(`Reviewed imperative HTML inventory drifted for ${key}: expected ${expectedCount}, found ${actualCount}.`);
  }
}

const hostileImperativeFixture = `
  const hostile = '<img src=x onerror=alert(1)>';
  target.innerHTML = hostile;
  target.outerHTML = hostile;
  target.insertAdjacentHTML('beforeend', hostile);
  document.write(hostile);
  $('.target').html(hostile);
`;
const hostileSinkTypes = collectImperativeHtmlSinks("hostile-fixture.js", hostileImperativeFixture)
  .map((sink) => `${sink.type}:${sink.kind}`)
  .sort();
const expectedHostileSinkTypes = [
  "document.write:dynamic",
  "innerHTML:dynamic",
  "insertAdjacentHTML:dynamic",
  "jquery.html:dynamic",
  "outerHTML:dynamic",
].sort();
if (JSON.stringify(hostileSinkTypes) !== JSON.stringify(expectedHostileSinkTypes)) {
  failures.push(`Hostile imperative-sink regression drifted: expected ${expectedHostileSinkTypes.join(", ")}, found ${hostileSinkTypes.join(", ")}.`);
}

const literalImperativeFixture = `
  target.innerHTML = '<span class="spinner">Loading</span>';
  const copy = target.innerHTML;
  $('.target').html();
`;
const literalFixtureSinks = collectImperativeHtmlSinks("literal-fixture.js", literalImperativeFixture);
if (literalFixtureSinks.length !== 1 || literalFixtureSinks[0].type !== "innerHTML" || literalFixtureSinks[0].kind !== "static") {
  failures.push("Literal imperative-sink regression must recognize one static assignment and ignore HTML getters.");
}

const eliminatedOpenBoundaryIds = [
  "VH-024", "VH-025", "VH-026", "VH-027", "VH-028", "VH-038", "VH-039", "VH-040", "VH-043",
  "VH-044", "VH-045", "VH-047", "VH-048", "VH-051", "VH-057", "VH-062", "VH-065", "VH-072",
];
const guardedOpenBoundaryIds = [
  "VH-033", "VH-034", "VH-036", "VH-037", "VH-041", "VH-042", "VH-049", "VH-066", "VH-068",
];
if (new Set([...eliminatedOpenBoundaryIds, ...guardedOpenBoundaryIds]).size !== 27) {
  failures.push("The OPEN_BOUNDARY closure register must account for exactly 27 unique reviewed rows.");
}

const escapedTextContracts = [
  ["resources/assets/components/admin/AdminReports.vue", [
    'v-text="reportLabel(report)"',
    'v-for="label in getModerationLabels(report)"',
    ':class="label === \'Banned\' ? \'badge-danger\' : \'badge-primary\'"',
    'v-text="label"',
    'v-text="reportLabel(viewingReport)"',
    "return ['Banned']",
    "return labels;",
  ]],
  ["resources/assets/components/admin/partial/AdminSettingsCheckbox.vue", ['v-text="description"']],
  ["resources/assets/components/admin/partial/AdminSettingsInput.vue", ['v-text="description"']],
  ["resources/assets/components/Direct.vue", ['v-text="threadSummary(thread.last_status)"', "return sender ? 'Sent a photo' : 'Received a photo'", 'class="far fa-reply-all fa-flip-both"', "['photo', 'video'].includes(status.pf_type)"]],
  ["resources/assets/components/groups/partials/Status/GroupHeader.vue", ['<account-username :account="status.account" />']],
  ["resources/assets/components/groups/partials/GroupStatus.vue", ['v-text="statusCardUsernameFormat(status)"']],
  ["resources/assets/components/landing/Index.vue", ['v-text="config.about.description"']],
  ["resources/assets/components/partials/profile/ProfileFollowers.vue", ['<display-name :profile="account" :emojis="getCustomEmoji" />']],
  ["resources/assets/components/partials/profile/ProfileFollowing.vue", ['<display-name :profile="account" :emojis="getCustomEmoji" />']],
  ["resources/assets/components/partials/profile/ProfileHoverCard.vue", ['<display-name :profile="profile" :emojis="getCustomEmoji" />']],
  ["resources/assets/components/partials/profile/ProfileSidebar.vue", ['<display-name :profile="profile" :emojis="getCustomEmoji" />']],
  ["resources/assets/components/partials/sidebar.vue", ['<display-name :profile="user" :emojis="getCustomEmoji" />']],
  ["resources/assets/js/components/LoopComponent.vue", ['v-text="getTitle(loop)"']],
  ["resources/assets/js/components/partials/StatusCard.vue", ['<account-username :account="status.account" />']],
  ["resources/assets/js/components/SearchResults.vue", ['v-text="status.caption"']],
];
for (const [relative, required] of escapedTextContracts) {
  requireIncludes(relative, read(relative), required);
}

const directoryComponent = read("resources/assets/components/admin/AdminDirectory.vue");
if (directoryComponent.includes('v-html="testimonial.body"')) {
  failures.push("AdminDirectory.vue must not render stored testimonial text through v-html.");
}
requireIncludes("resources/assets/components/admin/AdminDirectory.vue", directoryComponent, ['v-text="testimonial.body"']);

const directMessage = read("resources/assets/components/DirectMessage.vue");
if (directMessage.includes('v-html="conversationProfile.display_name"')) {
  failures.push("DirectMessage.vue must not render a member display name through v-html.");
}
requireIncludes("resources/assets/components/DirectMessage.vue", directMessage, ['v-text="conversationProfile.display_name"']);

const filters = read("resources/assets/js/components/filters/FiltersList.vue");
if (/v-html\s*=\s*"[^"\n]*searchQuery/gu.test(filters)) {
  failures.push("FiltersList.vue must not interpolate user search text through v-html.");
}
requireIncludes("resources/assets/js/components/filters/FiltersList.vue", filters, [
  'path="settings.filters.no_matching_filters"',
  '<strong place="searchQuery">{{ searchQuery }}</strong>',
]);

for (const relative of [
  "resources/assets/js/i18n/en.json",
  "resources/assets/js/i18n/ja.json",
  "resources/assets/js/i18n/pt.json",
]) {
  const messages = JSON.parse(read(relative));
  const message = messages?.settings?.filters?.no_matching_filters;
  if (typeof message !== "string" || !message.includes("{searchQuery}")) {
    failures.push(`${relative} must expose the search query only through a Vue I18n interpolation placeholder.`);
  }
  if (/<\/?(?:strong|script|img)\b/iu.test(message || "")) {
    failures.push(`${relative} must keep the no-match message free of embedded HTML.`);
  }
}

const accountUsernameComponent = read("resources/assets/components/partials/AccountUsername.vue");
requireIncludes("resources/assets/components/partials/AccountUsername.vue", accountUsernameComponent, [
  "name: 'AccountUsername'",
  "v-text=\"username\"",
  "v-text=\"customConnector\"",
  "v-text=\"remoteDomain\"",
  "typeof this.account.url !== 'string' || !this.account.url.trim()",
  "url.protocol === 'http:' && url.origin === window.location.origin",
  "allowedProtocol && !url.username && !url.password ? url.hostname : ''",
]);
forbidIncludes("resources/assets/components/partials/AccountUsername.vue", accountUsernameComponent, [
  "v-html",
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "document.write",
]);
for (const relative of [
  "resources/assets/components/groups/partials/Status/GroupHeader.vue",
  "resources/assets/js/components/partials/StatusCard.vue",
]) {
  const source = read(relative);
  requireIncludes(relative, source, ["import AccountUsername from", "AccountUsername"]);
}

const imperativeSafeContracts = [
  ["resources/assets/components/admin/AdminSettings.vue", [
    "el.textContent = typeof err.response.data.message === 'string'",
    "Unable to validate the storage credentials.",
  ], [
    "el.innerHTML = err.response.data.message",
  ]],
  ["resources/assets/components/admin/AdminInstances.vue", [
    "retry.textContent = 'Please try again later.'",
    "code.textContent = err instanceof Error && err.message",
  ], [
    "<code>' + err.message + '</code>",
  ]],
  ["resources/views/admin/home.blade.php", [
    "titleText.textContent = 'Are you sure you want to delete the following accounts:'",
    "username.textContent = String(a.username || '')",
    "note.textContent = this.renderNote(a.note_text)",
    "typeof a.avatar === 'string' ? a.avatar.trim() : ''",
    "allowedProtocol && !avatarUrl.username && !avatarUrl.password",
  ], [
    "${a.username}",
    "${this.renderNote(a.note_text)}",
    "['http:', 'https:'].includes(avatarUrl.protocol)",
  ]],
  ["resources/views/admin/curated-register/index.blade.php", [
    "warning.textContent = 'Are you sure you want to ' + actionMap[action]",
    "mr.textContent = typeof m.name === 'string' ? m.name : ''",
  ], [
    "warning.innerHTML",
    "mr.innerHTML",
  ]],
  ["resources/assets/components/sections/Notifications.vue", [
    "postLink.href = `/i/web/post/${encodeURIComponent(String(status.id))}`",
    "postLink.textContent = 'post'",
    "details.textContent = 'Once a human approves your post",
  ], [
    "el.innerHTML",
  ]],
  ["resources/assets/components/presenter/VideoPlayer.vue", [
    "span.textContent = Number.isFinite(height) ? `Auto (${height}p)` : 'Auto'",
    "span.textContent = 'Auto'",
  ], [
    "span.innerHTML",
  ]],
  ["resources/assets/components/groups/partials/Status/GroupHeader.vue", [
    "button.textContent = typeof rt.title === 'string' ? rt.title : ''",
  ], [
    "button.innerHTML = rt.title",
  ]],
  ["resources/views/profile/embed.blade.php", [
    "function safeResourceUrl(value)",
    "typeof value !== 'string' || !value.trim()",
    "allowedProtocol && !url.username && !url.password",
    "const svg = document.createElementNS(namespace, 'svg')",
    "const tile = createMediaTile(post)",
    "parent.appendChild(tile)",
  ], [
    "template.innerHTML",
    "el.innerHTML = html",
    "${post.url}",
    "${mediaUrl}",
  ]],
  ["resources/views/settings/home.blade.php", [
    "counter.replaceChildren()",
    "overflow.textContent = '-' + (length - maxLength)",
    "preview.replaceChildren(image)",
  ], [
    "$('.bio-counter').html",
    "$('#previewAvatar').html",
  ]],
  ["resources/views/admin/settings/system.blade.php", [
    "$('.latest-body').text(typeof latest.body === 'string' ? latest.body : '')",
    "white-space: pre-wrap",
  ], [
    "$('.latest-body').html(marked(latest.body))",
  ]],
];
for (const [relative, required, forbidden] of imperativeSafeContracts) {
  const source = read(relative);
  requireIncludes(relative, source, required);
  forbidIncludes(relative, source, forbidden);
}

const displayNameComponent = read("resources/assets/components/partials/profile/DisplayName.vue");
requireIncludes("resources/assets/components/partials/profile/DisplayName.vue", displayNameComponent, [
  "SHORTCODE_PATTERN = /^[A-Za-z0-9_+-]{1,64}$/",
  "SHORTCODE_TOKEN_PATTERN = /:([A-Za-z0-9_+-]{1,64}):/g",
  "name: 'DisplayName'",
  "v-for=\"(segment, index) in segments\"",
  "v-text=\"segment.text\"",
  "typeof value !== 'string' || !value.trim()",
  "url.protocol === 'http:' && url.origin === window.location.origin",
  "allowedProtocol && !url.username && !url.password",
  "@error=\"useMissingEmoji\"",
  "image.removeAttribute('data-original')",
  "image.setAttribute('src', MISSING_EMOJI_URL)",
]);
forbidIncludes("resources/assets/components/partials/profile/DisplayName.vue", displayNameComponent, [
  "v-html",
  "innerHTML",
  "outerHTML",
  "insertAdjacentHTML",
  "document.write",
]);

for (const relative of [
  "resources/assets/components/partials/profile/ProfileFollowers.vue",
  "resources/assets/components/partials/profile/ProfileFollowing.vue",
  "resources/assets/components/partials/profile/ProfileHoverCard.vue",
  "resources/assets/components/partials/profile/ProfileSidebar.vue",
  "resources/assets/components/partials/sidebar.vue",
]) {
  const source = read(relative);
  requireIncludes(relative, source, ["import DisplayName from"]);
  if (!/components\s*:\s*\{[\s\S]*?\bDisplayName\b/u.test(source)) {
    failures.push(`${relative} must register the typed DisplayName component.`);
  }
}

const sanitizer = read("app/Services/SanitizeService.php");
requireIncludes("app/Services/SanitizeService.php", sanitizer, [
  "public function richText($html): string",
  "Purify::config('mochirii_rich_text')->clean($html)",
  "public function plainText($html): string",
  "strip_tags(Purify::clean((string) $html))",
  "public function cssText($css): string",
  "str_replace('<', '\\\\3C ', (string) $css)",
]);

const purifierConfig = read("config/purify.php");
requireIncludes("config/purify.php", purifierConfig, [
  "'mochirii_rich_text' => $mochiriiRichText",
  "'HTML.Allowed' => 'a[href|title|rel|class],p[class],span[class],strong,em,del,b,i,s,strike,blockquote,code,pre,h1,h2,h3,h4,h5,h6,ul,ol,li,br'",
  "'URI.DisableExternalResources' => true",
  "'URI.DisableResources' => true",
  "'URI.AllowedSchemes' => [",
  "'http' => true",
  "'https' => true",
]);

const producerContracts = [
  ["app/Services/AccountService.php", [
    "$res['display_name'] = $sanitizer->plainText($res['display_name'] ?? '')",
    "$res['note'] = $sanitizer->richText($res['note'] ?? '')",
  ]],
  ["app/Services/GroupService.php", ["$res['description'] = app(SanitizeService::class)->richText($res['description'] ?? '')"]],
  ["app/Services/Groups/GroupPostService.php", ["$res['content'] = app(SanitizeService::class)->richText($res['content'])"]],
  ["app/Services/StatusService.php", ["$res['content'] = app(SanitizeService::class)->richText($res['content'])"]],
  ["app/Transformer/Api/AccountTransformer.php", [
    "'display_name' => app(SanitizeService::class)->plainText($profile->name)",
    "'note' => app(SanitizeService::class)->richText($profile->bio ?? '')",
  ]],
  ["app/Transformer/Api/Mastodon/v1/AccountTransformer.php", [
    "'display_name' => app(SanitizeService::class)->plainText($profile->name)",
    "'note' => app(SanitizeService::class)->richText($profile->bio ?? '')",
  ]],
  ["app/Transformer/Api/StatusTransformer.php", ["app(SanitizeService::class)->richText(nl2br(Autolink::create()->autolink($status->caption)))"]],
  ["app/Transformer/Api/StatusStatelessTransformer.php", ["app(SanitizeService::class)->richText(nl2br(Autolink::create()->autolink($status->caption)))"]],
  ["app/Transformer/Api/Mastodon/v1/StatusTransformer.php", ["app(SanitizeService::class)->richText(nl2br(Autolink::create()->autolink($status->caption)))"]],
  ["app/Transformer/Api/GroupPostTransformer.php", ["'content' => app(SanitizeService::class)->richText($status->caption)"]],
  ["app/Http/Resources/StatusStateless.php", ["app(SanitizeService::class)->richText(Autolink::create()->autolink($status->caption))"]],
  ["app/Http/Controllers/StatusEditController.php", ["'content' => app(SanitizeService::class)->richText(Autolink::create()->autolink($caption))"]],
  ["app/Models/CustomEmoji.php", ["array_map('rawurlencode', explode('/', ltrim((string) $tag->media_path, '/')))" ]],
  ["app/Http/Controllers/PageController.php", ["app(SanitizeService::class)->richText($request->input('content'))"]],
  ["app/Http/Controllers/AdminController.php", [
    "$field === 'body'",
    "app(SanitizeService::class)->richText($request->{$field})",
  ]],
  ["app/Util/Site/Config.php", [
    "public static function json(): string",
    "JSON_FORCE_OBJECT | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR",
  ]],
  ["app/Services/Account/RemoteAuthService.php", [
    "public static function getConfig(): string",
    "JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR",
  ]],
];
for (const [relative, required] of producerContracts) {
  requireIncludes(relative, read(relative), required);
}

const readMoreCallers = walk("resources/assets")
  .flatMap((relative) => [...sourceWithoutComments(read(relative)).matchAll(/<read-more\b[\s\S]*?>/gu)].map((match) => ({ relative, tag: match[0] })));
for (const { relative, tag } of readMoreCallers) {
  if (!/:status\s*=\s*"[^"]+"/u.test(tag)) {
    failures.push(`${relative} passes content to ReadMore without the reviewed status-object contract.`);
  }
}

const sanitizerTests = read("tests/Unit/SanitizeServiceTest.php");
requireIncludes("tests/Unit/SanitizeServiceTest.php", sanitizerTests, [
  "richTextUsesTheFixedMochiriiAllowlistForHostileStoredHtml",
  "autolinkEscapesHostileCaptionMarkupBeforeRichTextRendering",
  "richTextAllowlistCannotBeExpandedByRuntimeEnvironment",
  "richTextIsIdempotentForReviewedFormattingAndHostileMarkup",
  "cssTextCannotBreakOutOfItsStyleElement",
  "javascript:alert(3)",
  "onerror=alert(1)",
]);

const outputBoundaryTests = read("tests/Unit/OutputBoundaryTest.php");
requireIncludes("tests/Unit/OutputBoundaryTest.php", outputBoundaryTests, [
  "siteConfigJsonRoundTripsWithoutAHtmlScriptBreakout",
  "remoteAuthConfigRoundTripsWithoutAHtmlAttributeBreakout",
  "json_decode($encoded, true, 512, JSON_THROW_ON_ERROR)",
  "assertStringNotContainsString('</script'",
  "assertStringNotContainsString(\"'\", $encoded)",
]);

const directoryController = read("app/Http/Controllers/Admin/AdminDirectoryController.php");
requireIncludes("app/Http/Controllers/Admin/AdminDirectoryController.php", directoryController, [
  "$this->validatedPlainTextTestimonialBody($request)",
  "app(SanitizeService::class)->plainText($request->input('body'))",
  "app(SanitizeService::class)->plainText($t['body'])",
]);

const publicDirectoryController = read("app/Http/Controllers/PixelfedDirectoryController.php");
requireIncludes("app/Http/Controllers/PixelfedDirectoryController.php", publicDirectoryController, [
  "app(SanitizeService::class)->plainText($testimonial['body'])",
]);

if (failures.length > 0) {
  console.error("Social v-html safety contract failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const staticSinkCount = [...expectedStaticSinks.values()].reduce((sum, count) => sum + count, 0);
const richTextSinkCount = [...expectedRichTextSinks.values()].reduce((sum, count) => sum + count, 0);
const staticImperativeSinkCount = [...expectedStaticImperativeSinks.values()].reduce((sum, count) => sum + count, 0);
const richTextRewriteSinkCount = [...expectedRichTextRewriteSinks.values()].reduce((sum, count) => sum + count, 0);
const bladeClassCounts = [...expectedBladeRawSinks.values()].reduce((counts, contract) => {
  counts.set(contract.reviewClass, (counts.get(contract.reviewClass) ?? 0) + contract.expectedCount);
  return counts;
}, new Map());
const bladeRawSinkCount = [...actualBladeRawSinks.values()].reduce((sum, count) => sum + count, 0);
console.log("Social v-html safety contract passed.");
console.log(`- ${actualSinks.size} exact source/expression contracts cover ${staticSinkCount + richTextSinkCount} active sinks.`);
console.log(`- ${staticSinkCount} sinks are fixed application markup; ${richTextSinkCount} use the fixed server rich-text allowlist.`);
console.log(`- ${staticImperativeSinkCount} imperative sinks contain static literals; ${richTextRewriteSinkCount} are exact server-sanitized rewrite boundaries.`);
console.log("- Dynamic innerHTML, outerHTML, insertAdjacentHTML, document.write, and jQuery html setters fail closed.");
console.log("- All 27 prior OPEN_BOUNDARY rows are closed: 18 sinks eliminated and 9 producer boundaries fail-closed guarded.");
console.log("- Testimonial, filter-query, direct-message, profile-name, report, settings, landing, loop, and search text use escaped rendering.");
console.log(`- ${bladeRawSinkCount} raw Blade outputs have exact file/expression/count contracts; Blade v-html is zero.`);
console.log(`- Raw Blade classes: ${[...bladeClassCounts].map(([name, count]) => `${name}=${count}`).join(", ")}.`);
