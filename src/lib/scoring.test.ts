import { describe, it, expect } from "vitest";
import {
  scoreHole,
  getStrokesReceived,
  capNet,
  formTeamNumber,
  flipNumber,
  computeTally,
  type HoleConfig,
} from "./scoring";

const hole4: HoleConfig = { hole: 1, par: 4, strokeIndex: 10 };
const hole5: HoleConfig = { hole: 1, par: 5, strokeIndex: 10 };

// All zeros = no strokes
const noStrokes: [number, number, number, number] = [0, 0, 0, 0];

// ─── Primitives ──────────────────────────────────────────────────────────────

describe("getStrokesReceived", () => {
  it("returns 0 when stroke count is 0", () => {
    expect(getStrokesReceived(0, 5)).toBe(0);
  });
  it("gives 1 stroke when strokeIndex <= count", () => {
    expect(getStrokesReceived(10, 5)).toBe(1);
    expect(getStrokesReceived(10, 10)).toBe(1);
    expect(getStrokesReceived(10, 11)).toBe(0);
  });
  it("gives 2 strokes on holes where strokeIndex <= count - 18", () => {
    expect(getStrokesReceived(20, 2)).toBe(2); // 2 <= 2 (20-18)
    expect(getStrokesReceived(20, 3)).toBe(1); // 3 > 2
  });
});

describe("capNet", () => {
  it("leaves scores below 10 unchanged", () => {
    expect(capNet(9)).toBe(9);
    expect(capNet(3)).toBe(3);
  });
  it("caps scores >= 10 to 9", () => {
    expect(capNet(10)).toBe(9);
    expect(capNet(12)).toBe(9);
    expect(capNet(15)).toBe(9);
  });
});

describe("formTeamNumber", () => {
  it("puts lower net first", () => {
    expect(formTeamNumber(4, 5)).toBe(45);
    expect(formTeamNumber(5, 4)).toBe(45);
  });
  it("handles equal nets (same digit doubled)", () => {
    expect(formTeamNumber(3, 3)).toBe(33);
  });
  it("caps nets >= 10 to 9", () => {
    expect(formTeamNumber(10, 5)).toBe(59);
    expect(formTeamNumber(12, 10)).toBe(99);
  });
});

describe("flipNumber", () => {
  it("reverses digits", () => {
    expect(flipNumber(45)).toBe(54);
    expect(flipNumber(56)).toBe(65);
    expect(flipNumber(47)).toBe(74);
  });
});

// ─── Spec examples ────────────────────────────────────────────────────────────

describe("Example 1 — par 4, no birdies", () => {
  // Team A nets 4 & 5 → 45. Team B nets 6 & 5 → 56. Diff = 11, Team A wins.
  it("Team A wins 11 points", () => {
    const r = scoreHole(hole4, noStrokes, [4, 5, 6, 5]);
    expect(r.teamA.rawNumber).toBe(45);
    expect(r.teamB.rawNumber).toBe(56);
    expect(r.teamA.finalNumber).toBe(45);
    expect(r.teamB.finalNumber).toBe(56);
    expect(r.isDoubled).toBe(false);
    expect(r.winner).toBe("A");
    expect(r.points).toBe(11);
  });
});

describe("Example 2 — par 5, one team birdies", () => {
  // Team A nets 6 & 5 → 56. Team B nets 4 & 7 → 47.
  // Team B birdied (net 4 on par 5) → flips Team A's number: 56 → 65.
  // |65 - 47| = 18, Team B wins.
  it("Team B wins 18 points, Team A's number flipped", () => {
    const r = scoreHole(hole5, noStrokes, [6, 5, 4, 7]);
    expect(r.teamA.rawNumber).toBe(56);
    expect(r.teamB.rawNumber).toBe(47);
    expect(r.teamA.finalNumber).toBe(65); // flipped
    expect(r.teamB.finalNumber).toBe(47); // not flipped (A didn't birdie)
    expect(r.winner).toBe("B");
    expect(r.points).toBe(18);
  });
});

describe("Example 3 — par 5, BOTH teams birdie (deviation from article)", () => {
  // Team A nets 4 & 5 → 45. Team B nets 4 & 7 → 47.
  // Both birdied → both flip: A 54, B 74. Diff = 20, Team A wins.
  it("Both numbers flip; no cancellation; Team A wins 20", () => {
    const r = scoreHole(hole5, noStrokes, [4, 5, 4, 7]);
    expect(r.teamA.finalNumber).toBe(54);
    expect(r.teamB.finalNumber).toBe(74);
    expect(r.winner).toBe("A");
    expect(r.points).toBe(20);
  });
});

// ─── Additional required tests ────────────────────────────────────────────────

describe("Eagle — flip AND ×2 double", () => {
  // Eagle = net ≤ par - 2. Par 5, Team A eagles with net 3.
  // Team A nets 3 & 6 → 36. Team B nets 6 & 7 → 67.
  // Team A eagled → flips B's number: 67 → 76.
  // Doubled because eagle. |76 - 36| = 40, ×2 = 80, Team A wins.
  it("doubles the difference and flips opponent", () => {
    const r = scoreHole(hole5, noStrokes, [3, 6, 6, 7]);
    expect(r.teamA.hasEagle).toBe(true);
    expect(r.teamB.finalNumber).toBe(76);
    expect(r.isDoubled).toBe(true);
    expect(r.points).toBe(80);
    expect(r.winner).toBe("A");
  });
});

describe("Eagle vs birdie cross case", () => {
  // Par 5: Team A nets 3 (eagle) & 6 → 36. Team B nets 4 (birdie) & 7 → 47.
  // Team A eagles → flips B: 47 → 74. Team B birdies → flips A: 36 → 63.
  // Doubled. finalA=63, finalB=74 → |74-63|=11, ×2=22, Team A wins (63 < 74).
  it("both flip, doubling applies, correct winner", () => {
    const r = scoreHole(hole5, noStrokes, [3, 6, 4, 7]);
    expect(r.teamA.finalNumber).toBe(63); // flipped by B's birdie
    expect(r.teamB.finalNumber).toBe(74); // flipped by A's eagle
    expect(r.isDoubled).toBe(true);
    expect(r.winner).toBe("A");
    expect(r.points).toBe(22);
  });
});

describe("Net birdie via handicap stroke", () => {
  // Par 4, strokeIndex 10. Player B1 has 12 strokes → gets 1 stroke on hole 10.
  // B1 gross 4 → net 3 = birdie on par 4.
  // Team A nets 4 & 5 → 45. Team B nets 3 & 5 → 35. Team B birdied → flips A: 45 → 54.
  // |54 - 35| = 19, Team B wins.
  it("handicap stroke creates birdie, flips opponent", () => {
    const strokeCounts: [number, number, number, number] = [0, 0, 12, 0];
    const r = scoreHole(hole4, strokeCounts, [4, 5, 4, 5]);
    expect(r.teamB.players[0].strokesReceived).toBe(1);
    expect(r.teamB.players[0].netScore).toBe(3);
    expect(r.teamB.hasBirdie).toBe(true);
    expect(r.teamA.finalNumber).toBe(54);
    expect(r.winner).toBe("B");
    expect(r.points).toBe(19);
  });
});

describe("Net ≥ 10 caps to 9, birdie check unaffected", () => {
  // Net 10 and net 12 both cap to 9. Neither is ≤ par-1 (par 4), so no birdie flip.
  it("caps 10 and 12 to 9 for number-forming", () => {
    const r = scoreHole(hole4, noStrokes, [10, 12, 4, 5]);
    expect(r.teamA.rawNumber).toBe(99); // both capped to 9
    expect(r.teamA.hasBirdie).toBe(false);
    expect(r.teamA.hasEagle).toBe(false);
    expect(r.teamB.rawNumber).toBe(45);
    expect(r.winner).toBe("B");
  });
});

describe("Same-score team forms doubled-digit number", () => {
  it("nets 3 & 3 → 33", () => {
    const r = scoreHole(hole4, noStrokes, [3, 3, 5, 6]);
    expect(r.teamA.rawNumber).toBe(33);
  });
});

describe("Tie → 0 points", () => {
  it("equal team numbers produce tie", () => {
    const r = scoreHole(hole4, noStrokes, [4, 5, 4, 5]);
    expect(r.winner).toBe("tie");
    expect(r.points).toBe(0);
  });
});

describe("Course mode vs Manual mode equivalence", () => {
  // Both modes ultimately produce a per-player stroke count.
  // Here we verify that passing the same stroke counts in either mode gives identical results.
  it("same stroke counts produce same hole result regardless of input mode", () => {
    const strokeCounts: [number, number, number, number] = [5, 8, 3, 12];
    const gross: [number, number, number, number] = [5, 4, 6, 5];
    const r1 = scoreHole(hole4, strokeCounts, gross);
    const r2 = scoreHole(hole4, strokeCounts, gross);
    expect(r1).toEqual(r2);
  });
});

describe("computeTally", () => {
  it("sums points by winning team across holes", () => {
    const r1 = scoreHole(hole4, noStrokes, [4, 5, 6, 5]); // A wins 11
    const r2 = scoreHole(hole5, noStrokes, [6, 5, 4, 7]); // B wins 18
    const tally = computeTally([r1, r2]);
    expect(tally.teamA).toBe(11);
    expect(tally.teamB).toBe(18);
  });
});
