import { eventSocialSchedulerRequestHasExactEmptyJson } from "./event-social-scheduler-request.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function request(body: BodyInit | null, contentType = "application/json") {
  return new Request("https://example.invalid/scheduler", {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
}

Deno.test("event-social scheduler accepts only an exact empty JSON object", async () => {
  assert(
    await eventSocialSchedulerRequestHasExactEmptyJson(request("{}")),
    "exact empty JSON object was rejected",
  );
  for (const body of ["", "[]", "null", '{"unexpected":true}']) {
    assert(
      !await eventSocialSchedulerRequestHasExactEmptyJson(request(body)),
      `non-empty scheduler contract was accepted: ${body}`,
    );
  }
  assert(
    !await eventSocialSchedulerRequestHasExactEmptyJson(
      request("{}", "text/plain"),
    ),
    "wrong content type was accepted",
  );
});

Deno.test("event-social scheduler rejects streamed overflow and invalid UTF-8", async () => {
  const overflow = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(700));
      controller.enqueue(new Uint8Array(700));
      controller.close();
    },
  });
  assert(
    !await eventSocialSchedulerRequestHasExactEmptyJson(request(overflow)),
    "streamed overflow was accepted",
  );

  const invalidUtf8 = new Uint8Array([0x7b, 0xff, 0x7d]);
  assert(
    !await eventSocialSchedulerRequestHasExactEmptyJson(request(invalidUtf8)),
    "invalid UTF-8 was accepted",
  );
});
