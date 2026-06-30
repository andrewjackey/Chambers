"use client";
import { useReducer, useEffect, useState } from "react";
import { gameReducer, initialState } from "@/lib/gameState";
import { loadTrip, saveTrip, type TripState, type CompletedRound } from "@/lib/tripState";
import SetupScreen from "@/components/SetupScreen";
import ScoreEntryScreen from "@/components/ScoreEntryScreen";
import SummaryScreen from "@/components/SummaryScreen";
import HomePage from "@/components/HomePage";
import RoundDetailScreen from "@/components/RoundDetailScreen";
import type { GameSetup, GameState } from "@/lib/gameState";

const ROUND_KEY = "chambers-golf-round";

function loadActiveRound(): GameState | null {
  try {
    const raw = localStorage.getItem(ROUND_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.phase === "play" || parsed.phase === "complete") return parsed;
    return null;
  } catch {
    return null;
  }
}

function persistRound(state: GameState) {
  try {
    if (state.phase === "setup" && !state.setup) {
      localStorage.removeItem(ROUND_KEY);
    } else {
      localStorage.setItem(ROUND_KEY, JSON.stringify(state));
    }
  } catch {}
}

type Screen = "home" | "in-round" | "round-detail";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [roundState, dispatch] = useReducer(gameReducer, initialState);
  const [trip, setTrip] = useState<TripState>({ rounds: [] });
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<GameState | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    setTrip(loadTrip());
    setActiveRound(loadActiveRound());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized || screen !== "in-round") return;
    persistRound(roundState);
  }, [roundState, screen, initialized]);

  function startNewRound() {
    dispatch({ type: "RESET" });
    setScreen("in-round");
  }

  function resumeRound() {
    if (!activeRound) return;
    dispatch({ type: "RESUME_GAME", state: activeRound });
    setActiveRound(null);
    setScreen("in-round");
  }

  function dismissActiveRound() {
    localStorage.removeItem(ROUND_KEY);
    setActiveRound(null);
  }

  function saveRoundToTrip() {
    if (!roundState.setup) return;
    const completed: CompletedRound = {
      id: crypto.randomUUID(),
      completedAt: new Date().toISOString(),
      setup: roundState.setup,
      entries: roundState.entries,
      holeResults: roundState.holeResults,
      tally: roundState.tally,
    };
    const newTrip = { rounds: [...trip.rounds, completed] };
    setTrip(newTrip);
    saveTrip(newTrip);
    localStorage.removeItem(ROUND_KEY);
    dispatch({ type: "RESET" });
    setScreen("home");
  }

  function viewRound(id: string) {
    setSelectedRoundId(id);
    setScreen("round-detail");
  }

  function deleteRound(id: string) {
    const newTrip = { rounds: trip.rounds.filter((r) => r.id !== id) };
    setTrip(newTrip);
    saveTrip(newTrip);
    setScreen("home");
  }

  if (screen === "round-detail") {
    const round = trip.rounds.find((r) => r.id === selectedRoundId);
    if (!round) {
      setScreen("home");
      return null;
    }
    const roundNumber = trip.rounds.findIndex((r) => r.id === selectedRoundId) + 1;
    return <RoundDetailScreen round={round} roundNumber={roundNumber} onBack={() => setScreen("home")} onDelete={() => deleteRound(round.id)} />;
  }

  if (screen === "in-round") {
    const lastSetup = trip.rounds.length > 0 ? trip.rounds[trip.rounds.length - 1].setup : null;

    if (roundState.phase === "setup") {
      return (
        <SetupScreen
          existingSetup={roundState.setup ?? lastSetup}
          roundNumber={trip.rounds.length + 1}
          onStart={(setup: GameSetup) =>
            roundState.setup
              ? dispatch({ type: "UPDATE_SETUP", setup })
              : dispatch({ type: "START_GAME", setup })
          }
          onCancel={() => {
            dispatch({ type: "RESET" });
            setScreen("home");
          }}
        />
      );
    }

    if (roundState.phase === "play") {
      return (
        <ScoreEntryScreen
          state={roundState}
          onEnterScores={(holeIndex, grossScores) =>
            dispatch({ type: "ENTER_SCORES", holeIndex, grossScores })
          }
          onEditHole={(holeIndex) => dispatch({ type: "EDIT_HOLE", holeIndex })}
          onFinish={() => dispatch({ type: "FINISH_ROUND" })}
          onBackToSetup={() => dispatch({ type: "BACK_TO_SETUP" })}
          onNewRound={() => {
            localStorage.removeItem(ROUND_KEY);
            dispatch({ type: "RESET" });
          }}
        />
      );
    }

    return (
      <SummaryScreen
        state={roundState}
        onSaveToTrip={saveRoundToTrip}
        onEditScores={() => dispatch({ type: "EDIT_HOLE", holeIndex: 0 })}
      />
    );
  }

  return (
    <HomePage
      trip={trip}
      activeRound={activeRound}
      onStartNewRound={startNewRound}
      onResumeRound={resumeRound}
      onDismissResume={dismissActiveRound}
      onViewRound={viewRound}
    />
  );
}
