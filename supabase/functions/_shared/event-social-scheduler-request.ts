import { readBoundedUtf8RequestBody } from "./bounded-request-body.ts";

const MAX_EVENT_SOCIAL_SCHEDULER_REQUEST_BYTES = 1024;

export async function eventSocialSchedulerRequestHasExactEmptyJson(
  request: Request,
): Promise<boolean> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]
    ?.trim().toLowerCase();
  if (contentType !== "application/json") return false;

  const body = await readBoundedUtf8RequestBody(
    request,
    MAX_EVENT_SOCIAL_SCHEDULER_REQUEST_BYTES,
  );
  if (!body.ok || !body.text) return false;

  try {
    const value = JSON.parse(body.text);
    return Boolean(
      value && typeof value === "object" && !Array.isArray(value) &&
        Object.keys(value).length === 0,
    );
  } catch {
    return false;
  }
}
