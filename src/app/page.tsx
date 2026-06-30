"use client";
import { useReducer, useEffect, useState } from "react";
import { gameReducer, initialState } from "@/lib/gameState";
import SetupScreen from "@/components/SetupScreen";
import ScoreEntryScreen from "@/components/ScoreEntryScreen";
import SummaryScreen from "@/components/SummaryScreen";
import type { GameSetup, GameState } from "@/lib/gameState";

const STORAGE_KEY = "chambers-golf-round";

function loadSavedState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.phase === "setup" || !parsed.setup) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: GameState) {
  try {
    if (state.phase === "setup" && !state.setup) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  } catch {}
}

export default function Home() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const [savedState, setSavedState] = useState<GameState | null>(null);
  const [checkedStorage, setCheckedStorage] = useState(false);

  useEffect(() => {
    setSavedState(loadSavedState());
    setCheckedStorage(true);
  }, []);

  useEffect(() => {
    if (checkedStorage) saveState(state);
  }, [state, checkedStorage]);

  function resumeRound() {
    if (!savedState) return;
    dispatch({ type: "RESUME_GAME", state: savedState });
    setSavedState(null);
  }

  function dismissSaved() {
    localStorage.removeItem(STORAGE_KEY);
    setSavedState(null);
  }

  if (state.phase === "setup") {
    return (
      <>
        {savedState && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-blue-900 border border-blue-700 rounded-2xl p-6 max-w-sm w-full text-white text-center">
              <div className="text-3xl mb-3">⛳</div>
              <h2 className="text-lg font-bold mb-1">Resume Round?</h2>
              <p className="text-blue-400 text-sm mb-1">
                {savedState.setup?.course.name}
              </p>
              <p className="text-blue-500 text-xs mb-5">
                {savedState.holeResults.filter(Boolean).length} of {savedState.setup?.course.holes.length} holes complete
              </p>
              <button
                onClick={resumeRound}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl mb-2 transition-colors"
              >
                Resume Round
              </button>
              <button
                onClick={dismissSaved}
                className="w-full bg-blue-800/60 hover:bg-blue-700/60 text-blue-300 py-3 rounded-xl text-sm transition-colors"
              >
                Start New Round
              </button>
            </div>
          </div>
        )}
        <SetupScreen
          existingSetup={state.setup}
          onStart={(setup: GameSetup) =>
            state.setup
              ? dispatch({ type: "UPDATE_SETUP", setup })
              : dispatch({ type: "START_GAME", setup })
          }
        />
      </>
    );
  }

  if (state.phase === "play") {
    return (
      <ScoreEntryScreen
        state={state}
        onEnterScores={(holeIndex, grossScores) =>
          dispatch({ type: "ENTER_SCORES", holeIndex, grossScores })
        }
        onEditHole={(holeIndex) => dispatch({ type: "EDIT_HOLE", holeIndex })}
        onFinish={() => dispatch({ type: "FINISH_ROUND" })}
        onBackToSetup={() => dispatch({ type: "BACK_TO_SETUP" })}
        onNewRound={() => {
          localStorage.removeItem(STORAGE_KEY);
          dispatch({ type: "RESET" });
        }}
      />
    );
  }

  return (
    <SummaryScreen
      state={state}
      onReset={() => {
        localStorage.removeItem(STORAGE_KEY);
        dispatch({ type: "RESET" });
      }}
    />
  );
}
