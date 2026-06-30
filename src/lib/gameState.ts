import { scoreHole, computeTally, type HoleResult, type Course, type GameType } from "./scoring";
export type { GameType };

export type BettingFormat = "per-hole" | "standard" | "nassau";

export interface Player {
  name: string;
}

export type HandicapMode = "course" | "manual";

export interface GameSetup {
  players: [Player, Player, Player, Player]; // A1, A2, B1, B2
  dollarRate: number; // Vegas: $/pt; best-ball per-hole: $/hole
  course: Course;
  teeId: string;
  gameType: GameType;
  handicapMode: HandicapMode;
  strokeCounts: [number, number, number, number]; // final stroke counts
  // Best Ball betting
  bettingFormat: BettingFormat;
  nassauFront: number;
  nassauBack: number;
  nassauTotal: number;
  standardAmount: number;
}

export interface HoleEntry {
  grossScores: [number, number, number, number]; // A1, A2, B1, B2
}

export interface GameState {
  phase: "setup" | "play" | "complete";
  setup: GameSetup | null;
  entries: HoleEntry[];
  holeResults: HoleResult[];
  tally: { teamA: number; teamB: number };
}

export type GameAction =
  | { type: "START_GAME"; setup: GameSetup }
  | { type: "UPDATE_SETUP"; setup: GameSetup }
  | { type: "BACK_TO_SETUP" }
  | { type: "ENTER_SCORES"; holeIndex: number; grossScores: [number, number, number, number] }
  | { type: "EDIT_HOLE"; holeIndex: number }
  | { type: "FINISH_ROUND" }
  | { type: "RESUME_GAME"; state: GameState }
  | { type: "RESET" };

export const initialState: GameState = {
  phase: "setup",
  setup: null,
  entries: [],
  holeResults: [],
  tally: { teamA: 0, teamB: 0 },
};

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "START_GAME": {
      return {
        phase: "play",
        setup: action.setup,
        entries: [],
        holeResults: [],
        tally: { teamA: 0, teamB: 0 },
      };
    }

    case "ENTER_SCORES": {
      if (!state.setup) return state;
      const { holeIndex, grossScores } = action;
      const { course, strokeCounts } = state.setup;
      const hole = course.holes[holeIndex];
      const result = scoreHole(hole, strokeCounts, grossScores, state.setup.gameType);

      const entries = [...state.entries];
      const holeResults = [...state.holeResults];
      entries[holeIndex] = { grossScores };
      holeResults[holeIndex] = result;

      // Re-compute tally from all present results
      const tally = computeTally(holeResults.filter(Boolean));

      const isLast = holeIndex === course.holes.length - 1;
      const allComplete = holeResults.filter(Boolean).length === course.holes.length;

      return {
        ...state,
        entries,
        holeResults,
        tally,
        phase: isLast && allComplete ? "complete" : "play",
      };
    }

    case "EDIT_HOLE": {
      // Reopen a previously entered hole (go back to play phase if in complete)
      return { ...state, phase: "play" };
    }

    case "FINISH_ROUND": {
      return { ...state, phase: "complete" };
    }

    case "BACK_TO_SETUP": {
      return { ...state, phase: "setup" };
    }

    case "UPDATE_SETUP": {
      const newEntries = [...state.entries];
      const newHoleResults = state.holeResults.map((r, i) => {
        if (!r) return r;
        const hole = action.setup.course.holes[i];
        const entry = newEntries[i];
        if (!hole || !entry) return r;
        return scoreHole(hole, action.setup.strokeCounts, entry.grossScores, action.setup.gameType);
      });
      const tally = computeTally(newHoleResults.filter(Boolean) as HoleResult[]);
      return { ...state, setup: action.setup, holeResults: newHoleResults, tally, phase: "play" };
    }

    case "RESUME_GAME": {
      return action.state;
    }

    case "RESET": {
      return initialState;
    }

    default:
      return state;
  }
}

export function currentHoleIndex(state: GameState): number {
  // First hole without an entry, or last hole
  const totalHoles = state.setup?.course.holes.length ?? 18;
  for (let i = 0; i < totalHoles; i++) {
    if (!state.entries[i]) return i;
  }
  return totalHoles - 1;
}
