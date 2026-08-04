/**
 * Pure availability math — no network, no clock reads beyond what callers pass in.
 *
 * Extracted from the inline block that used to live in handleCheckAvailability so
 * that single-user availability and multi-person meeting-slot finding compute gaps
 * through exactly one code path. Everything here is deterministic and unit-tested;
 * the handlers stay thin wrappers around a fetch plus these calls.
 */

export const DEFAULT_WORK_START_HOUR = 9;
export const DEFAULT_WORK_END_HOUR = 18;

/**
 * Expand a YYYY-MM-DD range into the individual date strings it covers.
 *
 * Iterates on a local Date built from the numeric parts rather than parsing the
 * string — `new Date("2026-08-04")` is UTC midnight, which lands on the previous
 * day for anyone west of Greenwich and silently drops a day from the range.
 *
 * @param {string} startDate YYYY-MM-DD, inclusive
 * @param {string} endDate   YYYY-MM-DD, inclusive
 * @param {{includeWeekends?: boolean}} [options]
 * @returns {string[]} date strings in ascending order
 */
export function eachDate(startDate, endDate, { includeWeekends = false } = {}) {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const endMs = new Date(ey, em - 1, ed).getTime();

  const dates = [];
  for (let dt = new Date(sy, sm - 1, sd); dt.getTime() <= endMs; dt.setDate(dt.getDate() + 1)) {
    const dayOfWeek = dt.getDay();
    if (!includeWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
  }
  return dates;
}

/**
 * Project raw scheduling-assistant events onto sorted busy intervals.
 *
 * All-day events are dropped: they mark a day as themed ("PTO", "Conference"),
 * not as wall-to-wall unavailable, and treating them as busy would erase every
 * slot on the day. Callers who care about them use get_allday_events.
 *
 * @param {Array<{start: string, end: string, isAllDay?: boolean, title?: string}>} events
 * @returns {Array<{start: Date, end: Date, title?: string}>} ascending by start
 */
export function toBusyIntervals(events) {
  return (events || [])
    .filter((e) => e && !e.isAllDay && e.start && e.end)
    .map((e) => ({ start: new Date(e.start), end: new Date(e.end), title: e.title }))
    .filter((e) => !Number.isNaN(e.start.getTime()) && !Number.isNaN(e.end.getTime()))
    .sort((a, b) => a.start - b.start);
}

/**
 * Find gaps of at least `durationMinutes` inside working hours on each date.
 *
 * Overlapping and nested intervals are handled by the forward-only cursor: it
 * never retreats, so a meeting fully contained inside a longer one contributes
 * nothing and cannot reopen a gap that the longer one already closed.
 *
 * @param {object} options
 * @param {Array<{start: Date, end: Date}>} options.busy sorted ascending by start
 * @param {string[]} options.dates YYYY-MM-DD strings
 * @param {number} options.durationMinutes minimum acceptable gap
 * @param {number} [options.workStartHour]
 * @param {number} [options.workEndHour]
 * @returns {Array<{date: string, start: string, end: string, duration_minutes: number}>}
 */
export function computeFreeSlots({
  busy,
  dates,
  durationMinutes,
  workStartHour = DEFAULT_WORK_START_HOUR,
  workEndHour = DEFAULT_WORK_END_HOUR,
}) {
  const slots = [];

  for (const dateStr of dates) {
    const dayStart = new Date(`${dateStr}T${String(workStartHour).padStart(2, "0")}:00:00`);
    const dayEnd = new Date(`${dateStr}T${String(workEndHour).padStart(2, "0")}:00:00`);
    if (!(dayStart < dayEnd)) continue;

    const dayEvents = busy.filter((e) => e.start < dayEnd && e.end > dayStart);

    let cursor = dayStart;
    for (const evt of dayEvents) {
      const evtStart = evt.start < dayStart ? dayStart : evt.start;
      const evtEnd = evt.end > dayEnd ? dayEnd : evt.end;

      if (evtStart > cursor) {
        const gapMinutes = (evtStart - cursor) / 60_000;
        if (gapMinutes >= durationMinutes) {
          slots.push({
            date: dateStr,
            start: cursor.toISOString(),
            end: evtStart.toISOString(),
            duration_minutes: Math.round(gapMinutes),
          });
        }
      }
      if (evtEnd > cursor) cursor = evtEnd;
    }

    if (cursor < dayEnd) {
      const gapMinutes = (dayEnd - cursor) / 60_000;
      if (gapMinutes >= durationMinutes) {
        slots.push({
          date: dateStr,
          start: cursor.toISOString(),
          end: dayEnd.toISOString(),
          duration_minutes: Math.round(gapMinutes),
        });
      }
    }
  }

  return slots;
}

/**
 * Collapse a scheduling-assistant response into one combined busy list.
 *
 * A slot works for a group only when it is free for every member, so the union
 * of everyone's busy time is exactly the group's busy time. Users the API
 * returned no data for are reported separately rather than being treated as
 * wide open — silently scheduling over someone whose calendar failed to load is
 * the one outcome worth failing loudly for.
 *
 * @param {Record<string, {events?: Array}>} data keyed by user id
 * @param {string[]} userIds the ids that were requested
 * @returns {{busy: Array<{start: Date, end: Date}>, missing: string[], perUser: Record<string, number>}}
 */
export function unionBusyAcrossUsers(data, userIds) {
  const all = [];
  const missing = [];
  const perUser = {};

  for (const userId of userIds) {
    const userData = data?.[userId];
    if (!userData) {
      missing.push(userId);
      perUser[userId] = 0;
      continue;
    }
    const intervals = toBusyIntervals(userData.events);
    perUser[userId] = intervals.length;
    all.push(...intervals);
  }

  all.sort((a, b) => a.start - b.start);
  return { busy: all, missing, perUser };
}
