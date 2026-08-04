import { describe, it, expect } from "vitest";
import {
  eachDate,
  toBusyIntervals,
  computeFreeSlots,
  unionBusyAcrossUsers,
  DEFAULT_WORK_START_HOUR,
  DEFAULT_WORK_END_HOUR,
} from "../src/availability.js";

/** Build a local-time ISO-ish string the same way the module parses days. */
const at = (date, hour, minute = 0) =>
  new Date(`${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`).toISOString();

describe("eachDate", () => {
  it("skips weekends by default", () => {
    // 2026-08-03 is a Monday; 08-08 Sat, 08-09 Sun.
    expect(eachDate("2026-08-03", "2026-08-09")).toEqual([
      "2026-08-03",
      "2026-08-04",
      "2026-08-05",
      "2026-08-06",
      "2026-08-07",
    ]);
  });

  it("includes weekends when asked", () => {
    expect(eachDate("2026-08-07", "2026-08-10", { includeWeekends: true })).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
      "2026-08-10",
    ]);
  });

  it("returns a single weekday for a same-day range", () => {
    expect(eachDate("2026-08-04", "2026-08-04")).toEqual(["2026-08-04"]);
  });

  it("returns nothing when the range is a single weekend day", () => {
    expect(eachDate("2026-08-08", "2026-08-08")).toEqual([]);
  });

  it("does not drop the first day west of UTC (regression: UTC-midnight parsing)", () => {
    // new Date("2026-08-04") is UTC midnight, which is 2026-08-03 in EST. Iterating
    // on that would silently shift the whole range back a day.
    const dates = eachDate("2026-08-04", "2026-08-04");
    expect(dates).toContain("2026-08-04");
  });

  it("crosses month boundaries", () => {
    expect(eachDate("2026-07-30", "2026-08-03")).toEqual([
      "2026-07-30",
      "2026-07-31",
      "2026-08-03",
    ]);
  });

  it("returns an empty list when end precedes start", () => {
    expect(eachDate("2026-08-07", "2026-08-03")).toEqual([]);
  });
});

describe("toBusyIntervals", () => {
  it("drops all-day events", () => {
    const out = toBusyIntervals([
      { start: at("2026-08-04", 10), end: at("2026-08-04", 11), isAllDay: false },
      { start: at("2026-08-04", 0), end: at("2026-08-05", 0), isAllDay: true, title: "PTO" },
    ]);
    expect(out).toHaveLength(1);
  });

  it("sorts ascending by start", () => {
    const out = toBusyIntervals([
      { start: at("2026-08-04", 15), end: at("2026-08-04", 16) },
      { start: at("2026-08-04", 9), end: at("2026-08-04", 10) },
      { start: at("2026-08-04", 12), end: at("2026-08-04", 13) },
    ]);
    expect(out.map((e) => e.start.getHours())).toEqual([9, 12, 15]);
  });

  it("tolerates null, undefined and malformed entries", () => {
    expect(toBusyIntervals(null)).toEqual([]);
    expect(toBusyIntervals(undefined)).toEqual([]);
    expect(toBusyIntervals([null, {}, { start: "nonsense", end: "nonsense" }])).toEqual([]);
  });
});

describe("computeFreeSlots", () => {
  const dates = ["2026-08-04"];

  it("returns the whole working day when nothing is booked", () => {
    const slots = computeFreeSlots({ busy: [], dates, durationMinutes: 30 });
    expect(slots).toHaveLength(1);
    expect(slots[0].duration_minutes).toBe((DEFAULT_WORK_END_HOUR - DEFAULT_WORK_START_HOUR) * 60);
    expect(slots[0].date).toBe("2026-08-04");
  });

  it("splits the day around a single meeting", () => {
    const busy = toBusyIntervals([
      { start: at("2026-08-04", 12), end: at("2026-08-04", 13) },
    ]);
    const slots = computeFreeSlots({ busy, dates, durationMinutes: 30 });
    expect(slots.map((s) => s.duration_minutes)).toEqual([180, 300]);
  });

  it("excludes gaps shorter than the requested duration", () => {
    const busy = toBusyIntervals([
      { start: at("2026-08-04", 9, 30), end: at("2026-08-04", 17, 30) },
    ]);
    // Leaves 30 min at each end.
    expect(computeFreeSlots({ busy, dates, durationMinutes: 30 })).toHaveLength(2);
    expect(computeFreeSlots({ busy, dates, durationMinutes: 60 })).toHaveLength(0);
  });

  it("treats a nested meeting as already covered", () => {
    const busy = toBusyIntervals([
      { start: at("2026-08-04", 10), end: at("2026-08-04", 14) },
      { start: at("2026-08-04", 11), end: at("2026-08-04", 12) },
    ]);
    const slots = computeFreeSlots({ busy, dates, durationMinutes: 30 });
    expect(slots.map((s) => s.duration_minutes)).toEqual([60, 240]);
  });

  it("merges overlapping meetings rather than reopening a gap", () => {
    const busy = toBusyIntervals([
      { start: at("2026-08-04", 10), end: at("2026-08-04", 12) },
      { start: at("2026-08-04", 11), end: at("2026-08-04", 13) },
    ]);
    const slots = computeFreeSlots({ busy, dates, durationMinutes: 30 });
    expect(slots.map((s) => s.duration_minutes)).toEqual([60, 300]);
  });

  it("clamps meetings that start before or end after working hours", () => {
    const busy = toBusyIntervals([
      { start: at("2026-08-04", 7), end: at("2026-08-04", 10) },
      { start: at("2026-08-04", 16), end: at("2026-08-04", 20) },
    ]);
    const slots = computeFreeSlots({ busy, dates, durationMinutes: 30 });
    expect(slots.map((s) => s.duration_minutes)).toEqual([360]);
  });

  it("ignores events on other days", () => {
    const busy = toBusyIntervals([
      { start: at("2026-08-05", 9), end: at("2026-08-05", 18) },
    ]);
    const slots = computeFreeSlots({ busy, dates, durationMinutes: 30 });
    expect(slots).toHaveLength(1);
    expect(slots[0].duration_minutes).toBe(540);
  });

  it("honours custom working hours", () => {
    const slots = computeFreeSlots({
      busy: [],
      dates,
      durationMinutes: 30,
      workStartHour: 6,
      workEndHour: 22,
    });
    expect(slots[0].duration_minutes).toBe(960);
  });

  it("returns nothing when the window is inverted or empty", () => {
    expect(
      computeFreeSlots({ busy: [], dates, durationMinutes: 30, workStartHour: 18, workEndHour: 9 })
    ).toEqual([]);
    expect(computeFreeSlots({ busy: [], dates: [], durationMinutes: 30 })).toEqual([]);
  });

  it("emits one entry per date across a multi-day range", () => {
    const slots = computeFreeSlots({
      busy: [],
      dates: eachDate("2026-08-03", "2026-08-07"),
      durationMinutes: 30,
    });
    expect(slots).toHaveLength(5);
    expect(new Set(slots.map((s) => s.date)).size).toBe(5);
  });
});

describe("unionBusyAcrossUsers", () => {
  const data = {
    "user-a": { events: [{ start: at("2026-08-04", 10), end: at("2026-08-04", 11) }] },
    "user-b": { events: [{ start: at("2026-08-04", 14), end: at("2026-08-04", 15) }] },
  };

  it("combines every attendee's busy time into one sorted list", () => {
    const { busy } = unionBusyAcrossUsers(data, ["user-a", "user-b"]);
    expect(busy).toHaveLength(2);
    expect(busy[0].start.getTime()).toBeLessThan(busy[1].start.getTime());
  });

  it("reports users the API returned nothing for instead of treating them as free", () => {
    const { missing, perUser } = unionBusyAcrossUsers(data, ["user-a", "ghost"]);
    expect(missing).toEqual(["ghost"]);
    expect(perUser).toEqual({ "user-a": 1, ghost: 0 });
  });

  it("produces an intersection where a slot must clear every attendee", () => {
    const { busy } = unionBusyAcrossUsers(data, ["user-a", "user-b"]);
    const slots = computeFreeSlots({ busy, dates: ["2026-08-04"], durationMinutes: 30 });
    // 9-10, 11-14, 15-18 — neither person's meeting survives the intersection.
    expect(slots.map((s) => s.duration_minutes)).toEqual([60, 180, 180]);
  });

  it("handles an entirely empty response", () => {
    const { busy, missing } = unionBusyAcrossUsers({}, ["user-a"]);
    expect(busy).toEqual([]);
    expect(missing).toEqual(["user-a"]);
  });
});
