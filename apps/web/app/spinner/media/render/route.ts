import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { parseAnimationManifest, type AnimationManifestV1 } from "@/lib/spinner/media-contract";
import {
  mediaCapabilityFromRequest,
  SPINNER_MEDIA_CAPABILITY_HEADER,
} from "@/lib/spinner/replay/request-policy";
import { SPINNER_PRIVATE_RESPONSE_HEADERS } from "@/lib/spinner/session-policy";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MANIFEST_BYTES = 32 * 1_024;
const UPSTREAM_TIMEOUT_MS = 10_000;

function opaqueDenied() {
  return new NextResponse(null, {
    status: 404,
    headers: SPINNER_PRIVATE_RESPONSE_HEADERS,
  });
}

async function authorizedManifest(capability: string): Promise<AnimationManifestV1 | null> {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/reaper-spinner-dispatch`, {
      method: "POST",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        apikey: SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
        [SPINNER_MEDIA_CAPABILITY_HEADER]: capability,
      },
      body: JSON.stringify({ action: "manifest" }),
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const declared = Number(response.headers.get("content-length") || 0);
    if (!Number.isFinite(declared) || declared > MAX_MANIFEST_BYTES) return null;
    const raw = await response.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_MANIFEST_BYTES) return null;
    const payload = JSON.parse(raw) as { data?: { manifest?: unknown } };
    return parseAnimationManifest(payload.data?.manifest);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function filename(drawId: string, extension: "mp4" | "png") {
  return `mochirii-raffle-${drawId}.${extension}`;
}

export async function POST(request: NextRequest) {
  const capability = mediaCapabilityFromRequest(request);
  if (!capability) return opaqueDenied();
  const manifest = await authorizedManifest(capability);
  if (!manifest) return opaqueDenied();

  try {
    // Native libraries and private assets are loaded only after the capability
    // has been independently authorized and its immutable manifest validated.
    const { renderReplayMedia } = await import("@/lib/spinner/replay/render");
    const media = await renderReplayMedia(manifest);
    return new NextResponse(new Uint8Array(media.bytes), {
      status: 200,
      headers: {
        ...SPINNER_PRIVATE_RESPONSE_HEADERS,
        "Content-Disposition": `attachment; filename="${filename(manifest.drawId, media.extension)}"`,
        "Content-Length": String(media.bytes.byteLength),
        "Content-Type": media.contentType,
      },
    });
  } catch {
    return opaqueDenied();
  }
}

export async function GET() { return opaqueDenied(); }
export async function HEAD() { return opaqueDenied(); }
export async function OPTIONS() { return opaqueDenied(); }
export async function DELETE() { return opaqueDenied(); }
export async function PUT() { return opaqueDenied(); }
export async function PATCH() { return opaqueDenied(); }
