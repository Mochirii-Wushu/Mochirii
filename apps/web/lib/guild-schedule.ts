export type GuildScheduleData = {
  timezone?: {
    label?: string;
    offsetMinutes?: number;
  };
  monthly?: Record<string, GuildMonthlyScheduleItem>;
  spotlight?: {
    id?: string;
    rule?: string;
    memberProfileSlug?: string;
  };
  weekly?: GuildWeeklyScheduleItem[];
};

export type GuildMonthlyScheduleItem = {
  id?: string;
  title?: string;
  rule?: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  description?: string;
};

export type GuildWeeklyScheduleItem = {
  id?: string;
  title?: string;
  days?: number[];
  dayText?: string;
  startTime?: string;
  endTime?: string;
  timeText?: string;
  timezone?: string;
  summary?: string;
  image?: string;
  href?: string;
  location?: string;
  discord?: boolean;
  showOnEventsBoard?: boolean;
};

export type ScheduledEventOccurrence = GuildWeeklyScheduleItem & {
  date: string;
  startIso: string;
  endIso: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function offsetMinutes(schedule: GuildScheduleData): number {
  const value = Number(schedule.timezone?.offsetMinutes);
  return Number.isFinite(value) ? value : 480;
}

export function scheduleTimezoneLabel(schedule: GuildScheduleData): string {
  return String(schedule.timezone?.label || "UTC+8");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localParts(now: Date, offset: number) {
  const shifted = new Date(now.getTime() + offset * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

function localDateKeyFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function localDateKey(now: Date, schedule: GuildScheduleData): string {
  const parts = localParts(now, offsetMinutes(schedule));
  return localDateKeyFromParts(parts.year, parts.month, parts.day);
}

function parseDateKey(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function parseTime(value: unknown): { hour: number; minute: number } {
  const raw = String(value || "00:00").trim();
  const match = raw.match(/^(\d{2}):(\d{2})$/);
  if (!match) return { hour: 0, minute: 0 };
  return {
    hour: Math.min(Math.max(Number(match[1]), 0), 23),
    minute: Math.min(Math.max(Number(match[2]), 0), 59),
  };
}

function localToUtcIso(dateKey: string, time: string, schedule: GuildScheduleData): string {
  const date = parseDateKey(dateKey);
  if (!date) return "";
  const parsedTime = parseTime(time);
  return new Date(
    Date.UTC(date.year, date.month - 1, date.day, parsedTime.hour, parsedTime.minute) -
      offsetMinutes(schedule) * 60 * 1000,
  ).toISOString();
}

function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  const next = new Date(Date.UTC(date.year, date.month - 1, date.day) + days * MS_PER_DAY);
  return localDateKeyFromParts(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

function firstSaturday(year: number, month: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const offset = (6 - first.getUTCDay() + 7) % 7;
  return localDateKeyFromParts(year, month, 1 + offset);
}

export function nextFirstSaturday(schedule: GuildScheduleData, now = new Date()): string {
  const parts = localParts(now, offsetMinutes(schedule));
  const currentMonth = firstSaturday(parts.year, parts.month);
  const today = localDateKeyFromParts(parts.year, parts.month, parts.day);
  if (today <= currentMonth) return currentMonth;

  const nextMonthDate = new Date(Date.UTC(parts.year, parts.month, 1));
  return firstSaturday(nextMonthDate.getUTCFullYear(), nextMonthDate.getUTCMonth() + 1);
}

export function firstDayOfCurrentMonth(schedule: GuildScheduleData, now = new Date()): string {
  const parts = localParts(now, offsetMinutes(schedule));
  return localDateKeyFromParts(parts.year, parts.month, 1);
}

export function monthlyScheduleDate(
  schedule: GuildScheduleData,
  scheduleId: unknown,
  fallback: unknown,
  now = new Date(),
): string {
  const id = String(scheduleId || "");
  const item = Object.values(schedule.monthly || {}).find((entry) => entry.id === id);
  if (item?.rule === "next-first-saturday") return nextFirstSaturday(schedule, now);
  return String(fallback || "");
}

export function spotlightScheduleDate(schedule: GuildScheduleData, fallback: unknown, now = new Date()): string {
  if (schedule.spotlight?.rule === "first-day-current-month") return firstDayOfCurrentMonth(schedule, now);
  return String(fallback || "");
}

function localMinute(parts: ReturnType<typeof localParts>): number {
  return parts.hour * 60 + parts.minute;
}

function eventEndDate(startDate: string, startTime: string, endTime: string): string {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const crossesMidnight = end.hour * 60 + end.minute <= start.hour * 60 + start.minute;
  return crossesMidnight ? addDays(startDate, 1) : startDate;
}

export function nextWeeklyOccurrence(
  schedule: GuildScheduleData,
  item: GuildWeeklyScheduleItem,
  now = new Date(),
): ScheduledEventOccurrence | null {
  const days = Array.isArray(item.days) ? item.days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [];
  if (!days.length) return null;

  const parts = localParts(now, offsetMinutes(schedule));
  const today = localDateKeyFromParts(parts.year, parts.month, parts.day);
  const nowMinutes = localMinute(parts);
  const start = parseTime(item.startTime);
  const end = parseTime(item.endTime);
  const startMinutes = start.hour * 60 + start.minute;
  const endMinutes = end.hour * 60 + end.minute;

  let bestDate = "";
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const day of days) {
    let delta = (day - parts.weekday + 7) % 7;
    if (delta === 0) {
      const stillUpcoming = endMinutes <= startMinutes ? nowMinutes < 24 * 60 : nowMinutes < endMinutes;
      if (!stillUpcoming) delta = 7;
    }
    if (delta < bestDelta) {
      bestDelta = delta;
      bestDate = addDays(today, delta);
    }
  }

  if (!bestDate) return null;
  const startIso = localToUtcIso(bestDate, item.startTime || "00:00", schedule);
  const endDate = eventEndDate(bestDate, item.startTime || "00:00", item.endTime || "00:00");
  const endIso = localToUtcIso(endDate, item.endTime || "00:00", schedule);

  return {
    ...item,
    date: bestDate,
    startIso,
    endIso,
  };
}

export function scheduleLine(item: GuildWeeklyScheduleItem): string {
  return `${item.title || "Event"}: ${item.dayText || ""} - ${item.timeText || ""}`;
}

export function weeklyScheduleLines(schedule: GuildScheduleData): string[] {
  return (schedule.weekly || [])
    .filter((item) => item.id !== "guild-heros-realm")
    .map(scheduleLine);
}

export function eventBoardItemsFromSchedule(schedule: GuildScheduleData, now = new Date()): ScheduledEventOccurrence[] {
  return (schedule.weekly || [])
    .filter((item) => item.showOnEventsBoard === true)
    .map((item) => nextWeeklyOccurrence(schedule, item, now))
    .filter((item): item is ScheduledEventOccurrence => Boolean(item));
}

export function discordScheduledEventsFromSchedule(schedule: GuildScheduleData, now = new Date()): ScheduledEventOccurrence[] {
  const monthlyEvents = Object.values(schedule.monthly || {}).map((item) => {
    const date = monthlyScheduleDate(schedule, item.id, "", now);
    const startIso = localToUtcIso(date, item.startTime || "00:00", schedule);
    const endDate = eventEndDate(date, item.startTime || "00:00", item.endTime || "00:00");
    const endIso = localToUtcIso(endDate, item.endTime || "00:00", schedule);
    return {
      id: item.id,
      title: item.title,
      startTime: item.startTime,
      endTime: item.endTime,
      timeText: item.time,
      location: item.location,
      summary: item.description,
      discord: true,
      date,
      startIso,
      endIso,
    };
  });

  const weeklyEvents = (schedule.weekly || [])
    .filter((item) => item.discord === true)
    .flatMap((item) =>
      (item.days || []).map((day) => nextWeeklyOccurrence(schedule, { ...item, days: [day] }, now)).filter(Boolean),
    ) as ScheduledEventOccurrence[];

  return [...monthlyEvents, ...weeklyEvents].filter((item) => item.id && item.title && item.startIso && item.endIso);
}
