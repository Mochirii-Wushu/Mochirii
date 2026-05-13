/* supabase.js - public Supabase runtime config, Auth, REST, and member-gallery helpers */
(() => {
  "use strict";

  if (window.MochiriiSupabase) return;

  const SUPABASE_PROJECT_REF = "deyvmtncimmcinldjyqe";
  const SUPABASE_URL = "https://deyvmtncimmcinldjyqe.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qbijvHZgclTcpmsheKKjcA_aqCmsxCF";
  const DISCORD_GUILD_ID = "1078630751077142608";
  const DISCORD_REQUIRED_ROLE_IDS = ["1468659807736299520", "1078630751077142615"];
  const DISCORD_REQUIRED_ROLE_NAMES = ["Mōchirīī - WWM", "✅Verified"];
  const MEMBER_GALLERY_BUCKET = "member-gallery";
  const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
  const RECENT_VERIFICATION_MS = 7 * 24 * 60 * 60 * 1000;
  const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const SAFE_PROFILE_FIELDS = {
    display_name: { max: 40, min: 2, required: true },
    game_uid: { max: 40 },
    discord_handle: { max: 80 },
    region: { max: 80 },
    timezone: { max: 80 },
    avatar_url: { max: 500 },
    bio: { max: 500 },
  };
  const SUBMISSION_FIELDS = {
    title: 80,
    caption: 300,
    category: 40,
  };

  const config = Object.freeze({
    projectRef: SUPABASE_PROJECT_REF,
    url: SUPABASE_URL.replace(/\/+$/, ""),
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
    discordGuildId: DISCORD_GUILD_ID,
    requiredRoleIds: [...DISCORD_REQUIRED_ROLE_IDS],
    requiredRoleNames: [...DISCORD_REQUIRED_ROLE_NAMES],
    memberGalleryBucket: MEMBER_GALLERY_BUCKET,
    maxUploadBytes: MAX_UPLOAD_BYTES,
    acceptedImageTypes: [...ACCEPTED_IMAGE_TYPES],
    recentVerificationMs: RECENT_VERIFICATION_MS,
  });

  const restUrl = `${config.url}/rest/v1`;
  let client = null;

  function getConfig() {
    return {
      ...config,
      restUrl,
      isConfigured: isConfigured(),
      hasSupabaseJs: hasSupabaseJs(),
    };
  }

  function isConfigured() {
    return [config.projectRef, config.url, config.publishableKey].every(
      (value) => value && !String(value).startsWith("[PASTE_"),
    );
  }

  function hasSupabaseJs() {
    return Boolean(window.supabase?.createClient);
  }

  function getClient() {
    if (client) return client;
    if (!isConfigured() || !hasSupabaseJs()) return null;

    client = window.supabase.createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    return client;
  }

  function requireClient() {
    const instance = getClient();
    if (!instance) {
      throw new Error(
        hasSupabaseJs()
          ? "Supabase public config is not set."
          : "Supabase Auth client is not loaded.",
      );
    }
    return instance;
  }

  function createHeaders(options = {}) {
    const headers = new Headers(options.headers || {});
    const bearerToken = options.accessToken ? String(options.accessToken).trim() : "";

    if (!headers.has("apikey")) headers.set("apikey", config.publishableKey);
    if (bearerToken && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${bearerToken}`);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    if (!options.formBody && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    if (options.prefer && !headers.has("Prefer")) headers.set("Prefer", options.prefer);

    return headers;
  }

  function resolveRestPath(path, query) {
    const restPath = String(path || "").replace(/^\/+/, "");

    if (!isConfigured()) throw new Error("Supabase public config is not set.");
    if (!restPath) throw new Error("Supabase REST path is required.");

    const url = new URL(restPath, `${restUrl}/`);
    const queryString = toQueryString(query);

    if (queryString) {
      url.search = url.search ? `${url.search}&${queryString}` : queryString;
    }

    return url.toString();
  }

  function normalizeBody(body) {
    if (body == null) return { body: undefined, formBody: false };
    if (typeof body === "string") return { body, formBody: false };
    if (typeof FormData !== "undefined" && body instanceof FormData) {
      return { body, formBody: true };
    }
    if (typeof Blob !== "undefined" && body instanceof Blob) return { body, formBody: true };
    if (typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams) {
      return { body, formBody: false };
    }
    if (body instanceof ArrayBuffer) return { body, formBody: true };

    return { body: JSON.stringify(body), formBody: false };
  }

  function toQueryString(query) {
    if (!query) return "";
    if (typeof query === "string") return query.replace(/^\?/, "");
    if (query instanceof URLSearchParams) return query.toString();

    const params = new URLSearchParams();

    Object.entries(query).forEach(([key, value]) => {
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item != null) params.append(key, item);
        });
      } else {
        params.set(key, value);
      }
    });

    return params.toString();
  }

  async function request(path, options = {}) {
    const {
      accessToken,
      body: rawBody,
      headers,
      method = rawBody == null ? "GET" : "POST",
      prefer,
      query,
      ...init
    } = options;

    try {
      const { body, formBody } = normalizeBody(rawBody);
      const response = await fetch(resolveRestPath(path, query), {
        ...init,
        method,
        body,
        headers: createHeaders({ accessToken, headers, formBody, prefer }),
      });
      const payload = await readResponse(response);
      const count = response.headers.get("content-range");

      if (!response.ok) {
        return createResult({
          ok: false,
          status: response.status,
          statusText: response.statusText,
          data: null,
          error: createError(payload, response),
          count,
        });
      }

      return createResult({
        ok: true,
        status: response.status,
        statusText: response.statusText,
        data: payload,
        error: null,
        count,
      });
    } catch (error) {
      return createResult({
        ok: false,
        status: 0,
        statusText: "Network Error",
        data: null,
        error: createError(error),
        count: null,
      });
    }
  }

  async function readResponse(response) {
    const raw = await response.text();

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  function createError(value, response) {
    const fallback = response
      ? `Supabase request failed (${response.status}).`
      : "Supabase request could not be completed.";
    const error =
      value && typeof value === "object" && !(value instanceof Error)
        ? value
        : { message: value?.message || String(value || fallback) };

    return {
      message: error.message || error.error_description || error.error || fallback,
      details: error.details || error,
      hint: error.hint || null,
      code: error.code || null,
    };
  }

  function createResult({ ok, status = 0, statusText = "", data = null, error = null, count = null, message }) {
    return {
      ok,
      status,
      statusText,
      data,
      error,
      message: message || error?.message || null,
      count,
    };
  }

  function okResult(data, message = null) {
    return createResult({
      ok: true,
      status: 200,
      statusText: "OK",
      data,
      error: null,
      count: null,
      message,
    });
  }

  function failedResult(error, data = null) {
    const normalized = createError(error);
    return Promise.resolve(
      createResult({
        ok: false,
        status: 0,
        statusText: "Client Error",
        data,
        error: normalized,
        count: null,
        message: normalized.message,
      }),
    );
  }

  function tablePath(table) {
    const value = String(table || "").trim().replace(/^\/+|\/+$/g, "");

    if (!value) throw new Error("Supabase table name is required.");
    if (!/^[A-Za-z0-9_.-]+$/.test(value)) {
      throw new Error("Supabase table names may only contain letters, numbers, dots, dashes, and underscores.");
    }

    return value
      .split(".")
      .map((part) => encodeURIComponent(part))
      .join(".");
  }

  function select(table, query = {}, options = {}) {
    try {
      const selectQuery =
        typeof query === "string" || query instanceof URLSearchParams
          ? query || "select=*"
          : { select: "*", ...query };

      return request(tablePath(table), {
        ...options,
        method: "GET",
        query: selectQuery,
      });
    } catch (error) {
      return failedResult(error);
    }
  }

  function insert(table, payload, options = {}) {
    try {
      return request(tablePath(table), {
        ...options,
        method: "POST",
        body: payload,
        prefer: options.prefer || "return=representation",
      });
    } catch (error) {
      return failedResult(error);
    }
  }

  async function probe(options = {}) {
    try {
      if (!isConfigured()) throw new Error("Supabase public config is not set.");

      const response = await fetch(`${restUrl}/`, {
        method: "GET",
        cache: "no-store",
        signal: options.signal,
        headers: createHeaders({ headers: options.headers }),
      });
      const payload = await readResponse(response);

      return {
        ok: response.ok,
        reachable: true,
        status: response.status,
        statusText: response.statusText,
        data: response.ok ? payload : null,
        error: response.ok ? null : createError(payload, response),
      };
    } catch (error) {
      return {
        ok: false,
        reachable: false,
        status: 0,
        statusText: "Network Error",
        data: null,
        error: createError(error),
      };
    }
  }

  async function getSession() {
    try {
      const instance = requireClient();
      const { data, error } = await instance.auth.getSession();
      if (error) return failedResult(error);
      return okResult(data?.session || null);
    } catch (error) {
      return failedResult(error);
    }
  }

  async function getUser() {
    try {
      const instance = requireClient();
      const { data, error } = await instance.auth.getUser();
      if (error) return failedResult(error);
      return okResult(data?.user || null);
    } catch (error) {
      return failedResult(error);
    }
  }

  function onAuthStateChange(callback) {
    try {
      const instance = requireClient();
      const { data, error } = instance.auth.onAuthStateChange((event, session) => {
        if (typeof callback === "function") callback(event, session);
      });
      if (error) {
        return createResult({
          ok: false,
          status: 0,
          statusText: "Client Error",
          data: null,
          error: createError(error),
          count: null,
        });
      }
      return okResult(data);
    } catch (error) {
      return createResult({
        ok: false,
        status: 0,
        statusText: "Client Error",
        data: null,
        error: createError(error),
        count: null,
      });
    }
  }

  function resolveRedirectTo(value) {
    if (value) return new URL(value, window.location.href).href;
    return new URL("./account.html", window.location.href).href;
  }

  async function signInWithDiscord(options = {}) {
    try {
      const instance = requireClient();
      const redirectTo = resolveRedirectTo(options.redirectTo || options.next);
      const { data, error } = await instance.auth.signInWithOAuth({
        provider: "discord",
        options: {
          redirectTo,
          scopes: "identify email",
          ...(options.options || {}),
        },
      });
      if (error) return failedResult(error);
      return okResult(data);
    } catch (error) {
      return failedResult(error);
    }
  }

  async function signOut() {
    try {
      const instance = requireClient();
      const { error } = await instance.auth.signOut();
      if (error) return failedResult(error);
      await renderAuthNavState();
      return okResult(true, "Signed out.");
    } catch (error) {
      return failedResult(error);
    }
  }

  async function getCurrentProfile() {
    try {
      const instance = requireClient();
      const userResult = await getUser();
      const user = userResult.data;
      if (!userResult.ok || !user) {
        return createResult({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          data: null,
          error: createError("Sign in before loading your profile."),
          count: null,
        });
      }

      const { data, error, status, statusText } = await instance
        .from("member_profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        return createResult({
          ok: false,
          status,
          statusText,
          data: null,
          error: createError(error),
          count: null,
        });
      }

      return okResult(data);
    } catch (error) {
      return failedResult(error);
    }
  }

  function cleanProfilePayload(payload = {}) {
    const clean = {};

    Object.entries(SAFE_PROFILE_FIELDS).forEach(([key, rules]) => {
      if (!Object.hasOwn(payload, key)) return;
      const raw = payload[key];
      const value = typeof raw === "string" ? raw.trim() : raw == null ? "" : String(raw).trim();

      if (!value) {
        if (rules.required) throw new Error("Display name is required.");
        clean[key] = null;
        return;
      }

      if (rules.min && value.length < rules.min) {
        throw new Error("Display name must be at least 2 characters.");
      }
      if (value.length > rules.max) {
        throw new Error(`${fieldLabel(key)} must be ${rules.max} characters or fewer.`);
      }

      clean[key] = value;
    });

    return clean;
  }

  function cleanSubmissionMetadata(metadata = {}) {
    const clean = {};

    Object.entries(SUBMISSION_FIELDS).forEach(([key, max]) => {
      if (!Object.hasOwn(metadata, key)) return;
      const value = String(metadata[key] ?? "").trim();
      if (!value) return;
      if (value.length > max) throw new Error(`${fieldLabel(key)} must be ${max} characters or fewer.`);
      clean[key] = value;
    });

    return clean;
  }

  function fieldLabel(key) {
    return String(key || "")
      .replaceAll("_", " ")
      .replace(/^\w/, (letter) => letter.toUpperCase());
  }

  async function updateCurrentProfile(payload = {}) {
    try {
      const instance = requireClient();
      const userResult = await getUser();
      const user = userResult.data;
      if (!userResult.ok || !user) throw new Error("Sign in before updating your profile.");

      const clean = cleanProfilePayload(payload);
      if (!Object.keys(clean).length) throw new Error("No editable profile fields were provided.");

      const { data, error, status, statusText } = await instance
        .from("member_profiles")
        .update(clean)
        .eq("id", user.id)
        .select("*")
        .maybeSingle();

      if (error) {
        return createResult({
          ok: false,
          status,
          statusText,
          data: null,
          error: createError(error),
          count: null,
        });
      }

      await renderAuthNavState();
      return okResult(data, "Profile saved.");
    } catch (error) {
      return failedResult(error);
    }
  }

  async function parseFunctionError(error) {
    const context = error?.context;
    if (!context || typeof context.json !== "function") return null;

    try {
      return await context.json();
    } catch {
      return null;
    }
  }

  async function verifyDiscordMembership() {
    try {
      const instance = requireClient();
      const { data, error } = await instance.functions.invoke("verify-discord-member", {
        body: {},
      });

      if (error) {
        const payload = await parseFunctionError(error);
        return createResult({
          ok: false,
          status: error.context?.status || 0,
          statusText: error.context?.statusText || "Function Error",
          data: payload,
          error: createError(payload || error),
          count: null,
          message: payload?.message || error.message || "Discord verification failed.",
        });
      }

      await renderAuthNavState();
      return okResult(data, data?.message || null);
    } catch (error) {
      return failedResult(error);
    }
  }

  function isRecentVerification(value) {
    if (!value) return false;
    const time = new Date(value).getTime();
    return Number.isFinite(time) && Date.now() - time <= RECENT_VERIFICATION_MS;
  }

  function profileHasVerifiedRoles(profile) {
    return Boolean(profile?.has_required_discord_roles && isRecentVerification(profile?.discord_verified_at));
  }

  function profileIsActive(profile) {
    return Boolean(profileHasVerifiedRoles(profile) && profile?.member_status === "active");
  }

  async function requireAuth(options = {}) {
    const userResult = await getUser();
    const user = userResult.data;

    if (userResult.ok && user) return okResult({ user });

    if (options.redirect) {
      const target = options.redirectTo || "./auth.html";
      window.location.href = new URL(target, window.location.href).href;
    }

    return createResult({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      data: { user: null, profile: null },
      error: createError(options.message || "Sign in with Discord first."),
      count: null,
    });
  }

  async function requireVerifiedGuildMember(options = {}) {
    const auth = await requireAuth(options);
    if (!auth.ok) return auth;

    if (options.refresh) await verifyDiscordMembership();

    const profileResult = await getCurrentProfile();
    const profile = profileResult.data;
    if (!profileResult.ok || !profile || !profileHasVerifiedRoles(profile)) {
      return createResult({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        data: { user: auth.data.user, profile },
        error: createError("Discord membership and both required roles must be verified first."),
        count: null,
      });
    }

    return okResult({ user: auth.data.user, profile });
  }

  async function requireActiveMember(options = {}) {
    const verified = await requireVerifiedGuildMember(options);
    const profile = verified.data?.profile;

    if (!verified.ok) return verified;
    if (profile?.member_status !== "active") {
      return createResult({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        data: verified.data,
        error: createError("Your website member status must be active before uploading."),
        count: null,
      });
    }

    return verified;
  }

  function setHidden(selector, hidden) {
    document.querySelectorAll(selector).forEach((el) => {
      el.hidden = hidden;
      el.setAttribute("aria-hidden", hidden ? "true" : "false");
    });
  }

  async function renderAuthNavState() {
    let signedIn = false;
    let activeVerified = false;

    try {
      const sessionResult = await getSession();
      signedIn = Boolean(sessionResult.ok && sessionResult.data?.user);

      if (signedIn) {
        const profileResult = await getCurrentProfile();
        activeVerified = Boolean(profileResult.ok && profileIsActive(profileResult.data));
      }
    } catch {
      signedIn = false;
      activeVerified = false;
    }

    setHidden("[data-auth-signed-out]", signedIn);
    setHidden("[data-auth-signed-in]", !signedIn);
    setHidden("[data-auth-verified]", !activeVerified);

    return okResult({ signedIn, activeVerified });
  }

  function extensionFromFile(file) {
    const fromName = String(file?.name || "")
      .split(".")
      .pop()
      ?.toLowerCase();

    if (["jpg", "jpeg", "png", "webp"].includes(fromName)) {
      return fromName === "jpg" ? "jpeg" : fromName;
    }
    if (file?.type === "image/png") return "png";
    if (file?.type === "image/webp") return "webp";
    return "jpeg";
  }

  function safeFilenamePart(name) {
    const base = String(name || "gallery-image")
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    return base || "gallery-image";
  }

  function buildStoragePath(userId, file) {
    const randomPart =
      typeof window.crypto?.randomUUID === "function"
        ? window.crypto.randomUUID()
        : Math.random().toString(36).slice(2, 12);
    const extension = extensionFromFile(file);
    const filename = `${Date.now()}-${randomPart}-${safeFilenamePart(file?.name)}.${extension}`;

    return `${userId}/${filename}`;
  }

  function validateGalleryFile(file) {
    if (!file) throw new Error("Choose an image file before uploading.");
    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Upload a JPEG, PNG, or WebP image.");
    }
    if (file.size <= 0) throw new Error("The selected file is empty.");
    if (file.size > MAX_UPLOAD_BYTES) throw new Error("Images must be 50 MB or smaller.");
  }

  async function uploadMemberGalleryImage(file, metadata = {}) {
    try {
      const instance = requireClient();
      validateGalleryFile(file);

      const access = await requireActiveMember({ refresh: true });
      if (!access.ok) return access;

      const user = access.data.user;
      const storagePath = buildStoragePath(user.id, file);
      const { data: uploadData, error: uploadError } = await instance.storage
        .from(MEMBER_GALLERY_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) return failedResult(uploadError);

      const cleanMetadata = cleanSubmissionMetadata(metadata);
      const row = {
        user_id: user.id,
        storage_bucket: MEMBER_GALLERY_BUCKET,
        storage_path: storagePath,
        original_filename: String(file.name || "gallery-image").slice(0, 255),
        mime_type: file.type,
        size_bytes: file.size,
        ...cleanMetadata,
      };

      const { data: submission, error: insertError } = await instance
        .from("gallery_submissions")
        .insert(row)
        .select("*")
        .single();

      if (insertError) {
        await instance.storage.from(MEMBER_GALLERY_BUCKET).remove([storagePath]).catch(() => {});
        return failedResult(insertError, { upload: uploadData, storagePath });
      }

      return okResult({
        upload: uploadData,
        submission,
      }, "Image submitted for moderation.");
    } catch (error) {
      return failedResult(error);
    }
  }

  async function listMyGallerySubmissions() {
    try {
      const instance = requireClient();
      const auth = await requireAuth();
      if (!auth.ok) return auth;

      const { data, error, status, statusText } = await instance
        .from("gallery_submissions")
        .select("id,storage_bucket,storage_path,original_filename,mime_type,size_bytes,title,caption,category,status,rejection_reason,reviewed_at,created_at,updated_at")
        .eq("user_id", auth.data.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return createResult({
          ok: false,
          status,
          statusText,
          data: null,
          error: createError(error),
          count: null,
        });
      }

      return okResult(Array.isArray(data) ? data : []);
    } catch (error) {
      return failedResult(error);
    }
  }

  window.MochiriiSupabase = Object.freeze({
    getConfig,
    getClient,
    getSession,
    getUser,
    onAuthStateChange,
    signInWithDiscord,
    signOut,
    getCurrentProfile,
    updateCurrentProfile,
    verifyDiscordMembership,
    requireAuth,
    requireVerifiedGuildMember,
    requireActiveMember,
    renderAuthNavState,
    uploadMemberGalleryImage,
    listMyGallerySubmissions,
    request,
    select,
    insert,
    probe,
    restUrl,
    createHeaders,
  });
})();
