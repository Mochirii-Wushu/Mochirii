const expectedFields = new Map([
  ["Contact", "mailto:support@mochirii.com"],
  ["Policy", "https://github.com/Mochirii-Wushu/Mochirii-Website/security/policy"],
  ["Preferred-Languages", "en"],
  ["Canonical", "https://social.mochirii.com/.well-known/security.txt"],
]);
const expectedOrder = [...expectedFields.keys(), "Expires"];
const maximumFutureLifetimeMs = 366 * 24 * 60 * 60 * 1000;

export function securityTxtContractFailures(value, now = new Date()) {
  const failures = [];
  const text = String(value || "").replace(/\r\n/g, "\n");
  if (Buffer.byteLength(text, "utf8") > 32 * 1024) failures.push("exceeds the 32 KiB parser budget");
  if (!text.endsWith("\n")) failures.push("must end with one newline");

  const lines = text.endsWith("\n") ? text.slice(0, -1).split("\n") : text.split("\n");
  if (lines.some((line) => !line)) failures.push("must not contain blank lines");
  if (lines.length !== expectedOrder.length) failures.push(`must contain exactly ${expectedOrder.length} fields`);

  const parsed = new Map();
  lines.forEach((line, index) => {
    const match = /^([A-Za-z-]+): (\S.*)$/u.exec(line);
    if (!match) {
      failures.push(`line ${index + 1} is not a valid field`);
      return;
    }
    const [, name, fieldValue] = match;
    if (parsed.has(name)) failures.push(`${name} must appear exactly once`);
    parsed.set(name, fieldValue);
    if (expectedOrder[index] !== name) failures.push(`line ${index + 1} must be ${expectedOrder[index]}`);
  });

  for (const [name, expectedValue] of expectedFields) {
    if (parsed.get(name) !== expectedValue) failures.push(`${name} must equal the reviewed value`);
  }
  for (const name of parsed.keys()) {
    if (!expectedOrder.includes(name)) failures.push(`unexpected field ${name}`);
  }

  const expiresValue = parsed.get("Expires") || "";
  const expiresMatch = /^(?!0000)(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u.exec(expiresValue);
  const nowTime = now.getTime();
  const expiresParts = expiresMatch ? expiresMatch.slice(1).map(Number) : [];
  const expiresTime = expiresMatch
    ? Date.UTC(
      expiresParts[0],
      expiresParts[1] - 1,
      expiresParts[2],
      expiresParts[3],
      expiresParts[4],
      expiresParts[5],
    )
    : Number.NaN;
  const expires = new Date(expiresTime);
  const calendarIsExact = expiresMatch
    && expires.getUTCFullYear() === expiresParts[0]
    && expires.getUTCMonth() === expiresParts[1] - 1
    && expires.getUTCDate() === expiresParts[2]
    && expires.getUTCHours() === expiresParts[3]
    && expires.getUTCMinutes() === expiresParts[4]
    && expires.getUTCSeconds() === expiresParts[5]
    && expires.getUTCMilliseconds() === 0;
  if (!calendarIsExact || !Number.isFinite(expiresTime)) {
    failures.push("Expires must be an exact UTC RFC 3339 timestamp");
  } else {
    if (expiresTime <= nowTime) failures.push("Expires must remain in the future");
    if (expiresTime - nowTime > maximumFutureLifetimeMs) failures.push("Expires must be no more than 366 days in the future");
  }

  return [...new Set(failures)];
}
