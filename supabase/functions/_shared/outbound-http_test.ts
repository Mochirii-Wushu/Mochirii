import {
  exactHttpsUrl,
  fetchWithTimeout,
  OutboundHttpError,
  readBoundedResponseJson,
  readBoundedResponseText,
} from "./outbound-http.ts";

Deno.test("exactHttpsUrl accepts only the exact HTTPS trust boundary", () => {
  const options = {
    allowedOrigins: new Set(["https://mochirii.com"]),
    exactPathname: "/data/guild-schedule.json",
  };
  assert(
    exactHttpsUrl("https://mochirii.com/data/guild-schedule.json", options) ===
      "https://mochirii.com/data/guild-schedule.json",
    "exact Website URL rejected",
  );

  for (
    const value of [
      "http://mochirii.com/data/guild-schedule.json",
      "https://user:secret@mochirii.com/data/guild-schedule.json",
      "https://mochirii.com:8443/data/guild-schedule.json",
      "https://mochirii.com/data/guild-schedule.json#fragment",
      "https://mochirii.com/data/other.json",
      "https://mochirii.com.evil.test/data/guild-schedule.json",
      `https://${[127, 0, 0, 1].join(".")}/data/guild-schedule.json`,
    ]
  ) {
    assert(
      exactHttpsUrl(value, options) === null,
      `unsafe URL accepted: ${value}`,
    );
  }
});

Deno.test("exactHttpsUrl enforces canonical prefix path segments", () => {
  const options = {
    allowedOrigins: new Set(["https://mochirii.com"]),
    pathPrefix: "/assets",
  };
  assert(
    exactHttpsUrl("https://mochirii.com/assets/events/cover.webp", options) ===
      "https://mochirii.com/assets/events/cover.webp",
    "canonical asset path rejected",
  );

  for (
    const value of [
      "https://mochirii.com/assets-private/cover.webp",
      "https://mochirii.com/assets/%252e%252e%252fprivate",
      "https://mochirii.com/assets/%2fprivate",
      "https://mochirii.com/assets/%5cprivate",
    ]
  ) {
    assert(
      exactHttpsUrl(value, options) === null,
      `non-canonical asset path accepted: ${value}`,
    );
  }
});

Deno.test("fetchWithTimeout rejects redirects and applies a total timeout signal", async () => {
  let captured: RequestInit | undefined;
  const response = await fetchWithTimeout(
    "https://example.invalid/resource",
    { headers: { Accept: "application/json" } },
    {
      timeoutMs: 100,
      fetcher: ((_input, init) => {
        captured = init;
        return Promise.resolve(Response.json({ ok: true }));
      }) as typeof fetch,
    },
  );
  assert(response.ok, "synthetic response rejected");
  assert(captured?.redirect === "error", "redirects were not disabled");
  assert(captured?.signal instanceof AbortSignal, "timeout signal missing");

  await assertRejectsCode(
    () =>
      fetchWithTimeout("https://example.invalid/slow", {}, {
        timeoutMs: 5,
        fetcher: ((_input, init) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(init.signal?.reason),
              {
                once: true,
              },
            );
          })) as typeof fetch,
      }),
    "request_timeout",
  );
});

Deno.test("bounded response readers reject declared and streamed overflow", async () => {
  await assertRejectsCode(
    () =>
      readBoundedResponseText(
        new Response("small", { headers: { "content-length": "65" } }),
        64,
      ),
    "response_too_large",
  );

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(40));
      controller.enqueue(new Uint8Array(40));
      controller.close();
    },
  });
  await assertRejectsCode(
    () => readBoundedResponseText(new Response(stream), 64),
    "response_too_large",
  );

  await assertRejectsCode(
    () =>
      readBoundedResponseText(
        new Response("body", { headers: { "content-length": "invalid" } }),
        64,
      ),
    "response_length_invalid",
  );
});

Deno.test("bounded response readers require valid UTF-8 and JSON", async () => {
  await assertRejectsCode(
    () => readBoundedResponseText(new Response(new Uint8Array([0xff])), 8),
    "response_encoding_invalid",
  );
  await assertRejectsCode(
    () => readBoundedResponseJson(new Response("not-json"), 32),
    "response_json_invalid",
  );
  const parsed = await readBoundedResponseJson(
    Response.json({ ok: true }),
    64,
  ) as { ok?: boolean };
  assert(parsed.ok === true, "valid JSON response rejected");
});

async function assertRejectsCode(
  fn: () => Promise<unknown>,
  expectedCode: OutboundHttpError["code"],
): Promise<void> {
  try {
    await fn();
  } catch (error) {
    assert(error instanceof OutboundHttpError, "wrong outbound error type");
    assert(
      error.code === expectedCode,
      `expected ${expectedCode}, received ${error.code}`,
    );
    return;
  }
  throw new Error(`Expected ${expectedCode}.`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
