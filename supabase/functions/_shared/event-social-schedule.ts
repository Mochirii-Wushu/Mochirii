export type EventSocialDestination =
  | "facebook_page"
  | "instagram"
  | "discord";

export type EventSocialOccurrence = {
  sourceKey: string;
  sourceEventId: string;
  sourceKind: "monthly" | "weekly";
  title: string;
  localDate: string;
  startsAt: string;
  endsAt: string;
  publishAt: string;
  state: "scheduled" | "superseded" | "suppressed";
  supersededBySourceKey: string | null;
};

type ScheduleItem = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
};

type MonthlyScheduleItem = ScheduleItem & {
  rule: "next-first-wednesday" | "next-first-saturday";
  replacesEventId: "guild-party";
  replacementRewardEventId: "guild-party";
  cancellationRestoresReplacement: false;
};

type WeeklyScheduleItem = ScheduleItem & { days: readonly number[] };

export type EventSocialSchedule = {
  timezone: {
    label: "UTC+8";
    ianaZone: "Asia/Singapore";
    offsetMinutes: 480;
  };
  monthly: readonly MonthlyScheduleItem[];
  weekly: readonly WeeklyScheduleItem[];
};

// This deployable subset is checked byte-for-field against the public committed
// guild schedule by scripts/check-event-social-schedule-parity.mjs. It contains
// timing only; publication copy and approval remain separate server records.
export const EVENT_SOCIAL_SCHEDULE: EventSocialSchedule = {
  timezone: {
    label: "UTC+8",
    ianaZone: "Asia/Singapore",
    offsetMinutes: 480,
  },
  monthly: [
    {
      id: "monthly-gathering",
      title: "Monthly Guild Gathering",
      rule: "next-first-wednesday",
      replacesEventId: "guild-party",
      replacementRewardEventId: "guild-party",
      cancellationRestoresReplacement: false,
      startTime: "21:30",
      endTime: "22:00",
    },
    {
      id: "monthly-raffle",
      title: "Monthly Guild Raffle",
      rule: "next-first-saturday",
      replacesEventId: "guild-party",
      replacementRewardEventId: "guild-party",
      cancellationRestoresReplacement: false,
      startTime: "21:30",
      endTime: "22:00",
    },
  ],
  weekly: [
    {
      id: "guild-party",
      title: "Guild Party",
      days: [0, 1, 2, 3, 4, 5, 6],
      startTime: "21:30",
      endTime: "22:00",
    },
    {
      id: "breaking-army",
      title: "Breaking Army",
      days: [1, 3],
      startTime: "22:00",
      endTime: "00:00",
    },
    {
      id: "showdown",
      title: "Showdown",
      days: [2, 4],
      startTime: "22:00",
      endTime: "00:00",
    },
    {
      id: "guild-wars",
      title: "Guild Wars",
      days: [6, 0],
      startTime: "20:30",
      endTime: "23:30",
    },
    {
      id: "guild-heros-realm",
      title: "Guild Hero's Realm: Weekly Coordination",
      days: [5],
      startTime: "22:00",
      endTime: "23:00",
    },
    {
      id: "united-resolve",
      title: "United Resolve",
      days: [5],
      startTime: "23:00",
      endTime: "00:00",
    },
  ],
};

export const EVENT_SOCIAL_SUPPRESSED_OCCURRENCES = Object.freeze([
  Object.freeze({
    sourceKey: "breaking-army:2026-08-05",
    reason: "manual_announcement_only",
  }),
]);

export const EVENT_SOCIAL_SCHEDULE_CONTRACT_VERSION =
  "guild-schedule-event-social-v3";
export const EVENT_SOCIAL_SCHEDULE_SHA256 =
  "d2f5a248dba22176c392768ab2e8d82dbf8248982fabb44542ce83116cbbf87e";
export const EVENT_SOCIAL_SCHEDULE_PROJECTION_SHA256 =
  "8a6d103f6c6ecb48bd5f0e5406f4d1acaa6a8aa216daae8065d58c671bce6b07";
export const EVENT_SOCIAL_PUBLISH_LEAD_MINUTES = 60;
export const EVENT_SOCIAL_EXACT_WINDOW_MINUTES = 2;

const DAY_MS = 86_400_000;
const MONTHLY_WEEKDAY: Readonly<Record<MonthlyScheduleItem["rule"], number>> = {
  "next-first-wednesday": 3,
  "next-first-saturday": 6,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localDateKey(date: Date, offsetMinutes: number): string {
  const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${
    pad(shifted.getUTCDate())
  }`;
}

function parseLocalDate(
  value: string,
): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new TypeError("A valid local date is required.");
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function addLocalDays(value: string, days: number): string {
  const parsed = parseLocalDate(value);
  const next = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day) + days * DAY_MS,
  );
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${
    pad(next.getUTCDate())
  }`;
}

function localWeekday(value: string): number {
  const parsed = parseLocalDate(value);
  return new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day))
    .getUTCDay();
}

function firstWeekday(value: string, weekday: number): boolean {
  const parsed = parseLocalDate(value);
  if (localWeekday(value) !== weekday) return false;
  return parsed.day <= 7;
}

function timeMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new TypeError("A valid schedule time is required.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) {
    throw new TypeError("A valid schedule time is required.");
  }
  return hour * 60 + minute;
}

function localDateTimeToUtc(
  localDate: string,
  time: string,
  offsetMinutes: number,
): Date {
  const parsed = parseLocalDate(localDate);
  const minutes = timeMinutes(time);
  return new Date(
    Date.UTC(
      parsed.year,
      parsed.month - 1,
      parsed.day,
      Math.floor(minutes / 60),
      minutes % 60,
    ) - offsetMinutes * 60_000,
  );
}

function occurrence(
  schedule: EventSocialSchedule,
  kind: "monthly" | "weekly",
  item: ScheduleItem,
  localDate: string,
): EventSocialOccurrence {
  const startsAt = localDateTimeToUtc(
    localDate,
    item.startTime,
    schedule.timezone.offsetMinutes,
  );
  const endDate = timeMinutes(item.endTime) <= timeMinutes(item.startTime)
    ? addLocalDays(localDate, 1)
    : localDate;
  const endsAt = localDateTimeToUtc(
    endDate,
    item.endTime,
    schedule.timezone.offsetMinutes,
  );
  return {
    sourceKey: `${item.id}:${localDate}`,
    sourceEventId: item.id,
    sourceKind: kind,
    title: item.title,
    localDate,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    publishAt: new Date(
      startsAt.getTime() - EVENT_SOCIAL_PUBLISH_LEAD_MINUTES * 60_000,
    ).toISOString(),
    state: "scheduled",
    supersededBySourceKey: null,
  };
}

function assertScheduleBoundary(schedule: EventSocialSchedule): void {
  if (
    schedule.timezone.label !== "UTC+8" ||
    schedule.timezone.ianaZone !== "Asia/Singapore" ||
    schedule.timezone.offsetMinutes !== 480 ||
    schedule.monthly.some((item) =>
      item.replacesEventId !== "guild-party" ||
      item.replacementRewardEventId !== "guild-party" ||
      item.cancellationRestoresReplacement !== false
    )
  ) throw new TypeError("The guild schedule timezone boundary changed.");
}

export function deriveEventSocialOccurrences(
  schedule: EventSocialSchedule,
  from: Date,
  through: Date,
): EventSocialOccurrence[] {
  assertScheduleBoundary(schedule);
  if (
    !Number.isFinite(from.getTime()) || !Number.isFinite(through.getTime()) ||
    through < from || through.getTime() - from.getTime() > 93 * DAY_MS
  ) throw new TypeError("A bounded occurrence horizon is required.");

  const firstDate = localDateKey(from, schedule.timezone.offsetMinutes);
  const lastDate = localDateKey(through, schedule.timezone.offsetMinutes);
  const results: EventSocialOccurrence[] = [];
  for (
    let localDate = firstDate;
    localDate <= lastDate;
    localDate = addLocalDays(localDate, 1)
  ) {
    const monthlyItems = schedule.monthly
      .filter((item) => firstWeekday(localDate, MONTHLY_WEEKDAY[item.rule]));
    const monthly = monthlyItems
      .map((item) => occurrence(schedule, "monthly", item, localDate));
    results.push(...monthly);

    for (const item of schedule.weekly) {
      if (!item.days.includes(localWeekday(localDate))) continue;
      const weekly = occurrence(schedule, "weekly", item, localDate);
      if (item.id === "guild-party") {
        const ownerIndex = monthly.findIndex((candidate, index) =>
          monthlyItems[index].replacesEventId === item.id &&
          monthlyItems[index].replacementRewardEventId === item.id &&
          monthlyItems[index].cancellationRestoresReplacement === false &&
          candidate.startsAt === weekly.startsAt &&
          candidate.endsAt === weekly.endsAt
        );
        const owner = ownerIndex >= 0 ? monthly[ownerIndex] : undefined;
        if (owner) {
          weekly.state = "superseded";
          weekly.supersededBySourceKey = owner.sourceKey;
        }
      }
      results.push(weekly);
    }
  }
  const suppressed = new Set<string>(
    EVENT_SOCIAL_SUPPRESSED_OCCURRENCES.map((item) => item.sourceKey),
  );
  return results
    .map((item) =>
      suppressed.has(item.sourceKey)
        ? { ...item, state: "suppressed" as const, supersededBySourceKey: null }
        : item
    )
    .sort((left, right) =>
      left.startsAt.localeCompare(right.startsAt) ||
      (left.sourceKind === right.sourceKind
        ? left.sourceKey.localeCompare(right.sourceKey)
        : left.sourceKind === "monthly"
        ? -1
        : 1)
    );
}

export function eventSocialMediaPathIsSafe(
  value: unknown,
  destination: EventSocialDestination,
): value is string {
  const path = String(value ?? "").trim();
  if (
    !path.startsWith("/assets/") || path.length > 300 ||
    path.includes("..") || path.includes("\\") || path.includes("?") ||
    path.includes("#") ||
    Array.from(path).some((character) => {
      const code = character.codePointAt(0) || 0;
      return code <= 0x20 || code === 0x7f;
    })
  ) return false;
  const extension = path.split(".").pop()?.toLowerCase();
  return destination === "discord"
    ? ["jpg", "jpeg", "png", "webp"].includes(extension || "")
    : ["jpg", "jpeg"].includes(extension || "");
}

export function eventSocialDestinationEnabled(value: unknown): boolean {
  return value === "true";
}

export function eventSocialPublishWindowState(
  publishAt: string,
  now: Date,
): "early" | "due" | "missed" {
  const target = Date.parse(publishAt);
  if (!Number.isFinite(target) || !Number.isFinite(now.getTime())) {
    throw new TypeError("A valid event publication window is required.");
  }
  if (now.getTime() < target) return "early";
  return now.getTime() <
      target + EVENT_SOCIAL_EXACT_WINDOW_MINUTES * 60_000
    ? "due"
    : "missed";
}
