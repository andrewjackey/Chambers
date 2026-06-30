"use client";
import { useState } from "react";
import { getPlayerScores, computeRoundPayout, formatDate, type CompletedRound } from "@/lib/tripState";

const PLAYERS = ["Drew", "Aaron", "Graham", "Clayton"] as const;

interface Props {
  round: CompletedRound;
  roundNumber: number;
  onBack: () => void;
  onDelete: () => void;
}

export default function RoundDetailScreen({ round, roundNumber, onBack, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { setup, holeResults } = round;
  const payout = computeRoundPayout(round);
  const tee = setup.course.tees.find((t) => t.id === setup.teeId);

  return (
    <div className="min-h-screen bg-gray-200 text-gray-900 flex flex-col">
      <div className="bg-blue-950 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-blue-300 text-2xl leading-none w-8">‹</button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Round {roundNumber}</h1>
          <p className="text-blue-300 text-sm">{setup.course.name} · {formatDate(round.completedAt)}</p>
        </div>
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="text-xs text-blue-400 hover:text-red-400 transition-colors">
            Delete
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={onDelete} className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg">Confirm</button>
            <button onClick={() => setConfirmDelete(false)} className="text-xs text-blue-400">Cancel</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Round result */}
        <div
          className={`rounded-2xl p-5 text-center text-white ${
            payout.winnerTeam === "A" ? "bg-red-600" : payout.winnerTeam === "B" ? "bg-orange-500" : "bg-blue-700"
          }`}
        >
          {payout.winnerTeam === "tie" ? (
            <>
              <div className="text-2xl font-bold">All Square</div>
              <div className="text-white/70 text-sm mt-1">{payout.detail}</div>
            </>
          ) : (
            <>
              <div className="text-sm text-white/80">
                {payout.winnerTeam === "A" ? "Olds" : "Youths"} win
              </div>
              <div className="text-4xl font-bold mt-1">{payout.amount} <span className="text-2xl">pts</span></div>
              <div className="text-white/70 text-xs mt-1">{payout.detail}</div>
            </>
          )}
        </div>

        {/* Player scores */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Player Scores</h2>
          <div className="space-y-1.5">
            {([0, 1, 2, 3] as const).map((idx) => {
              const scores = getPlayerScores(round, idx);
              const isTeamA = idx < 2;
              return (
                <div key={idx}>
                  {idx === 2 && <div className="border-t border-gray-200 my-2" />}
                  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${isTeamA ? "bg-red-50" : "bg-orange-50"}`}>
                    <div className={`text-sm font-semibold w-16 flex-shrink-0 ${isTeamA ? "text-red-700" : "text-orange-700"}`}>
                      {PLAYERS[idx]}
                    </div>
                    <div className="flex-1 flex items-baseline justify-end gap-3">
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">{scores.gross}</span>
                        <span className="text-xs text-gray-400 ml-1">gross</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-900">{scores.net}</span>
                        <span className="text-xs text-gray-400 ml-1">net</span>
                      </div>
                      <div className="text-xs text-gray-400 w-14 text-right flex-shrink-0">
                        {scores.strokes} strokes
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Setup info */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Round Info</h2>
          <div className="text-sm text-gray-700 space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Tees</span>
              <span>{tee?.name} ({tee?.rating}/{tee?.slope})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Game</span>
              <span>{setup.gameType === "vegas" ? "Vegas" : setup.gameType === "best-ball" ? "Best Ball" : "Best Ball 2nd Kicker"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Holes played</span>
              <span>{holeResults.filter(Boolean).length} / {setup.course.holes.length}</span>
            </div>
          </div>
        </div>

        {/* Hole by hole */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Hole by Hole</h2>
          <div className="space-y-1">
            {holeResults.map((result, i) => {
              if (!result) return <div key={i} className="text-xs text-gray-400 px-2 py-1">Hole {i + 1} — not played</div>;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                    result.winner === "A"
                      ? "bg-red-50 border border-red-100"
                      : result.winner === "B"
                      ? "bg-orange-50 border border-orange-100"
                      : "bg-gray-200 border border-gray-300"
                  }`}
                >
                  <div className="w-5 text-xs text-gray-400 text-right">{i + 1}</div>
                  <div className="text-xs text-gray-400 w-5">p{setup.course.holes[i].par}</div>
                  <div className="flex-1 font-mono text-xs">
                    <span className="text-red-600 font-semibold">{result.teamA.finalNumber}</span>
                    <span className="text-gray-400 mx-1">vs</span>
                    <span className="text-orange-600 font-semibold">{result.teamB.finalNumber}</span>
                    {result.isDoubled && <span className="text-yellow-600 ml-1">×2</span>}
                  </div>
                  {result.winner !== "tie" ? (
                    <div className={`text-xs font-semibold ${result.winner === "A" ? "text-red-600" : "text-orange-600"}`}>
                      {result.winner === "A" ? "Olds" : "Youths"} +{result.points}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">tie</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
