import { asArray, asRecord, safeString, type JsonRecord } from "./discord-interaction-helpers.ts";
import {
  DISCORD_EVENT_ENTITY_EXTERNAL,
  desiredEventsFromSchedule,
  eventLocation,
  managedEventLine,
  scheduledEventBody,
  type ScheduleEvent,
} from "./reaper-discord-events.ts";

type SupabaseAdminClient = {
  from(table: string): any;
};

type DiscordApiResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

export type ReaperEventSyncDependencies = {
  expectedGuildId: string;
  guildScheduleUrl: string;
  discordApiUserAgent: string;
  discordApi(path: string, init?: RequestInit): Promise<DiscordApiResult>;
  discordApiHeaders(contentType?: boolean): Headers;
  editOriginalInteractionResponse(applicationId: string, interactionToken: string, content: string): Promise<void>;
  serviceAdminClient(purpose: string): SupabaseAdminClient;
};

async function fetchGuildSchedule(deps: ReaperEventSyncDependencies): Promise<JsonRecord> {
  const scheduleUrl = Deno.env.get("GUILD_SCHEDULE_URL") || deps.guildScheduleUrl;
  const response = await fetch(scheduleUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": deps.discordApiUserAgent,
    },
  });

  if (!response.ok) {
    throw new Error(`Schedule fetch failed with HTTP ${response.status}.`);
  }

  return asRecord(await response.json());
}

async function loadManagedEventResources(deps: ReaperEventSyncDependencies): Promise<JsonRecord[]> {
  const adminClient = deps.serviceAdminClient("event registry lookup");
  const { data, error } = await adminClient
    .from("discord_resources")
    .select("id,label,discord_id,metadata,enabled")
    .eq("kind", "scheduled_event")
    .eq("enabled", true);

  if (error) {
    console.error("reaper-discord-interactions scheduled event registry lookup failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Scheduled event registry could not be read.");
  }

  return asArray(data).map(asRecord).filter((resource) => {
    const metadata = asRecord(resource.metadata);
    return metadata.managedBy === "reaper-event-sync";
  });
}

async function upsertDiscordEventResource(
  deps: ReaperEventSyncDependencies,
  event: JsonRecord,
  desired: ScheduleEvent,
): Promise<void> {
  const eventId = safeString(event.id, 24);

  if (!eventId) {
    throw new Error("Discord scheduled event id is missing.");
  }

  const adminClient = deps.serviceAdminClient("event registry updates");
  const { error } = await adminClient
    .from("discord_resources")
    .upsert(
      {
        kind: "scheduled_event",
        label: desired.title,
        discord_id: eventId,
        discord_parent_id: deps.expectedGuildId,
        enabled: true,
        url: `https://discord.com/events/${deps.expectedGuildId}/${eventId}`,
        description: desired.description,
        metadata: {
          managedBy: "reaper-event-sync",
          siteEventKey: desired.key,
          location: desired.location,
          websiteLocation: desired.websiteLocation,
          coverImageUrl: desired.coverImageUrl,
          canonicalEventId: desired.canonicalEventId,
          recurrenceRule: desired.recurrenceRule,
          source: "data/guild-schedule.json",
          startIso: desired.startIso,
          endIso: desired.endIso,
          entityType: "EXTERNAL",
        },
      },
      { onConflict: "kind,discord_id" },
    );

  if (error) {
    console.error("reaper-discord-interactions scheduled event registry upsert failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Scheduled event was changed but could not be recorded in the website registry.");
  }
}

async function disableDuplicateEventResource(
  deps: ReaperEventSyncDependencies,
  eventId: string,
  desired: ScheduleEvent,
): Promise<void> {
  const adminClient = deps.serviceAdminClient("duplicate event registry updates");
  const { error } = await adminClient
    .from("discord_resources")
    .update({
      enabled: false,
      description: `Retired duplicate scheduled event for ${desired.title}.`,
      metadata: {
        managedBy: "reaper-event-sync",
        siteEventKey: desired.key,
        duplicateOf: desired.canonicalEventId,
        retiredBy: "reaper-event-sync",
        retiredReason: "duplicate-monthly-raffle",
        retiredAt: new Date().toISOString(),
      },
    })
    .eq("kind", "scheduled_event")
    .eq("discord_id", eventId);

  if (error) {
    console.error("reaper-discord-interactions duplicate scheduled event registry update failed", {
      code: error.code,
      message: error.message,
    });
    throw new Error("Duplicate scheduled event was removed but could not be retired in the website registry.");
  }
}

async function processDuplicateScheduledEvents(
  deps: ReaperEventSyncDependencies,
  apply: boolean,
  desired: ScheduleEvent,
  existingEvents: JsonRecord[],
  lines: string[],
): Promise<void> {
  for (const duplicateId of desired.duplicateEventIds) {
    if (!duplicateId || duplicateId === desired.canonicalEventId) continue;
    const existingDuplicate = existingEvents.find((event) => safeString(event.id, 24) === duplicateId);
    if (!existingDuplicate) {
      lines.push(managedEventLine("Duplicate already absent", desired, `event ${duplicateId}`));
      continue;
    }

    lines.push(managedEventLine(apply ? "Removed duplicate" : "Would remove duplicate", desired, `event ${duplicateId}`));
    if (!apply) continue;

    const response = await deps.discordApi(`/guilds/${deps.expectedGuildId}/scheduled-events/${duplicateId}`, {
      method: "DELETE",
      headers: deps.discordApiHeaders(),
    });
    if (!response.ok) {
      lines[lines.length - 1] = managedEventLine("Blocked duplicate removal", desired, `Discord API ${response.status}`);
      continue;
    }
    await disableDuplicateEventResource(deps, duplicateId, desired);
  }
}

export async function processEventSync(
  mode: string,
  interactionToken: string,
  applicationId: string,
  deps: ReaperEventSyncDependencies,
): Promise<void> {
  const apply = mode === "apply";
  const lines: string[] = [];

  try {
    if (!Deno.env.get("DISCORD_BOT_TOKEN")) {
      await deps.editOriginalInteractionResponse(applicationId, interactionToken, "Reaper event sync is missing the Discord bot token.");
      return;
    }

    const schedule = await fetchGuildSchedule(deps);
    const desiredEvents = desiredEventsFromSchedule(schedule);
    if (!desiredEvents.length) {
      await deps.editOriginalInteractionResponse(applicationId, interactionToken, "Reaper event sync found no website schedule events.");
      return;
    }

    const [resources, eventsResponse] = await Promise.all([
      loadManagedEventResources(deps),
      deps.discordApi(`/guilds/${deps.expectedGuildId}/scheduled-events`, {
        headers: deps.discordApiHeaders(),
      }),
    ]);

    if (!eventsResponse.ok) {
      await deps.editOriginalInteractionResponse(
        applicationId,
        interactionToken,
        "Reaper could not read Discord scheduled events. Check bot event permissions.",
      );
      return;
    }

    const existingEvents = asArray(eventsResponse.data).map(asRecord);
    const resourceByKey = new Map(resources.map((resource) => [safeString(asRecord(resource.metadata).siteEventKey, 100) || "", resource]));

    for (const desired of desiredEvents) {
      const resource = resourceByKey.get(desired.key);
      const resourceEventId = safeString(resource?.discord_id, 24);
      const existingByCanonical = desired.canonicalEventId
        ? existingEvents.find((event) => safeString(event.id, 24) === desired.canonicalEventId)
        : null;
      const existingByResource = resourceEventId
        ? existingEvents.find((event) => safeString(event.id, 24) === resourceEventId)
        : null;
      const existingByName = existingEvents.find((event) =>
        safeString(event.name, 100) === desired.title &&
        safeString(event.scheduled_start_time, 60) === desired.startIso &&
        Number(event.entity_type) === DISCORD_EVENT_ENTITY_EXTERNAL &&
        eventLocation(event) === desired.location
      );
      const existing = existingByCanonical || existingByResource || existingByName;

      if (existing) {
        lines.push(managedEventLine(apply ? "Updated" : "Would update", desired, `event ${safeString(existing.id, 24) || "unknown"}`));
        if (apply) {
          let body: JsonRecord;
          try {
            body = await scheduledEventBody(desired, true, { userAgent: deps.discordApiUserAgent });
          } catch {
            lines[lines.length - 1] = managedEventLine("Blocked", desired, "cover image unavailable");
            continue;
          }
          const response = await deps.discordApi(`/guilds/${deps.expectedGuildId}/scheduled-events/${safeString(existing.id, 24)}`, {
            method: "PATCH",
            headers: deps.discordApiHeaders(true),
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            lines[lines.length - 1] = managedEventLine("Blocked", desired, `Discord API ${response.status}`);
            continue;
          }
          await upsertDiscordEventResource(deps, asRecord(response.data), desired);
        }
        await processDuplicateScheduledEvents(deps, apply, desired, existingEvents, lines);
        continue;
      }

      lines.push(managedEventLine(apply ? "Created" : "Would create", desired, "external scheduled event"));
      if (apply) {
        let body: JsonRecord;
        try {
          body = await scheduledEventBody(desired, true, { userAgent: deps.discordApiUserAgent });
        } catch {
          lines[lines.length - 1] = managedEventLine("Blocked", desired, "cover image unavailable");
          continue;
        }
        const response = await deps.discordApi(`/guilds/${deps.expectedGuildId}/scheduled-events`, {
          method: "POST",
          headers: deps.discordApiHeaders(true),
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          lines[lines.length - 1] = managedEventLine("Blocked", desired, `Discord API ${response.status}`);
          continue;
        }
        await upsertDiscordEventResource(deps, asRecord(response.data), desired);
      }
      await processDuplicateScheduledEvents(deps, apply, desired, existingEvents, lines);
    }

    const intro = apply
      ? "Event sync finished. Only Reaper-managed external Discord events were created or updated."
      : "Event sync preview. No Discord scheduled events were changed.";
    await deps.editOriginalInteractionResponse(applicationId, interactionToken, `${intro}\n${lines.slice(0, 25).join("\n")}`);
  } catch (error) {
    console.error("reaper-discord-interactions event sync failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    await deps.editOriginalInteractionResponse(
      applicationId,
      interactionToken,
      "Reaper event sync could not be completed. Check configuration and try preview again.",
    );
  }
}
