export const reviewedCloudflareOriginRanges = Object.freeze([
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
]);

export function caddyCloudflareOriginRangeFailures(value) {
  const failures = [];
  const caddy = String(value || "").replace(/\r\n/g, "\n");
  const matches = [...caddy.matchAll(/^\s*trusted_proxies static (.+)$/gmu)];
  if (matches.length !== 1) return ["must define exactly one static trusted-proxy range list"];

  const actual = matches[0][1].trim().split(/\s+/u);
  const expected = [...reviewedCloudflareOriginRanges];
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);

  if (actualSet.size !== actual.length) failures.push("must not contain duplicate Cloudflare ranges");
  const missing = expected.filter((range) => !actualSet.has(range));
  const unexpected = actual.filter((range) => !expectedSet.has(range));
  if (missing.length) failures.push(`is missing reviewed Cloudflare ranges: ${missing.join(", ")}`);
  if (unexpected.length) failures.push(`contains unreviewed trusted-proxy ranges: ${unexpected.join(", ")}`);
  if (actual.length !== expected.length) failures.push(`must contain exactly ${expected.length} reviewed Cloudflare ranges`);

  return [...new Set(failures)];
}
