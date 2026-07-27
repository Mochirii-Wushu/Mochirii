const SECRET_FIELD = "authorization_id|code|code_verifier|state|access_token|refresh_token|id_token|client_secret";

export function redactRuntimeDiagnosticText(value) {
  return String(value)
    .replace(/(\/auth\/oidc\/callback)[?#]\S+/gi, "$1?[redacted]")
    .replace(/((?:authorization|proxy-authorization):\s*(?:bearer|basic)\s+)\S+/gi, "$1[redacted]")
    .replace(/((?:cookie|set-cookie):)[^\r\n]*/gi, "$1 [redacted]")
    .replace(new RegExp(`([?&#](?:${SECRET_FIELD})=)[^&#\\s]+`, "gi"), "$1[redacted]")
    .replace(
      new RegExp(`(["']?(?:${SECRET_FIELD})["']?\\s*[:=]\\s*["']?)[^"',}\\s&]+`, "gi"),
      "$1[redacted]",
    );
}
