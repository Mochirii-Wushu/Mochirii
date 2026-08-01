const PUBLIC = "public";
const OPERATIONAL = "operational";
const INTERNAL = "internal";
const CONFIDENTIAL = "confidential";
const CREDENTIAL = "credential";

const json = (id, when, groups, options = {}) => ({
  id,
  when,
  bodyKind: "json",
  body: null,
  fields: Object.entries(groups).flatMap(([classification, paths]) =>
    paths.map((path) => ({ path, classification }))
  ),
  inheritedContainers: options.inheritedContainers || [],
});

const empty = (id, when) => ({ id, when, bodyKind: "empty", body: null, fields: [], inheritedContainers: [] });
const wholeBody = (classification, dataClass, maximumBytes, rationale) => ({
  classification,
  dataClass,
  maximumBytes,
  rationale,
});
const text = (id, when, classification, dataClass, maximumBytes, rationale) => ({
  id,
  when,
  bodyKind: "text",
  body: wholeBody(classification, dataClass, maximumBytes, rationale),
  fields: [],
  inheritedContainers: [],
});
const binary = (id, when, classification, dataClass, maximumBytes, rationale) => ({
  id,
  when,
  bodyKind: "binary",
  body: wholeBody(classification, dataClass, maximumBytes, rationale),
  fields: [],
  inheritedContainers: [],
});

const error = (id = "failure", when = ["validation, authorization, dependency, or internal failure"]) =>
  json(id, when, { [OPERATIONAL]: ["ok", "error", "message", "status", "revision", "reconcileRequired"] });

const classifiedContainer = (path, classification, dataClass, maximumBytes, rationale) => ({
  path,
  classification,
  dataClass,
  maximumBytes,
  descendants: "inherit",
  rationale,
});

const profileFields = [
  "id", "slug", "displayName", "gameUid", "discordHandle", "region", "timezone", "bio", "guildTitle",
  "avatarUrl", "bannerUrl", "profilePublishedAt", "socialProvider", "socialUsername", "socialProfileUrl", "updatedAt",
];

const publicCycleFields = [
  "cycleStatus", "standardEntryStatus", "bonusEntryStatus", "timezone", "opensAt", "closesAt", "drawAt", "claimEndsAt",
  "publicReward", "baseEntries", "maximumBonusEntries", "maximumEntries", "rulesUrl", "entrantCount", "totalEntryCount",
  "publicResult",
];

const claimStatusFields = [
  "eligibilityState", "eligibilityReasonCode", "optInState", "bonusRows", "totalEntries", "claimState", "fulfillmentState",
  "rewardChoice", "openRewardAvailable", "inGameRewardAvailable", "claimDeadline", "grossPrizeCents", "allInCostCapCents",
];

const metaDiagnosticFields = [
  "provider", "configured", "apiVersion", "publishEnabled", "tokenDebuggerCalled", "tokenDebuggerTransportApproved",
  "tokenBindingVerified", "tokenTypeVerified", "scopesVerified", "expiryVerified", "dataAccessExpiryVerified",
  "tokenExpiryWindow", "dataAccessExpiryWindow", "identityReachable", "identityMatches", "createContentTaskVerified",
  "facebookPageReachable", "facebookPageIdentityMatches", "instagramBusinessAccountPresent",
  "instagramBusinessAccountMatches", "pageToInstagramLinkageVerified", "quotaReadable", "quotaExhausted",
  "businessAccountSubtypeVerification", "ready", "errorCategory", "providerErrorCategory", "checkedAt",
];

const participantFields = ["version", "id", "displayName"];
const spinnerSnapshotFields = [
  "version", "sessionId", "revision", "phase", "drawMode", "participants", "startedAt", "revealAt", "durationMs",
  "startRotation", "finalRotation", "selectedIndex", "winner", "drawId", "updatedAt",
];
const spinnerReceiptFields = [
  "version", "drawMode", "drawId", "timestampIso", "singaporeTime", "appVersion", "algorithmVersion", "rosterSnapshot",
  "rosterHashSha256", "rejectionLimit", "sampledWords", "acceptedWord", "selectedIndex", "winner",
];

const alphaProgressFields = ["authority", "userId", "revision", "state", "sourceRequestId", "lastActionType", "updatedAt"];
const sharedPetFields = ["authority", "petKey", "roomKey", "revision", "state", "sourceRequestId", "lastActorId", "updatedAt"];

export const edgeResponseContractSource = {
  schemaVersion: 1,
  scope: "Repository-source response field and sensitivity contracts for every Supabase Edge Function declared in config.toml.",
  factBoundary: {
    providerFacts: "No hosted behavior is asserted; runtime state requires an authorized provider readback.",
    secretValuesAllowed: false,
    sourceChangePolicy: "Every configured entrypoint and transitive repository-local import is fingerprinted. Drift fails closed until this contract is reviewed and regenerated.",
  },
  classifications: {
    [PUBLIC]: "Safe for unauthenticated public response projection.",
    [OPERATIONAL]: "Bounded status, count, timestamp, or safe error information; no member content or credential.",
    [INTERNAL]: "Provider, moderation, or workflow metadata restricted to an authorized operator or service caller.",
    [CONFIDENTIAL]: "Member identity, guild content, private media, gameplay, claim, or participation data.",
    [CREDENTIAL]: "Short-lived bearer credential returned only by an authenticated private capability endpoint.",
  },
  functions: [
    {
      id: "verify-discord-member",
      states: [
        text("cors-preflight", ["OPTIONS"], OPERATIONAL, "cors_preflight", 256, "Protocol-only CORS acknowledgement with no member data."),
        error(),
        json("discord-membership-unavailable", ["POST when Discord does not return an exact current member result"], {
          [CONFIDENTIAL]: ["verified", "hasGuildMembership", "hasRequiredRoles", "pending", "missingRoleIds[]", "memberStatus"],
          [OPERATIONAL]: ["message"],
        }),
        json("discord-provider-authorization-unavailable", ["POST when the Discord service identity cannot perform the membership lookup; no member evidence is changed"], {
          [CONFIDENTIAL]: ["verified", "hasGuildMembership", "hasRequiredRoles", "pending", "missingRoleIds[]", "memberStatus"],
          [OPERATIONAL]: ["message"],
        }),
        json("verification-result", ["POST verification completed or remains pending"], {
          [CONFIDENTIAL]: ["verified", "hasGuildMembership", "hasRequiredRoles", "pending", "missingRoleIds[]", "memberStatus"],
          [OPERATIONAL]: ["message"],
        }),
      ],
    },
    {
      id: "verify-member-access",
      states: [
        error(),
        json("discord-membership-unavailable", ["POST when the required current Discord refresh is unavailable"], {
          [OPERATIONAL]: ["ok", "message"],
        }),
        json("member-access-result", ["POST current-member access refresh"], {
          [OPERATIONAL]: ["ok", "message", "data.message", "data.next"],
          [CONFIDENTIAL]: [
            "data.galleryEligible", "data.method", "data.memberStatus", "data.discordVerified", "data.manualApproved",
            "data.identities[]", "data.identities[].provider", "data.identities[].providerSubject", "data.identities[].displayLabel",
            "data.identities[].emailVerified", "data.identities[].phoneVerified", "data.identities[].active",
            "data.identities[].lastObservedAt", "data.verification", "data.verification.status", "data.verification.method",
            "data.verification.verifiedAt", "data.verification.expiresAt", "data.verification.reviewedAt",
            "data.verification.reason", "data.profile",
          ],
        }, {
          inheritedContainers: [classifiedContainer(
            "data.profile",
            CONFIDENTIAL,
            "member_verification",
            65536,
            "The current member profile is a bounded server-selected record; all descendant values inherit confidential classification.",
          )],
        }),
      ],
    },
    {
      id: "review-member-verification",
      states: [
        error(),
        json("moderator-review-result", ["POST moderator verification decision"], {
          [OPERATIONAL]: ["ok", "message"],
          [CONFIDENTIAL]: ["data.userId", "data.verification", "data.verification.status", "data.verification.method", "data.verification.verifiedAt", "data.verification.expiresAt", "data.verification.reviewedAt", "data.verification.reason"],
        }),
      ],
    },
    {
      id: "list-gallery-review-queue",
      states: [
        error(),
        json("moderator-queue", ["POST list queue by requested status and page"], {
          [OPERATIONAL]: ["ok", "message", "hasAccess", "data.hasAccess", "data.count", "data.status", "data.summary", "data.thumbnailState", "data.pagination.page", "data.pagination.pageSize", "data.pagination.total", "data.pagination.totalPages", "data.pagination.hasNext", "data.pagination.hasPrevious"],
          [CONFIDENTIAL]: ["data.submissions[]"],
        }, {
          inheritedContainers: [classifiedContainer("data.submissions[]", CONFIDENTIAL, "private_gallery_submission", 524288, "Each queue item is a bounded moderator-only submission/media/audit projection; descendants inherit confidential classification.")],
        }),
      ],
    },
    {
      id: "spinner-live-session",
      states: [
        error(),
        json("viewer-or-controller-snapshot", ["GET active-member viewer snapshot", "GET moderator controller snapshot"], {
          [OPERATIONAL]: ["ok", "data.mode", "data.serverNow"],
          [CONFIDENTIAL]: [
            "data.snapshot", ...spinnerSnapshotFields.map((field) => `data.snapshot.${field}`),
            "data.snapshot.participants[]", ...participantFields.map((field) => `data.snapshot.participants[].${field}`),
            ...participantFields.map((field) => `data.snapshot.winner.${field}`),
            "data.receipt", ...spinnerReceiptFields.map((field) => `data.receipt.${field}`),
            "data.receipt.rosterSnapshot.version", "data.receipt.rosterSnapshot.participants[]",
            ...participantFields.map((field) => `data.receipt.rosterSnapshot.participants[].${field}`),
            ...participantFields.map((field) => `data.receipt.winner.${field}`), "data.commandId",
          ],
        }),
        json("moderator-command-result", ["POST create, replace_roster, spin, reveal, reset, or close"], {
          [OPERATIONAL]: ["ok", "data.serverNow", "data.commandId"],
          [CONFIDENTIAL]: ["data.snapshot", ...spinnerSnapshotFields.map((field) => `data.snapshot.${field}`), "data.receipt", ...spinnerReceiptFields.map((field) => `data.receipt.${field}`)],
        }),
      ],
    },
    {
      id: "moderate-gallery-submission",
      states: [
        error(),
        json("moderation-result", ["POST approve or reject exact submission revision"], {
          [OPERATIONAL]: ["ok", "message", "data.action", "data.warnings[]"],
          [CONFIDENTIAL]: ["data.submission.id", "data.submission.status", "data.submission.title", "data.submission.caption", "data.submission.category", "data.submission.rejectionReason", "data.submission.createdAt", "data.submission.reviewedAt", "data.submission.updatedAt", "data.submission.publicationReady", "data.submission.instagramOptIn", "data.submission.facebookPageOptIn", "data.instagramJob", "data.facebookPageJob"],
        }, {
          inheritedContainers: [
            classifiedContainer("data.instagramJob", CONFIDENTIAL, "instagram_publish_job", 16384, "The safe job helper exposes only reviewed job identifiers and timestamps; descendants inherit confidential classification."),
            classifiedContainer("data.facebookPageJob", CONFIDENTIAL, "facebook_page_publish_job", 16384, "The safe job helper exposes only reviewed job identifiers and timestamps; descendants inherit confidential classification."),
          ],
        }),
      ],
    },
    {
      id: "delete-rejected-gallery-submission",
      states: [error(), json("deleted", ["POST rejected submission deletion"], { [OPERATIONAL]: ["ok", "message", "data.submissionId", "data.removedObjectCount", "data.deletedAt"] })],
    },
    {
      id: "withdraw-gallery-publication-consent",
      states: [error(), json("withdrawal-result", ["POST owner withdraws one destination"], { [OPERATIONAL]: ["ok", "message", "data.action", "data.destination", "data.status", "data.removalRequestCreated", "data.requiresModeratorInspection"] })],
    },
    {
      id: "list-approved-gallery-submissions",
      states: [
        error(),
        json("legacy-approved-list", ["GET or POST legacy approved list"], { [OPERATIONAL]: ["ok", "message", "data.count"], [PUBLIC]: ["data.submissions[]"] }, { inheritedContainers: [classifiedContainer("data.submissions[]", PUBLIC, "public_gallery_media", 524288, "Each item is a reviewed public Gallery projection and all descendants are public.")] }),
        json("public-feed-list", ["GET or POST v2 list"], { [OPERATIONAL]: ["ok", "message", "data.schemaVersion", "data.count", "data.totalEligible", "data.hasMore", "data.nextCursor", "data.cacheSeconds", "data.complete", "data.partial", "data.delivery", "data.deliveryFailures", "data.facets"], [PUBLIC]: ["data.items[]"] }, { inheritedContainers: [classifiedContainer("data.items[]", PUBLIC, "public_gallery_media", 524288, "Each item is a reviewed public Gallery projection and all descendants are public.")] }),
        binary("approved-image", ["GET or POST full or thumbnail media action"], PUBLIC, "approved_gallery_media", 52428800, "Approved public Gallery media is bounded by the stored media-size constraint."),
      ],
    },
    {
      id: "submit-discord-gallery-image",
      states: [
        error(),
        json("submission-created-or-duplicate", ["POST authenticated Discord HMAC submission"], { [OPERATIONAL]: ["ok", "duplicate", "message", "data.submissionId", "data.status", "data.createdAt"], [CONFIDENTIAL]: ["missingRoleIds[]"] }),
      ],
    },
    {
      id: "reaper-discord-interactions",
      states: [
        text("method-or-signature-failure", ["non-POST or invalid Ed25519 signature"], OPERATIONAL, "discord_protocol_error", 256, "Fixed protocol error text contains no member or credential data."),
        empty("deferred-response-body", ["deferred Discord interaction acknowledgement"]),
        json("discord-interaction-protocol", ["PING, command, component, or modal protocol response"], {
          [INTERNAL]: ["type", "data", "data.content", "data.flags", "data.custom_id", "data.title", "data.components[]", "data.components[].type", "data.components[].components[]"],
        }, { inheritedContainers: [classifiedContainer("data.components[].components[]", INTERNAL, "discord_interaction", 32768, "Discord component payloads are fixed by command builders and inherit internal protocol classification.")] }),
      ],
    },
    {
      id: "reaper-spinner-dispatch",
      states: [
        empty("opaque-denied", ["missing or invalid dispatch capability"]),
        error(),
        json("dispatch-summary", ["POST claim and deliver outbox work"], { [OPERATIONAL]: ["ok", "data.claimed", "data.completed", "data.failed", "data.retried", "data.mediaProvisioned", "data.mediaFallbacks", "data.channelKey"], [INTERNAL]: ["data.results[]"] }, { inheritedContainers: [classifiedContainer("data.results[]", INTERNAL, "spinner_media", 131072, "Each result is a bounded dispatch/media outcome; descendants inherit internal classification.")] }),
        json("render-manifest", ["private media render response"], { [OPERATIONAL]: ["ok"], [INTERNAL]: ["data.manifest"] }, { inheritedContainers: [classifiedContainer("data.manifest", INTERNAL, "spinner_media", 131072, "The signed media manifest is private operational metadata; descendants inherit internal classification.")] }),
      ],
    },
    {
      id: "reaper-discord-member-sync",
      states: [error(), json("plan-or-apply-summary", ["POST preview or apply pending-member containment"], { [OPERATIONAL]: ["ok", "status", "targetCount", "conflictCount", "staleRecordCount", "discordWriteCount", "registryWriteCount", "allowedChannelCount", "channelCount"] })],
    },
    {
      id: "send-vote-reminder",
      states: [error(), json("preview-skip-or-send", ["GET preview, duplicate, skip, or send reminder"], { [OPERATIONAL]: ["ok", "message", "preview", "skipped", "duplicate", "voteDate", "linkCount", "channelId", "messageId"], [INTERNAL]: ["payload"] }, { inheritedContainers: [classifiedContainer("payload", INTERNAL, "vote_reminder", 32768, "Preview-only Discord message payload; all descendants inherit internal classification.")] })],
    },
    {
      id: "send-member-spotlight-poll",
      states: [error(), json("preview-duplicate-or-send", ["scheduled preview, duplicate, or send poll"], { [OPERATIONAL]: ["ok", "message", "status", "cycleMonth", "candidateCount", "voteCloseAt", "duplicate", "preview", "channelId", "messageId", "answerLabels[]"], [INTERNAL]: ["payload"] }, { inheritedContainers: [classifiedContainer("payload", INTERNAL, "spotlight_poll", 32768, "Preview-only Discord poll payload; descendants inherit internal classification.")] })],
    },
    {
      id: "publish-member-spotlight-winner",
      states: [error(), json("preview-skip-or-publish", ["scheduled preview, skip, finalize, or publish winner"], { [OPERATIONAL]: ["ok", "message", "preview", "skipped", "finalized", "retry", "cycleMonth", "totalVotes", "voteCount", "tieBreaker"], [CONFIDENTIAL]: ["results[]", "results[].answerLabel", "results[].voteCount", "results[].voterCountVerified", "winnerName"] })],
    },
    {
      id: "get-current-spotlight-winner",
      states: [error(), json("public-current-winner", ["public read"], { [OPERATIONAL]: ["ok"], [PUBLIC]: ["data.winnerName", "data.monthKey", "data.publishedAt", "data.source"] })],
    },
    {
      id: "get-current-raffle",
      states: [
        error(),
        json("public-current-cycle", ["public mode current cycle and official result"], { [OPERATIONAL]: ["ok", "status", "message"], [PUBLIC]: ["data", ...publicCycleFields.map((field) => `data.${field}`), "data.drawEvidence", "data.resultNames", "data.resultNames{}"] }, { inheritedContainers: [classifiedContainer("data.drawEvidence", PUBLIC, "public_raffle_result", 32768, "Only the reviewed public draw evidence projection is returned; descendants inherit public classification.")] }),
        json("member-or-social-leaderboard", ["authenticated member leaderboard", "body-bound Social HMAC leaderboard"], { [OPERATIONAL]: ["ok", "message", "data.asOf", "cycleLabel", "asOf"], [CONFIDENTIAL]: ["data.entries[]", "entries[]", "entries[].rank", "entries[].displayName", "entries[].entries", "entries[].standardEntries", "entries[].bonusEntries"] }, { inheritedContainers: [classifiedContainer("data.entries[]", CONFIDENTIAL, "raffle_member_participation", 262144, "Leaderboard rows are member-only participation projections; descendants inherit confidential classification.")] }),
      ],
    },
    {
      id: "manage-raffle-entry",
      states: [error(), json("status-or-entry-mutation", ["POST status, standard opt-in, bonus entry, or withdrawal"], { [OPERATIONAL]: ["ok", "message"], [CONFIDENTIAL]: ["data.cycle", ...publicCycleFields.map((field) => `data.cycle.${field}`), "data.member"] }, { inheritedContainers: [classifiedContainer("data.member", CONFIDENTIAL, "raffle_member_participation", 65536, "Current-member entry state is a server-owned bounded projection; descendants inherit confidential classification.")] })],
    },
    {
      id: "moderate-raffle",
      states: [
        error(),
        json("moderator-command-result", ["POST configure, open, freeze, draw, eligibility, claim, fulfillment, or readiness command"], { [OPERATIONAL]: ["ok", "message", "data.duplicate", "data.cycleState", "data.reasonCode", "data.entrantCount", "data.totalEntryCount", "data.claimState", "data.taxState", "data.noticeState", "data.fraudState", "data.membershipState", "data.fulfillmentState", "data.allInCostCents", "data.allInCostCapCents", "data.grossPrizeCents", "data.linkGenerationCount", "data.linkGenerationLimit", "data.programState", "data.sponsorVerified", "data.rulesApproved", "data.countriesApproved", "data.privacyApproved", "data.operationsApproved", "data.entriesFrozen", "data.drawRecorded", "data.openClaims", "data.queuedFulfillments", "data.ordersEnabled", "data.fulfillmentReady", "data.auditHealth"], [CONFIDENTIAL]: ["data.drawId", "data.access", "data.cycles[]", "data.taxReviews[]", "data.fulfillmentReadiness[]"] }, { inheritedContainers: [classifiedContainer("data.cycles[]", CONFIDENTIAL, "raffle_draw_claim_and_audit", 262144, "Moderator-only cycle readiness rows inherit confidential classification."), classifiedContainer("data.taxReviews[]", CONFIDENTIAL, "raffle_draw_claim_and_audit", 131072, "Moderator-only tax review rows inherit confidential classification."), classifiedContainer("data.fulfillmentReadiness[]", CONFIDENTIAL, "raffle_reward_fulfillment", 131072, "Moderator-only fulfillment readiness rows inherit confidential classification.")] }),
      ],
    },
    {
      id: "run-raffle-schedule",
      states: [error(), json("schedule-summary", ["authorized schedule tick"], { [OPERATIONAL]: ["ok", "message", "data.opened", "data.frozen", "data.drawn", "data.claimStatesChanged", "data.remindersDue", "data.blocked"] })],
    },
    {
      id: "manage-raffle-claim",
      states: [
        empty("cors-preflight", ["OPTIONS"]),
        error(),
        json("claim-status", ["POST status"], { [OPERATIONAL]: ["ok"], [CONFIDENTIAL]: ["data", ...claimStatusFields.map((field) => `data.${field}`), "data.claimsEnabled", "data.selectedClaimId", "data.availableClaims[]", ...["claimId", "claimState", "fulfillmentState", "rewardChoice", "openRewardAvailable", "inGameRewardAvailable", "claimDeadline", "grossPrizeCents", "allInCostCapCents"].map((field) => `data.availableClaims[].${field}`)] }),
        json("claim-or-decline", ["POST claim", "POST decline"], { [OPERATIONAL]: ["ok"], [CONFIDENTIAL]: ["data", ...claimStatusFields.map((field) => `data.${field}`)] }),
      ],
    },
    {
      id: "run-raffle-fulfillment",
      states: [error(), json("fulfillment-summary", ["authorized fulfillment worker tick"], { [OPERATIONAL]: ["ok", "data.processed", "data.succeeded", "data.deferred", "data.stopped", "data.completionFailures"], [INTERNAL]: ["data.providerEvents", "data.readiness"] }, { inheritedContainers: [classifiedContainer("data.providerEvents", INTERNAL, "raffle_reward_fulfillment", 131072, "Provider event aggregate contains no bearer reward links; descendants inherit internal classification."), classifiedContainer("data.readiness", INTERNAL, "raffle_reward_fulfillment", 65536, "Provider readiness aggregate contains no credentials; descendants inherit internal classification.")] })],
    },
    {
      id: "reward-provider-webhook",
      states: [error(), json("webhook-accepted", ["verified provider event accepted, ignored, or duplicate"], { [OPERATIONAL]: ["ok", "status"] })],
    },
    {
      id: "list-instagram-publish-queue",
      states: [error(), json("moderator-queue", ["POST queue by state and cursor"], { [OPERATIONAL]: ["ok", "message", "data.count", "data.nextCursor", "data.pageSize", "data.status", "data.summary"], [CONFIDENTIAL]: ["data.items[]"] }, { inheritedContainers: [classifiedContainer("data.items[]", CONFIDENTIAL, "instagram_publish_job", 524288, "Each queue item is a bounded safe job/submission/event projection; descendants inherit confidential classification.")] })],
    },
    {
      id: "publish-instagram-gallery-submission",
      states: [error(), json("publish-result", ["POST confirmed publish attempt"], { [OPERATIONAL]: ["ok", "message", "error", "data.status", "data.attempted"], [INTERNAL]: ["data.jobId", "data.instagramMediaId", "data.instagramPermalink", "data.publishedAt"] })],
    },
    {
      id: "resolve-instagram-publish-reconciliation",
      states: [error(), json("reconciliation-result", ["POST retry or resolve exact job"], { [OPERATIONAL]: ["ok", "message", "error", "data.status", "data.updatedAt"], [INTERNAL]: ["data.jobId", "data.instagramMediaId", "data.instagramPermalink", "data.publishedAt"] })],
    },
    {
      id: "mark-instagram-gallery-submission-shared",
      states: [text("cors-preflight", ["OPTIONS"], OPERATIONAL, "cors_preflight", 256, "Protocol-only CORS acknowledgement with no member data."), error()],
    },
    {
      id: "check-instagram-api-status",
      states: [error(), json("moderator-diagnostic", ["POST source-safe diagnostic"], { [OPERATIONAL]: ["ok", "message"], [INTERNAL]: metaDiagnosticFields.map((field) => `data.${field}`) })],
    },
    {
      id: "list-facebook-page-publish-queue",
      states: [error(), json("moderator-queue", ["POST queue by state and cursor"], { [OPERATIONAL]: ["ok", "message", "data.count", "data.hasMore", "data.nextCursor", "data.pageSize", "data.status", "data.summary"], [CONFIDENTIAL]: ["data.jobs[]"] }, { inheritedContainers: [classifiedContainer("data.jobs[]", CONFIDENTIAL, "facebook_page_publish_job", 524288, "Each queue item is a bounded safe job/submission/event projection; descendants inherit confidential classification.")] })],
    },
    {
      id: "publish-facebook-page-gallery-submission",
      states: [error(), json("publish-result", ["POST confirmed publish attempt"], { [OPERATIONAL]: ["ok", "message", "error", "data.status", "data.attempted"], [INTERNAL]: ["data.jobId", "data.facebookPhotoId", "data.facebookPostId", "data.facebookPermalink", "data.publishedAt"] })],
    },
    {
      id: "resolve-facebook-page-publish-reconciliation",
      states: [error(), json("reconciliation-result", ["POST retry or resolve exact job"], { [OPERATIONAL]: ["ok", "message", "error", "data.status", "data.updatedAt"], [INTERNAL]: ["data.jobId", "data.facebookPhotoId", "data.facebookPostId", "data.facebookPermalink", "data.publishedAt"] })],
    },
    {
      id: "check-facebook-page-api-status",
      states: [error(), json("moderator-diagnostic", ["POST source-safe diagnostic"], { [OPERATIONAL]: ["ok", "message"], [INTERNAL]: metaDiagnosticFields.map((field) => `data.${field}`) })],
    },
    {
      id: "manage-event-social-publication",
      states: [
        text("cors-preflight", ["OPTIONS"], OPERATIONAL, "cors_preflight", 256, "Protocol-only CORS acknowledgement with no member or provider data."),
        error(),
        json("owner-activation-required", ["POST attempts to enable a destination outside the owner/operator release path"], {
          [OPERATIONAL]: ["ok", "error", "message"],
        }),
        json("moderator-event-publication-queue", ["POST list bounded occurrences, jobs, destination switches, and reusable templates"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion"],
          [CONFIDENTIAL]: ["occurrences[]", "jobs[]", "destinations[]", "templates[]"],
        }, {
          inheritedContainers: [
            classifiedContainer("occurrences[]", CONFIDENTIAL, "event_social_publication", 262144, "Each occurrence is a bounded moderator-only schedule and workflow projection; descendants inherit confidential classification."),
            classifiedContainer("jobs[]", CONFIDENTIAL, "event_social_publication", 524288, "Each job exposes only reviewed moderator workflow fields; descendants inherit confidential classification."),
            classifiedContainer("destinations[]", CONFIDENTIAL, "event_social_publication", 16384, "Destination activation state is owner-controlled operational configuration shown only to moderators."),
            classifiedContainer("templates[]", CONFIDENTIAL, "event_social_publication", 65536, "Reusable template approval state is moderator-only and excludes hashes and provider identifiers."),
          ],
        }),
        json("moderator-event-cancellation", ["POST separately confirmed occurrence cancellation"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "canceled"],
        }),
        json("moderator-event-approval-revocation", ["POST separately confirmed destination approval revocation"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "revoked", "destination"],
        }),
        json("moderator-event-destination-emergency-disable", ["POST separately confirmed destination emergency disable; activation is refused"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "destination", "enabled"],
        }),
      ],
    },
    {
      id: "run-event-social-publication",
      states: [
        json("opaque-denied", ["non-POST, invalid scheduler secret, invalid body, or missing server configuration"], { [OPERATIONAL]: ["ok"] }),
        json("scheduler-failure", ["template, materialization, or claim failure"], { [OPERATIONAL]: ["ok", "error"] }),
        json("all-destinations-disabled", ["authorized exact-empty-body tick materializes the reviewed schedule projection but every destination remains disabled"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "materialized", "materializedSuppressed", "enabledDestinations", "claimed", "published", "verifiedPublished", "failed", "reconcileRequired", "sweptExpired", "sweptPreparationFailed", "sweptMissed", "preparationClaimed", "preparationPrepared", "preparationPending", "preparationFailed", "preparationReconcileRequired"],
        }),
        json("scheduler-summary-with-provider-verified-publish-count", ["authorized exact-empty-body materialization and bounded publication tick for the reviewed schedule projection"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "materialized", "materializedSuppressed", "enabledDestinations", "claimed", "published", "verifiedPublished", "failed", "reconcileRequired", "sweptExpired", "sweptPreparationFailed", "sweptMissed", "preparationClaimed", "preparationPrepared", "preparationPending", "preparationFailed", "preparationReconcileRequired"],
        }),
      ],
    },
    {
      id: "resolve-event-social-publication-reconciliation",
      states: [
        text("cors-preflight", ["OPTIONS"], OPERATIONAL, "cors_preflight", 256, "Protocol-only CORS acknowledgement with no member or provider data."),
        error(),
        json("moderator-event-publication-confirmed-published-after-provider-readback", ["POST provider-readback confirmation that exact quarantined Facebook jobs use the canonical Page post permalink after photo and post ownership verification"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "message", "data.destination", "data.status", "data.updatedAt", "data.destinationEnabled"],
          [INTERNAL]: ["data.jobId"],
        }),
        json("moderator-event-publication-confirmed-not-published", ["POST bounded inspection confirmation that the exact quarantined job was not published"], {
          [OPERATIONAL]: ["ok", "scheduleContractVersion", "message", "data.destination", "data.status", "data.updatedAt", "data.destinationEnabled"],
          [INTERNAL]: ["data.jobId"],
        }),
      ],
    },
    {
      id: "list-member-profiles",
      states: [empty("cors-preflight", ["OPTIONS"]), error(), json("member-directory", ["POST active-member directory"], { [OPERATIONAL]: ["ok", "data.count", "data.signedUrlSeconds"], [CONFIDENTIAL]: ["data.profiles[]", ...profileFields.map((field) => `data.profiles[].${field}`)] })],
    },
    {
      id: "list-visible-profile-cards",
      states: [error(), json("public-cards", ["POST public requested-slug cards"], { [OPERATIONAL]: ["ok", "data.count", "data.signedUrlSeconds"], [PUBLIC]: ["data.profiles[]", "data.profiles[].slug", "data.profiles[].displayName", "data.profiles[].guildTitle", "data.profiles[].avatarUrl", "data.profiles[].profileHref", "data.profiles[].hasApprovedAvatar", "data.profiles[].hasVisibleProfile", "data.profiles[].hasFilledProfile"] })],
    },
    {
      id: "get-member-profile",
      states: [empty("cors-preflight", ["OPTIONS"]), error(), json("member-profile", ["POST active-member profile by slug"], { [OPERATIONAL]: ["ok", "data.signedUrlSeconds"], [CONFIDENTIAL]: ["data.profile", ...profileFields.map((field) => `data.profile.${field}`)] })],
    },
    {
      id: "submit-member-profile-media",
      states: [empty("cors-preflight", ["OPTIONS"]), error(), json("submission-result", ["POST owned media submission"], { [OPERATIONAL]: ["ok", "message"], [CONFIDENTIAL]: ["data.media"] }, { inheritedContainers: [classifiedContainer("data.media", CONFIDENTIAL, "private_profile_media", 65536, "Owned media row is returned only to its authenticated owner; descendants inherit confidential classification.")] })],
    },
    {
      id: "list-member-profile-media-queue",
      states: [empty("cors-preflight", ["OPTIONS"]), error(), json("moderator-media-queue", ["POST queue by state"], { [OPERATIONAL]: ["ok", "data.count", "data.status", "data.summary", "data.signedUrlSeconds"], [CONFIDENTIAL]: ["data.media[]", "data.moderatorRoles[]"] }, { inheritedContainers: [classifiedContainer("data.media[]", CONFIDENTIAL, "private_profile_media", 524288, "Each moderator queue row is a bounded private media projection; descendants inherit confidential classification.")] })],
    },
    {
      id: "moderate-member-profile-media",
      states: [empty("cors-preflight", ["OPTIONS"]), error(), json("moderation-result", ["POST approve or reject exact media"], { [OPERATIONAL]: ["ok", "message"], [CONFIDENTIAL]: ["data.media"] }, { inheritedContainers: [classifiedContainer("data.media", CONFIDENTIAL, "private_profile_media", 65536, "Moderated media row is returned only to an authorized moderator; descendants inherit confidential classification.")] })],
    },
    {
      id: "mochi-pets-alpha-session",
      states: [error(), json("alpha-session", ["POST authenticated alpha session bootstrap"], { [OPERATIONAL]: ["ok"], [CONFIDENTIAL]: ["data.userId", "data.hasAccess", "data.termsAccepted", "data.termsVersion", "data.alpha.allowlistRequired", "data.alpha.termsRequired", "data.alpha.noRealValue", "data.alpha.ugc", "data.unity.engine", "data.unity.roomKey", "data.unity.sharedPetKey", "data.unity.roomMode", "data.unity.roomCapacity", "data.unity.stateAuthority", "data.unity.realtimeAuthority", "data.progress", ...alphaProgressFields.map((field) => `data.progress.${field}`)] }, { inheritedContainers: [classifiedContainer("data.progress.state", CONFIDENTIAL, "alpha_game_state_and_chat", 65536, "Alpha progress state is a bounded private gameplay JSON value; descendants inherit confidential classification.")] })],
    },
    {
      id: "mochi-pets-unity-auth",
      states: [error(), json("unity-auth", ["POST authenticated private Unity token exchange"], { [OPERATIONAL]: ["ok", "data.unity.expiresIn"], [CONFIDENTIAL]: ["data.userId", "data.alpha.allowlistRequired", "data.alpha.termsRequired", "data.alpha.noRealValue", "data.alpha.ugc", "data.unity.provider", "data.unity.projectId", "data.unity.environmentName", "data.unity.unityPlayerId", "data.unity.playerId", "data.unity.customId", "data.unity.roomKey", "data.unity.sharedPetKey", "data.unity.roomMode", "data.unity.roomCapacity", "data.unity.stateAuthority", "data.unity.realtimeAuthority"], [CREDENTIAL]: ["data.unity.accessToken", "data.unity.idToken", "data.unity.sessionToken"] })],
    },
    {
      id: "mochi-pets-alpha-action",
      states: [error(), json("action-result", ["POST game-server action or idempotent duplicate"], { [OPERATIONAL]: ["ok", "message", "data.duplicate", "data.noRealValue", "data.requestId", "data.type"], [CONFIDENTIAL]: ["progress", ...alphaProgressFields.map((field) => `progress.${field}`), "sharedPet", ...sharedPetFields.map((field) => `sharedPet.${field}`)] }, { inheritedContainers: [classifiedContainer("progress.state", CONFIDENTIAL, "alpha_game_state_and_chat", 65536, "Private alpha progress JSON; descendants inherit confidential classification."), classifiedContainer("sharedPet.state", CONFIDENTIAL, "alpha_game_state_and_chat", 65536, "Validated shared-pet JSON; descendants inherit confidential classification.")] })],
    },
    {
      id: "mochi-pets-alpha-progress",
      states: [error(), json("progress-result", ["POST game-server progress lookup"], { [OPERATIONAL]: ["ok", "data.fallback", "data.noRealValue"], [CONFIDENTIAL]: ["data.progress", ...alphaProgressFields.map((field) => `data.progress.${field}`)] }, { inheritedContainers: [classifiedContainer("data.progress.state", CONFIDENTIAL, "alpha_game_state_and_chat", 65536, "Private alpha progress JSON; descendants inherit confidential classification.")] })],
    },
    {
      id: "mochi-pets-alpha-admin",
      states: [error(), json("moderator-alpha-view", ["POST list_testers or audit"], { [OPERATIONAL]: ["ok", "message"], [CONFIDENTIAL]: ["data.testers[]", "data.audit[]"] }, { inheritedContainers: [classifiedContainer("data.testers[]", CONFIDENTIAL, "alpha_access_and_terms", 262144, "Moderator-only tester rows inherit confidential classification."), classifiedContainer("data.audit[]", CONFIDENTIAL, "moderation_record", 262144, "Moderator-only alpha audit rows inherit confidential classification.")] })],
    },
    {
      id: "submit-mochi-pets-feedback",
      states: [error(), json("feedback-receipt", ["POST authenticated alpha feedback"], { [OPERATIONAL]: ["ok", "message"], [CONFIDENTIAL]: ["data"] }, { inheritedContainers: [classifiedContainer("data", CONFIDENTIAL, "alpha_feedback", 65536, "Owned feedback receipt is returned only to its authenticated submitter; descendants inherit confidential classification.")] })],
    },
    {
      id: "sync-pixelfed-social-account",
      states: [
        error(),
        json("discord-verification-required", ["POST when current Discord verification is absent, stale, or no longer valid"], { [OPERATIONAL]: ["ok", "error"] }),
        json("discord-verification-unavailable", ["POST when the bounded current Discord lookup fails closed"], { [OPERATIONAL]: ["ok", "error"] }),
        json("discord-membership-loss", ["POST when Discord returns the exact Unknown Member response"], { [OPERATIONAL]: ["ok", "error"] }),
        json("sync-result", ["POST signed Social login, create, update, or access-check event after current Discord verification"], { [OPERATIONAL]: ["ok", "status", "error", "message"], [CONFIDENTIAL]: ["profileUrl"] }),
      ],
    },
  ],
};
