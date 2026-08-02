import {
  enabledEventSocialDestinations,
  eventSocialClaimIsValid,
  eventSocialInstagramPreparationClaimIsValid,
  type EventSocialProviderConfig,
  prepareEventSocialInstagramJob,
  publishEventSocialJob,
} from "./event-social-publishing.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const baseJob = {
  id: "11111111-1111-4111-8111-111111111111",
  occurrence_id: "22222222-2222-4222-8222-222222222222",
  destination: "facebook_page" as const,
  message: "Guild Gathering begins in one hour — what should we cover?",
  alt_text: "Mōchirīī Monthly Guild Gathering reminder artwork.",
  media_path: "/assets/img/events/guild-gathering.jpg",
  media_sha256:
    "d59386e0ae435e292fbe0ebcdb954b75ed5fb3922091277cb19f798fc5d50718",
  approval_mode: "template" as const,
  template_id: "33333333-3333-4333-8333-333333333333",
  template_revision: "b".repeat(64),
  source_event_id: "monthly-gathering",
  title: "Monthly Guild Gathering",
  starts_at: "2026-08-05T13:30:00.000Z",
  publish_at: "2026-08-05T12:30:00.000Z",
};

const config: EventSocialProviderConfig = {
  facebook: {
    ready: true,
    appSecret: "secret",
    pageId: "1234567890123456",
    accessToken: "token",
  },
  instagram: {
    ready: true,
    appSecret: "secret",
    accountId: "2234567890123456",
    accessToken: "token",
  },
  discord: {
    ready: true,
    guildId: "1078630751077142608",
    channelId: "3234567890123456",
    botToken: "token",
  },
};

Deno.test("claimed event publication rejects URLs and destination-invalid media", () => {
  assert(eventSocialClaimIsValid(baseJob), "valid Facebook job rejected");
  assert(
    !eventSocialClaimIsValid({ ...baseJob, message: "Visit mochirii.com" }),
    "link passed",
  );
  assert(
    !eventSocialClaimIsValid({ ...baseJob, media_path: "/assets/post.png" }),
    "Meta PNG passed",
  );
  assert(
    !eventSocialClaimIsValid({
      ...baseJob,
      destination: "instagram",
      alt_text: null,
    }),
    "Instagram job without alt text passed",
  );
});

Deno.test("destination activation requires independent exact flags and provider readiness", () => {
  const names = [
    "EVENT_FACEBOOK_PAGE_PUBLISH_ENABLED",
    "EVENT_INSTAGRAM_PUBLISH_ENABLED",
    "EVENT_DISCORD_PUBLISH_ENABLED",
    "FACEBOOK_PAGE_PUBLISH_ENABLED",
    "INSTAGRAM_PUBLISH_ENABLED",
  ];
  const prior = new Map(names.map((name) => [name, Deno.env.get(name)]));
  try {
    for (const name of names) Deno.env.set(name, "false");
    assert(
      enabledEventSocialDestinations(config).length === 0,
      "disabled destination activated",
    );
    Deno.env.set("EVENT_FACEBOOK_PAGE_PUBLISH_ENABLED", "true");
    assert(
      enabledEventSocialDestinations(config).length === 0,
      "global Facebook lock was bypassed",
    );
    Deno.env.set("FACEBOOK_PAGE_PUBLISH_ENABLED", "true");
    assert(
      enabledEventSocialDestinations(config).join(",") === "facebook_page",
      "Facebook did not activate independently",
    );
    Deno.env.set("EVENT_DISCORD_PUBLISH_ENABLED", "true");
    assert(
      enabledEventSocialDestinations(config).includes("discord"),
      "Discord did not activate independently",
    );
  } finally {
    for (const [name, value] of prior) {
      if (value == null) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
});

Deno.test("Facebook uses Graph v26 once and reconciles ambiguous mutation responses", async () => {
  const paths: string[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = new URL(String(input));
    if (url.origin === "https://mochirii.com") {
      return Promise.resolve(
        new Response("asset", {
          status: 200,
          headers: { "content-type": "image/jpeg" },
        }),
      );
    }
    paths.push(url.pathname);
    if (url.pathname.endsWith("/1234567890123456")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: "1234567890123456",
            tasks: ["CREATE_CONTENT"],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    }
    if (url.pathname.endsWith("/photos")) {
      const body = init?.body;
      assert(body instanceof URLSearchParams, "Facebook photo body drifted");
      assert(
        body.get("alt_text_custom") === baseJob.alt_text,
        "Facebook custom alt text was omitted or changed",
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ error: { type: "temporary" } }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
  };
  const result = await publishEventSocialJob(baseJob, config, { fetchImpl });
  assert(
    result.outcome === "reconcile_required",
    "ambiguous Facebook response was retried or failed",
  );
  assert(paths.length === 2, "Facebook mutation was attempted more than once");
  assert(
    paths.every((path) => path.startsWith("/v26.0/")),
    "Graph version floated",
  );
  assert(
    paths.some((path) => path.endsWith("/photos")),
    "Page photo endpoint was not used",
  );
  assert(
    paths.every((path) => !path.includes("group")),
    "Groups API path was used",
  );
});

Deno.test("Facebook publishes only after the returned photo and Page post both verify", async () => {
  const photoId = "4234567890123456";
  const postId = "5234567890123456";
  const postPermalink =
    `https://www.facebook.com/${config.facebook.pageId}/posts/${postId}`;
  const graphObjectPaths: string[] = [];
  const result = await publishEventSocialJob(baseJob, config, {
    fetchImpl: (input) => {
      const url = new URL(String(input));
      if (url.origin === "https://mochirii.com") {
        return Promise.resolve(
          new Response("asset", {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        );
      }
      if (url.pathname.endsWith(`/${config.facebook.pageId}`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: config.facebook.pageId,
              tasks: ["CREATE_CONTENT"],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.pathname.endsWith("/photos")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: photoId, post_id: postId }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      graphObjectPaths.push(url.pathname);
      if (url.pathname.endsWith(`/${photoId}`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: photoId,
              from: { id: config.facebook.pageId },
              link: `https://www.facebook.com/photo.php?fbid=${photoId}`,
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: postId,
            from: { id: config.facebook.pageId },
            permalink_url: postPermalink,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    },
  });

  assert(
    result.outcome === "published",
    "verified Page post was not published",
  );
  assert(result.providerPrimaryId === photoId, "Facebook photo id drifted");
  assert(result.providerSecondaryId === postId, "Facebook post id drifted");
  assert(
    result.providerPermalink === postPermalink,
    "canonical Page post permalink was not retained",
  );
  assert(
    graphObjectPaths.some((path) => path.endsWith(`/${photoId}`)) &&
      graphObjectPaths.some((path) => path.endsWith(`/${postId}`)),
    "Facebook did not read back both returned objects",
  );
});

Deno.test("Facebook quarantines a returned Page post ownership mismatch", async () => {
  const photoId = "4234567890123456";
  const postId = "5234567890123456";
  const result = await publishEventSocialJob(baseJob, config, {
    fetchImpl: (input) => {
      const url = new URL(String(input));
      if (url.origin === "https://mochirii.com") {
        return Promise.resolve(
          new Response("asset", {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        );
      }
      if (url.pathname.endsWith(`/${config.facebook.pageId}`)) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: config.facebook.pageId,
              tasks: ["CREATE_CONTENT"],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
        );
      }
      if (url.pathname.endsWith("/photos")) {
        return Promise.resolve(
          new Response(JSON.stringify({ id: photoId, post_id: postId }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }
      const isPost = url.pathname.endsWith(`/${postId}`);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            id: isPost ? postId : photoId,
            from: {
              id: isPost ? "9999999999999999" : config.facebook.pageId,
            },
            permalink_url: isPost
              ? `https://www.facebook.com/9999999999999999/posts/${postId}`
              : `https://www.facebook.com/photo.php?fbid=${photoId}`,
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      );
    },
  });

  assert(
    result.outcome === "reconcile_required",
    "mismatched Page post ownership did not quarantine the job",
  );
  assert(result.providerPrimaryId === photoId, "Facebook photo id was lost");
  assert(result.providerSecondaryId === postId, "Facebook post id was lost");
  assert(
    result.failureCategory === "facebook_ownership_unverified",
    "Facebook ownership mismatch category drifted",
  );
});

Deno.test("Discord transport ambiguity is never automatically retried", async () => {
  let providerCalls = 0;
  const result = await publishEventSocialJob(
    {
      ...baseJob,
      destination: "discord",
      media_path: "/assets/img/events/guild-gathering.png",
    },
    config,
    {
      fetchImpl: (input, init) => {
        const url = new URL(String(input));
        if (url.origin === "https://mochirii.com") {
          return Promise.resolve(
            new Response("asset", {
              status: 200,
              headers: { "content-type": "image/png" },
            }),
          );
        }
        providerCalls += 1;
        assert(
          init?.body instanceof FormData,
          "Discord did not receive multipart form data",
        );
        const payload = JSON.parse(String(init.body.get("payload_json")));
        assert(
          payload.embeds === undefined,
          "Discord payload used a public image embed",
        );
        assert(
          payload.allowed_mentions?.parse?.length === 0,
          "Discord mentions were not suppressed",
        );
        assert(
          payload.attachments?.[0]?.filename === "guild-gathering.png",
          "attachment metadata drifted",
        );
        assert(
          payload.attachments?.[0]?.description === baseJob.alt_text,
          "Discord attachment description drifted",
        );
        assert(
          init.body.get("files[0]") instanceof Blob,
          "Discord file was not attached",
        );
        throw new TypeError("network lost");
      },
    },
  );
  assert(
    result.outcome === "reconcile_required",
    "Discord ambiguity did not reconcile",
  );
  assert(providerCalls === 1, "Discord mutation was retried");
});

Deno.test("Discord accepts only the exact uploaded attachment identity", async () => {
  let providerCalls = 0;
  const result = await publishEventSocialJob(
    {
      ...baseJob,
      destination: "discord",
      alt_text: "Guild reminder artwork",
      media_path: "/assets/img/events/guild-gathering.png",
    },
    config,
    {
      fetchImpl: (input) => {
        const url = new URL(String(input));
        if (url.origin === "https://mochirii.com") {
          return Promise.resolve(
            new Response("asset", {
              status: 200,
              headers: { "content-type": "image/png" },
            }),
          );
        }
        providerCalls += 1;
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: "4234567890123456",
              channel_id: config.discord.channelId,
              attachments: [{
                id: "5234567890123456",
                filename: "guild-gathering.png",
                description: "Wrong description",
                content_type: "image/png",
                size: 5,
              }],
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
        );
      },
    },
  );
  assert(
    result.outcome === "reconcile_required",
    "attachment description drift passed",
  );
  assert(providerCalls === 1, "Discord identity ambiguity was retried");
});

Deno.test("template asset mismatch fails before provider mutation and requests invalidation", async () => {
  let providerCalls = 0;
  const result = await publishEventSocialJob(
    {
      ...baseJob,
      approval_mode: "template",
      template_id: "33333333-3333-4333-8333-333333333333",
      template_revision: "b".repeat(64),
      media_sha256: "c".repeat(64),
    },
    config,
    {
      fetchImpl: (input) => {
        const url = new URL(String(input));
        if (url.origin !== "https://mochirii.com") providerCalls += 1;
        return Promise.resolve(
          new Response("asset", {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        );
      },
    },
  );
  assert(result.outcome === "failed", "asset mismatch was not rejected");
  assert(
    result.invalidateTemplate === true,
    "template invalidation was not requested",
  );
  assert(
    result.failureCategory === "template_media_attestation_mismatch",
    "asset mismatch category drifted",
  );
  assert(
    providerCalls === 0,
    "provider mutation occurred after asset mismatch",
  );
});

Deno.test("Instagram container creation is one staged mutation without in-invocation polling", async () => {
  const preparationJob = {
    ...baseJob,
    destination: "instagram" as const,
    media_path: "/assets/img/events/guild-gathering.jpg",
    preparation_action: "create" as const,
    provider_secondary_id: null,
    preparation_fingerprint: null,
  };
  assert(
    eventSocialInstagramPreparationClaimIsValid(preparationJob),
    "valid Instagram creation claim rejected",
  );
  let containerMutations = 0;
  let statusReads = 0;
  let mutationGates = 0;
  const result = await prepareEventSocialInstagramJob(
    preparationJob,
    config.instagram,
    {
      beforeMutation: (stage) => {
        assert(stage === "instagram_container", "wrong preparation gate used");
        mutationGates += 1;
        return Promise.resolve(true);
      },
      fetchImpl: (input, init) => {
        const url = new URL(String(input));
        if (url.origin === "https://mochirii.com") {
          return Promise.resolve(
            new Response("asset", {
              status: 200,
              headers: { "content-type": "image/jpeg" },
            }),
          );
        }
        if (url.pathname.endsWith(`/${config.instagram.accountId}`)) {
          return Promise.resolve(Response.json({
            id: config.instagram.accountId,
            username: "mochirii_guild",
            account_type: "BUSINESS",
          }));
        }
        if (url.pathname.endsWith("/content_publishing_limit")) {
          return Promise.resolve(
            Response.json({
              data: [{ quota_usage: 1, config: { quota_total: 50 } }],
            }),
          );
        }
        if (
          url.pathname.endsWith(`/${config.instagram.accountId}/media`) &&
          init?.method === "POST"
        ) {
          containerMutations += 1;
          return Promise.resolve(Response.json({ id: "7234567890123456" }));
        }
        statusReads += 1;
        return Promise.resolve(Response.json({ id: "unexpected" }));
      },
    },
  );
  assert(result.outcome === "container_created", "container was not staged");
  assert(containerMutations === 1, "container mutation was not exactly once");
  assert(mutationGates === 1, "container mutation gate was not exactly once");
  assert(statusReads === 0, "container was polled in the creation invocation");
});

Deno.test("Instagram container creation ambiguity fails without disabling publication reconciliation", async () => {
  const preparationJob = {
    ...baseJob,
    destination: "instagram" as const,
    media_path: "/assets/img/events/guild-gathering.jpg",
    preparation_action: "create" as const,
    provider_secondary_id: null,
    preparation_fingerprint: null,
  };
  let containerMutations = 0;
  const result = await prepareEventSocialInstagramJob(
    preparationJob,
    config.instagram,
    {
      beforeMutation: () => Promise.resolve(true),
      fetchImpl: (input, init) => {
        const url = new URL(String(input));
        if (url.origin === "https://mochirii.com") {
          return Promise.resolve(
            new Response("asset", {
              status: 200,
              headers: { "content-type": "image/jpeg" },
            }),
          );
        }
        if (url.pathname.endsWith(`/${config.instagram.accountId}`)) {
          return Promise.resolve(Response.json({
            id: config.instagram.accountId,
            username: "mochirii_guild",
            account_type: "BUSINESS",
          }));
        }
        if (url.pathname.endsWith("/content_publishing_limit")) {
          return Promise.resolve(Response.json({
            data: [{ quota_usage: 1, config: { quota_total: 50 } }],
          }));
        }
        if (
          url.pathname.endsWith(`/${config.instagram.accountId}/media`) &&
          init?.method === "POST"
        ) {
          containerMutations += 1;
          return Promise.resolve(Response.json({ error: {} }, { status: 500 }));
        }
        throw new Error(`Unexpected test URL: ${url}`);
      },
    },
  );
  assert(
    result.outcome === "failed",
    "non-public container ambiguity reconciled",
  );
  assert(
    result.failureCategory === "instagram_container_creation_ambiguous",
    "container ambiguity category drifted",
  );
  assert(containerMutations === 1, "container mutation was retried");
});

Deno.test("Instagram readiness polling is one read per scheduler invocation", async () => {
  const containerId = "7234567890123456";
  const preparationJob = {
    ...baseJob,
    destination: "instagram" as const,
    media_path: "/assets/img/events/guild-gathering.jpg",
    preparation_action: "poll" as const,
    provider_secondary_id: containerId,
    preparation_fingerprint: "d".repeat(64),
  };
  let reads = 0;
  const result = await prepareEventSocialInstagramJob(
    preparationJob,
    config.instagram,
    {
      beforeMutation: () => {
        throw new Error("poll attempted a mutation");
      },
      fetchImpl: () => {
        reads += 1;
        return Promise.resolve(
          Response.json({ id: containerId, status_code: "FINISHED" }),
        );
      },
    },
  );
  assert(result.outcome === "prepared", "finished container was not prepared");
  assert(reads === 1, "poll invocation performed more than one status read");
});

Deno.test("Instagram final publication reuses the prepared container behind one final gate", async () => {
  const containerId = "7234567890123456";
  const mediaId = "8234567890123456";
  const instagramJob = {
    ...baseJob,
    destination: "instagram" as const,
    media_path: "/assets/img/events/guild-gathering.jpg",
    provider_secondary_id: containerId,
    preparation_fingerprint: "e".repeat(64),
  };
  let finalGates = 0;
  let mediaCreates = 0;
  let mediaPublishes = 0;
  const result = await publishEventSocialJob(instagramJob, config, {
    beforeMutation: (stage) => {
      assert(stage === "instagram_publish", "wrong final Instagram gate used");
      finalGates += 1;
      return Promise.resolve(true);
    },
    fetchImpl: (input, init) => {
      const url = new URL(String(input));
      if (url.origin === "https://mochirii.com") {
        return Promise.resolve(
          new Response("asset", {
            status: 200,
            headers: { "content-type": "image/jpeg" },
          }),
        );
      }
      if (url.pathname.endsWith(`/${config.instagram.accountId}`)) {
        return Promise.resolve(Response.json({
          id: config.instagram.accountId,
          username: "mochirii_guild",
          account_type: "BUSINESS",
        }));
      }
      if (url.pathname.endsWith("/content_publishing_limit")) {
        return Promise.resolve(
          Response.json({
            data: [{ quota_usage: 1, config: { quota_total: 50 } }],
          }),
        );
      }
      if (url.pathname.endsWith(`/${containerId}`)) {
        return Promise.resolve(
          Response.json({ id: containerId, status_code: "FINISHED" }),
        );
      }
      if (url.pathname.endsWith("/media_publish")) {
        mediaPublishes += 1;
        return Promise.resolve(Response.json({ id: mediaId }));
      }
      if (
        url.pathname.endsWith(`/${config.instagram.accountId}/media`) &&
        init?.method === "POST"
      ) {
        mediaCreates += 1;
      }
      if (url.pathname.endsWith(`/${mediaId}`)) {
        return Promise.resolve(Response.json({
          id: mediaId,
          owner: { id: config.instagram.accountId },
          username: "mochirii_guild",
          permalink: "https://www.instagram.com/p/Prepared123/",
          media_type: "IMAGE",
        }));
      }
      return Promise.resolve(new Response("{}", { status: 404 }));
    },
  });
  assert(
    result.outcome === "published",
    "prepared Instagram media did not publish",
  );
  assert(finalGates === 1, "final mutation gate was not exactly once");
  assert(mediaPublishes === 1, "media_publish was not exactly once");
  assert(mediaCreates === 0, "final invocation created another container");
});
