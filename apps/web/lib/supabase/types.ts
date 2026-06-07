import type { Session, User } from "@supabase/supabase-js";

export type JsonRecord = Record<string, unknown>;

export type ResultError = {
  message: string;
  details?: unknown;
  hint?: string | null;
  code?: string | null;
};

export type SupabaseResult<T> = {
  ok: boolean;
  status: number;
  statusText: string;
  data: T | null;
  error: ResultError | null;
  message: string | null;
  count?: string | null;
};

export type AuthUserResult = {
  user: User;
};

export type AuthSessionResult = {
  session: Session | null;
};

export type MemberStatus = "pending" | "active" | "suspended" | "archived";

export type MemberProfile = {
  id: string;
  discord_user_id?: string | null;
  discord_username?: string | null;
  discord_global_name?: string | null;
  discord_avatar_url?: string | null;
  discord_roles?: string[] | null;
  has_required_discord_roles?: boolean | null;
  discord_member_pending?: boolean | null;
  discord_verified_at?: string | null;
  discord_checked_at?: string | null;
  display_name?: string | null;
  game_uid?: string | null;
  discord_handle?: string | null;
  region?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  member_status?: MemberStatus | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type EditableProfilePayload = {
  display_name?: string | null;
  game_uid?: string | null;
  discord_handle?: string | null;
  region?: string | null;
  timezone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
};

export type GallerySubmission = {
  id: string;
  user_id?: string | null;
  storage_bucket?: string | null;
  storage_path?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  status?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  submission_source?: string | null;
  discord_guild_id?: string | null;
  discord_channel_id?: string | null;
  discord_message_id?: string | null;
  discord_attachment_id?: string | null;
  discord_user_id?: string | null;
  instagram_opt_in?: boolean | null;
  instagram_opt_in_at?: string | null;
  instagram_opt_in_source?: string | null;
  instagram_opt_in_copy_version?: string | null;
};

export type GallerySubmissionMetadata = {
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  instagramOptIn?: boolean | null;
};

export type VerificationResponse = {
  verified?: boolean;
  hasGuildMembership?: boolean;
  hasRequiredRoles?: boolean;
  pending?: boolean;
  missingRoleIds?: string[];
  memberStatus?: string;
  message?: string;
};

export type ModerationStatus = "pending" | "approved" | "rejected" | "archived";

export type GalleryModerationEvent = {
  id?: string | null;
  action?: string | null;
  reason?: string | null;
  createdAt?: string | null;
  moderator?: {
    displayName?: string | null;
    discordUsername?: string | null;
    discordGlobalName?: string | null;
    discordUserId?: string | null;
  } | null;
};

export type GalleryReviewSubmission = {
  id?: string | null;
  status?: string | null;
  source?: string | null;
  discord?: {
    guildId?: string | null;
    channelId?: string | null;
    messageId?: string | null;
    attachmentId?: string | null;
    userId?: string | null;
  } | null;
  uploader?: {
    displayName?: string | null;
    discordUsername?: string | null;
    discordGlobalName?: string | null;
    discordUserId?: string | null;
  } | null;
  reviewer?: JsonRecord | null;
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  createdAt?: string | null;
  reviewedAt?: string | null;
  updatedAt?: string | null;
  rejectionReason?: string | null;
  storageBucket?: string | null;
  storagePath?: string | null;
  signedPreviewUrl?: string | null;
  previewError?: string | null;
  instagramOptIn?: boolean | null;
  instagramOptInAt?: string | null;
  instagramOptInSource?: string | null;
  instagramOptInCopyVersion?: string | null;
  moderationEvents?: GalleryModerationEvent[];
};

export type GalleryReviewQueue = {
  submissions: GalleryReviewSubmission[];
  count?: number;
  status?: string;
  signedUrlSeconds?: number;
  summary?: Record<string, number | string | undefined>;
};

export type InstagramPublishJobStatus = "queued" | "ineligible" | "publishing" | "published" | "failed" | "canceled";

export type InstagramPublishEvent = {
  id?: string | null;
  action?: string | null;
  createdAt?: string | null;
  actor?: {
    displayName?: string | null;
    discordUsername?: string | null;
    discordGlobalName?: string | null;
    discordUserId?: string | null;
  } | null;
};

export type InstagramPublishJob = {
  id?: string | null;
  status?: InstagramPublishJobStatus | string | null;
  eligibilityReason?: string | null;
  caption?: string | null;
  altText?: string | null;
  instagramMediaId?: string | null;
  instagramPermalink?: string | null;
  lastError?: string | null;
  attemptCount?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  publishedAt?: string | null;
  signedPreviewUrl?: string | null;
  previewError?: string | null;
  submission?: GalleryReviewSubmission | null;
  events?: InstagramPublishEvent[];
};

export type InstagramPublishQueue = {
  jobs: InstagramPublishJob[];
  count?: number;
  status?: string;
  signedUrlSeconds?: number;
  summary?: Record<string, number | string | undefined>;
};

export type ApprovedGallerySubmission = {
  id?: string | null;
  title?: string | null;
  caption?: string | null;
  category?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
  reviewed_at?: string | null;
  uploader_display_name?: string | null;
  uploader_discord_name?: string | null;
  signed_url?: string | null;
  preview_error?: string | null;
};

export type ApprovedGalleryFeed = {
  submissions: ApprovedGallerySubmission[];
  count?: number;
  signedUrlSeconds?: number;
};

export function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function text(value: unknown, fallback = "") {
  const clean = String(value ?? "").trim();
  return clean || fallback;
}

export function createError(value: unknown, fallback = "Supabase request could not be completed."): ResultError {
  if (value instanceof Error) return { message: value.message || fallback, details: value };
  const record = asRecord(value);
  const message =
    text(record.message) ||
    text(record.error_description) ||
    text(record.error) ||
    (typeof value === "string" ? text(value) : "") ||
    fallback;

  return {
    message,
    details: Object.keys(record).length ? record : value,
    hint: text(record.hint) || null,
    code: text(record.code) || null,
  };
}

export function createResult<T>({
  ok,
  status = 0,
  statusText = "",
  data = null,
  error = null,
  count = null,
  message,
}: {
  ok: boolean;
  status?: number;
  statusText?: string;
  data?: T | null;
  error?: ResultError | null;
  count?: string | null;
  message?: string | null;
}): SupabaseResult<T> {
  return {
    ok,
    status,
    statusText,
    data,
    error,
    count,
    message: message ?? error?.message ?? null,
  };
}

export function okResult<T>(data: T, message: string | null = null): SupabaseResult<T> {
  return createResult({
    ok: true,
    status: 200,
    statusText: "OK",
    data,
    error: null,
    message,
  });
}

export function failedResult<T = null>(error: unknown, data: T | null = null): SupabaseResult<T> {
  const normalized = createError(error);
  return createResult({
    ok: false,
    status: 0,
    statusText: "Client Error",
    data,
    error: normalized,
    message: normalized.message,
  });
}
