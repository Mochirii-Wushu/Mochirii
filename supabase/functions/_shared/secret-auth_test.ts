import {
  constantTimeSecretEqual,
  MAX_SHARED_SECRET_BYTES,
} from "./secret-auth.ts";

Deno.test("constant-time secret comparison accepts only an exact match", async () => {
  if (!await constantTimeSecretEqual("synthetic-secret", "synthetic-secret")) {
    throw new Error("Equal secrets should match.");
  }
  for (const provided of ["", "synthetic-secreu", "synthetic-secret-extra"]) {
    if (await constantTimeSecretEqual(provided, "synthetic-secret")) {
      throw new Error("Different or empty secrets must fail closed.");
    }
  }
});

Deno.test("constant-time secret comparison rejects oversized credentials", async () => {
  if (
    !await constantTimeSecretEqual(
      "x".repeat(MAX_SHARED_SECRET_BYTES),
      "x".repeat(MAX_SHARED_SECRET_BYTES),
    )
  ) {
    throw new Error("The exact maximum credential size should match.");
  }
  if (
    await constantTimeSecretEqual(
      "x".repeat(MAX_SHARED_SECRET_BYTES + 1),
      "x".repeat(MAX_SHARED_SECRET_BYTES + 1),
    )
  ) {
    throw new Error("Oversized credentials must fail closed.");
  }
});
