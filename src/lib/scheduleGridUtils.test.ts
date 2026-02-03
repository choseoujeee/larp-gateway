import { describe, it, expect } from "vitest";
import { assignLanes, timeToMinutes } from "./scheduleGridUtils";

describe("scheduleGridUtils", () => {
  describe("timeToMinutes", () => {
    it("převede HH:MM na minuty od půlnoci", () => {
      expect(timeToMinutes("09:00")).toBe(9 * 60);
      expect(timeToMinutes("10:15")).toBe(10 * 60 + 15);
      expect(timeToMinutes("10:10")).toBe(610);
    });
  });

  describe("assignLanes", () => {
    it("přiřadí stejný lane dvěma událostem, které se nepřekrývají", () => {
      const events = [
        { id: "1", start_time: "09:00", duration_minutes: 30 },
        { id: "2", start_time: "09:30", duration_minutes: 30 },
      ];
      const withLanes = assignLanes(events);
      expect(withLanes[0].laneIndex).toBe(0);
      expect(withLanes[1].laneIndex).toBe(0);
    });

    it("přiřadí různé lane dvěma událostem se stejným začátkem", () => {
      const events = [
        { id: "1", start_time: "09:00", duration_minutes: 30 },
        { id: "2", start_time: "09:00", duration_minutes: 30 },
      ];
      const withLanes = assignLanes(events);
      expect(withLanes[0].laneIndex).toBe(0);
      expect(withLanes[1].laneIndex).toBe(1);
    });

    it("přiřadí různé lane dvěma událostem, které se časově překrývají", () => {
      const events = [
        { id: "1", start_time: "09:00", duration_minutes: 30 },
        { id: "2", start_time: "09:15", duration_minutes: 30 },
      ];
      const withLanes = assignLanes(events);
      expect(withLanes[0].laneIndex).toBe(0);
      expect(withLanes[1].laneIndex).toBe(1);
    });

    it("využije uvolněný lane po skončení události", () => {
      const events = [
        { id: "1", start_time: "09:00", duration_minutes: 30 },
        { id: "2", start_time: "09:15", duration_minutes: 30 },
        { id: "3", start_time: "09:45", duration_minutes: 15 },
      ];
      const withLanes = assignLanes(events);
      expect(withLanes[0].laneIndex).toBe(0);
      expect(withLanes[1].laneIndex).toBe(1);
      expect(withLanes[2].laneIndex).toBe(0);
    });
  });
});
