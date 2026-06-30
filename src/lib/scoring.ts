// Pure scoring engine — no React/UI dependencies

export type GameType = "vegas" | "best-ball" | "best-ball-second";

export interface HoleConfig {
  hole: number;
  par: number;
  strokeIndex: number; // 1–18 difficulty rank
}

export interface TeeBox {
  id: string;
  name: string;
  slope: number;
  rating: number;
  par: number;
}

export interface Course {
  id: string;
  name: string;
  tees: TeeBox[];
  holes: HoleConfig[];
}

export interface PlayerHoleResult {
  grossScore: number;
  strokesReceived: number;
  netScore: number;
}

export interface TeamHoleResult {
  players: [PlayerHoleResult, PlayerHoleResult];
  // Vegas
  rawNumber: number;
  finalNumber: number;
  hasBirdie: boolean;
  hasEagle: boolean;
  // Best Ball
  bestNet: number;
  secondNet: number;
}

export interface HoleResult {
  holeIndex: number; // 0-based
  gameType: GameType;
  teamA: TeamHoleResult;
  teamB: TeamHoleResult;
  isDoubled: boolean;
  rawDiff: number;
  points: number;
  winner: "A" | "B" | "tie";
}

/** Strokes a player receives on a hole given their total stroke count and the hole's stroke index. */
export function getStrokesReceived(strokeCount: number, strokeIndex: number): number {
  let strokes = 0;
  if (strokeIndex <= strokeCount) strokes += 1;
  if (strokeIndex <= strokeCount - 18) strokes += 1;
  return strokes;
}

/** Cap a net score for number-forming: anything ≥ 10 becomes 9. */
export function capNet(net: number): number {
  return net >= 10 ? 9 : net;
}

/** Form the two-digit team number: lower capped net first, higher second. */
export function formTeamNumber(net1: number, net2: number): number {
  const c1 = capNet(net1);
  const c2 = capNet(net2);
  const lo = Math.min(c1, c2);
  const hi = Math.max(c1, c2);
  return lo * 10 + hi;
}

/** Reverse the digits of a two-digit number (45 → 54). */
export function flipNumber(n: number): number {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  return ones * 10 + tens;
}

function playerResult(gross: number, strokes: number): PlayerHoleResult {
  return { grossScore: gross, strokesReceived: strokes, netScore: gross - strokes };
}

/** Score a single hole. All stroke counts are pre-computed totals (not handicap indices). */
export function scoreHole(
  hole: HoleConfig,
  strokeCounts: [number, number, number, number], // A1, A2, B1, B2
  grossScores: [number, number, number, number],  // A1, A2, B1, B2
  gameType: GameType = "vegas",
): HoleResult {
  const [sc_a1, sc_a2, sc_b1, sc_b2] = strokeCounts;
  const [g_a1, g_a2, g_b1, g_b2] = grossScores;
  const si = hole.strokeIndex;

  const a1 = playerResult(g_a1, getStrokesReceived(sc_a1, si));
  const a2 = playerResult(g_a2, getStrokesReceived(sc_a2, si));
  const b1 = playerResult(g_b1, getStrokesReceived(sc_b1, si));
  const b2 = playerResult(g_b2, getStrokesReceived(sc_b2, si));

  const par = hole.par;
  const teamAHasBirdie = a1.netScore <= par - 1 || a2.netScore <= par - 1;
  const teamBHasBirdie = b1.netScore <= par - 1 || b2.netScore <= par - 1;
  const teamAHasEagle  = a1.netScore <= par - 2 || a2.netScore <= par - 2;
  const teamBHasEagle  = b1.netScore <= par - 2 || b2.netScore <= par - 2;

  const bestNetA = Math.min(a1.netScore, a2.netScore);
  const secondNetA = Math.max(a1.netScore, a2.netScore);
  const bestNetB = Math.min(b1.netScore, b2.netScore);
  const secondNetB = Math.max(b1.netScore, b2.netScore);

  if (gameType === "best-ball" || gameType === "best-ball-second") {
    let winner: "A" | "B" | "tie";
    if (bestNetA < bestNetB) {
      winner = "A";
    } else if (bestNetB < bestNetA) {
      winner = "B";
    } else if (gameType === "best-ball-second") {
      winner = secondNetA < secondNetB ? "A" : secondNetB < secondNetA ? "B" : "tie";
    } else {
      winner = "tie";
    }
    const points = winner === "tie" ? 0 : 1;
    return {
      holeIndex: hole.hole - 1,
      gameType,
      teamA: { players: [a1, a2], rawNumber: bestNetA, finalNumber: bestNetA, hasBirdie: teamAHasBirdie, hasEagle: teamAHasEagle, bestNet: bestNetA, secondNet: secondNetA },
      teamB: { players: [b1, b2], rawNumber: bestNetB, finalNumber: bestNetB, hasBirdie: teamBHasBirdie, hasEagle: teamBHasEagle, bestNet: bestNetB, secondNet: secondNetB },
      isDoubled: false,
      rawDiff: Math.abs(bestNetA - bestNetB),
      points,
      winner,
    };
  }

  // Vegas
  const rawA = formTeamNumber(a1.netScore, a2.netScore);
  const rawB = formTeamNumber(b1.netScore, b2.netScore);
  const finalA = teamBHasBirdie ? flipNumber(rawA) : rawA;
  const finalB = teamAHasBirdie ? flipNumber(rawB) : rawB;
  const isDoubled = teamAHasEagle || teamBHasEagle;
  const diff = Math.abs(finalA - finalB);
  const points = diff * (isDoubled ? 2 : 1);
  const winner: "A" | "B" | "tie" = finalA < finalB ? "A" : finalB < finalA ? "B" : "tie";

  return {
    holeIndex: hole.hole - 1,
    gameType: "vegas",
    teamA: { players: [a1, a2], rawNumber: rawA, finalNumber: finalA, hasBirdie: teamAHasBirdie, hasEagle: teamAHasEagle, bestNet: bestNetA, secondNet: secondNetA },
    teamB: { players: [b1, b2], rawNumber: rawB, finalNumber: finalB, hasBirdie: teamBHasBirdie, hasEagle: teamBHasEagle, bestNet: bestNetB, secondNet: secondNetB },
    isDoubled,
    rawDiff: diff,
    points: winner === "tie" ? 0 : points,
    winner,
  };
}

/** Compute cumulative tally from an array of hole results. */
export function computeTally(results: HoleResult[]): { teamA: number; teamB: number } {
  let teamA = 0;
  let teamB = 0;
  for (const r of results) {
    if (r.winner === "A") teamA += r.points;
    else if (r.winner === "B") teamB += r.points;
  }
  return { teamA, teamB };
}
