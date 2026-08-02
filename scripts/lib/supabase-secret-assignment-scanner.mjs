const secretEnvironmentName =
  "[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|SERVICE_ROLE_KEY|DATABASE_URL|CLIENT_SECRET|WEBHOOK)[A-Z0-9_]*";

const shellAssignmentValue = String.raw`(?:"[^"\r\n]*"|'[^'\r\n]*'|\`[^\`\r\n]*\`|[^\s#;&|)]+)`;

function isSqlFile(file) {
  return String(file || "").replaceAll("\\", "/").toLowerCase().endsWith(".sql");
}

const assignmentMatchers = [
  {
    dialect: "dotenv-posix",
    appliesTo: () => true,
    pattern: new RegExp(
      String.raw`(?:^|[;&|]\s*)\s*(?:(?:export|env)\s+)?(?<key>${secretEnvironmentName})\s*=\s*(?<value>${shellAssignmentValue})`,
      "g",
    ),
  },
  {
    dialect: "powershell",
    appliesTo: () => true,
    pattern: new RegExp(
      String.raw`(?:^|[;|]\s*)\s*\$env:(?<key>${secretEnvironmentName})\s*=\s*(?<value>${shellAssignmentValue})`,
      "gi",
    ),
  },
  {
    dialect: "cmd-set",
    appliesTo: (file) => !isSqlFile(file),
    pattern: new RegExp(
      String.raw`(?:^|[&|]\s*)\s*set\s+"?(?<key>${secretEnvironmentName})\s*=\s*(?<value>[^"\r\n&|]*)"?`,
      "gi",
    ),
  },
  {
    dialect: "cmd-setx",
    appliesTo: () => true,
    pattern: new RegExp(
      String.raw`(?:^|[&|]\s*)\s*setx\s+(?<key>${secretEnvironmentName})\s+(?<value>${shellAssignmentValue})`,
      "gi",
    ),
  },
];

export function findSecretEnvironmentAssignments(file, line) {
  const assignments = [];

  for (const matcher of assignmentMatchers) {
    if (!matcher.appliesTo(file)) continue;

    matcher.pattern.lastIndex = 0;
    for (const match of String(line || "").matchAll(matcher.pattern)) {
      assignments.push({
        dialect: matcher.dialect,
        key: match.groups?.key || "secret environment variable",
        value: match.groups?.value,
      });
    }
  }

  return assignments;
}
