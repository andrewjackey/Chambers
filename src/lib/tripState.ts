import type { GameSetup, HoleEntry } from "./gameState";
import type { HoleResult } from "./scoring";

export interface CompletedRound {
  id: string;
  completedAt: string; // ISO date
  setup: GameSetup;
  entries: HoleEntry[];
  holeResults: HoleResult[];
  tally: { teamA: number; teamB: number };
}

export interface TripState {
  rounds: CompletedRound[];
}

export const TRIP_KEY = "chambers-trip";

export function loadTrip(): TripState {
  try {
    const raw = localStorage.getItem(TRIP_KEY);
    if (!raw) return { rounds: [] };
    return JSON.parse(raw) as TripState;
  } catch {
    return { rounds: [] };
  }
}

export function saveTrip(trip: TripState): void {
  try {
    localStorage.setItem(TRIP_KEY, JSON.stringify(trip));
  } catch {}
}

export interface RoundPayout {
  winnerTeam: "A" | "B" | "tie";
  amount: number;
  detail: string;
}

export function computeRoundPayout(round: CompletedRound): RoundPayout {
  const { setup, tally, holeResults } = round;
  const { gameType, dollarRate, bettingFormat, nassauFront, nassauBack, nassauTotal, standardAmount } = setup;
  const valid = holeResults.filter(Boolean) as HoleResult[];
  const wonA = valid.filter(r => r.winner === "A").length;
  const wonB = valid.filter(r => r.winner === "B").length;

  if (gameType === "vegas") {
    const net = tally.teamA - tally.teamB;
    if (net === 0) return { winnerTeam: "tie", amount: 0, detail: "All Square" };
    return {
      winnerTeam: net > 0 ? "A" : "B",
      amount: Math.abs(net) * dollarRate,
      detail: `${Math.abs(net)} pts × $${dollarRate.toFixed(2)}`,
    };
  }

  if (bettingFormat === "per-hole") {
    const net = wonA - wonB;
    if (net === 0) return { winnerTeam: "tie", amount: 0, detail: "All Square" };
    return {
      winnerTeam: net > 0 ? "A" : "B",
      amount: Math.abs(net) * dollarRate,
      detail: `${Math.abs(net)} holes × $${dollarRate.toFixed(2)}`,
    };
  }

  if (bettingFormat === "standard") {
    if (wonA === wonB) return { winnerTeam: "tie", amount: 0, detail: "All Square" };
    return {
      winnerTeam: wonA > wonB ? "A" : "B",
      amount: standardAmount,
      detail: `${Math.max(wonA, wonB)}-${Math.min(wonA, wonB)} holes`,
    };
  }

  // Nassau
  const fA = valid.filter(r => r.holeIndex < 9 && r.winner === "A").length;
  const fB = valid.filter(r => r.holeIndex < 9 && r.winner === "B").length;
  const bA = valid.filter(r => r.holeIndex >= 9 && r.winner === "A").length;
  const bB = valid.filter(r => r.holeIndex >= 9 && r.winner === "B").length;
  const fW = fA > fB ? "A" : fB > fA ? "B" : "tie";
  const bW = bA > bB ? "A" : bB > bA ? "B" : "tie";
  const tW = (fA + bA) > (fB + bB) ? "A" : (fB + bB) > (fA + bA) ? "B" : "tie";
  const nA = (fW === "A" ? nassauFront : 0) + (bW === "A" ? nassauBack : 0) + (tW === "A" ? nassauTotal : 0);
  const nB = (fW === "B" ? nassauFront : 0) + (bW === "B" ? nassauBack : 0) + (tW === "B" ? nassauTotal : 0);
  const net = nA - nB;
  if (net === 0) return { winnerTeam: "tie", amount: 0, detail: "Nassau: All Square" };
  return { winnerTeam: net > 0 ? "A" : "B", amount: Math.abs(net), detail: "Nassau" };
}

export interface PlayerScores {
  gross: number;
  net: number;
  strokes: number;
  holesPlayed: number;
}

export function getPlayerScores(round: CompletedRound, playerIdx: 0 | 1 | 2 | 3): PlayerScores {
  const strokes = round.setup.strokeCounts[playerIdx];
  let gross = 0;
  let net = 0;
  let holesPlayed = 0;
  for (const result of round.holeResults) {
    if (!result) continue;
    holesPlayed++;
    const team = playerIdx < 2 ? result.teamA : result.teamB;
    const p = team.players[playerIdx % 2 as 0 | 1];
    gross += p.grossScore;
    net += p.netScore;
  }
  return { gross, net, strokes, holesPlayed };
}

export function computeTripTotals(rounds: CompletedRound[]): { teamA: number; teamB: number } {
  let teamA = 0;
  let teamB = 0;
  for (const round of rounds) {
    const p = computeRoundPayout(round);
    if (p.winnerTeam === "A") teamA += p.amount;
    else if (p.winnerTeam === "B") teamB += p.amount;
  }
  return { teamA, teamB };
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
