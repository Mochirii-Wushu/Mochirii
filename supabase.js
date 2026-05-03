/* supabase.js - public Supabase runtime config and REST helpers */
(() => {
  "use strict";

  if (window.MochiriiSupabase) return;

  const SUPABASE_PROJECT_REF = "deyvmtncimmcinldjyqe";
  const SUPABASE_URL = "https://deyvmtncimmcinldjyqe.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_qbijvHZgclTcpmsheKKjcA_aqCmsxCF";

  const config = Object.freeze({
    projectRef: SUPABASE_PROJECT_REF,
    url: SUPABASE_URL.replace(/\/+$/, ""),
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
  });

  const restUrl = `${config.url}/rest/v1`;

  function getConfig() {
    return {
      ...config,
      restUrl,
      isConfigured: isConfigured(),
    };
  }

  function isConfigured() {
    return [config.projectRef, config.url, config.publishableKey].every(
      (value) => value && !String(value).startsWith("[PASTE_"),
    );
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

  function createResult({ ok, status, statusText, data, error, count }) {
    return {
      ok,
      status,
      statusText,
      data,
      error,
      count,
    };
  }

  function failedResult(error) {
    return Promise.resolve(
      createResult({
        ok: false,
        status: 0,
        statusText: "Client Error",
        data: null,
        error: createError(error),
        count: null,
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

  window.MochiriiSupabase = Object.freeze({
    getConfig,
    insert,
    probe,
    request,
    restUrl,
    select,
    createHeaders,
  });
})();
