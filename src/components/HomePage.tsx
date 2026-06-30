"use client";
import { computeRoundPayout, computeTripTotals, formatDate, type TripState } from "@/lib/tripState";
import type { GameState } from "@/lib/gameState";

const TEAM_A = "Drew & Aaron";
const TEAM_B = "Graham & Clayton";

interface Props {
  trip: TripState;
  activeRound: GameState | null;
  onStartNewRound: () => void;
  onResumeRound: () => void;
  onDismissResume: () => void;
  onViewRound: (id: string) => void;
}

export default function HomePage({ trip, activeRound, onStartNewRound, onResumeRound, onDismissResume, onViewRound }: Props) {
  const totals = computeTripTotals(trip.rounds);
  const netA = totals.teamA - totals.teamB;
  const reversedRounds = [...trip.rounds].reverse();

  return (
    <div className="min-h-screen bg-gray-200 text-gray-900 flex flex-col">
      <div className="bg-blue-950 px-6 py-6 text-center">
        <div className="text-3xl mb-1">⛳</div>
        <h1 className="text-xl font-bold text-white">Seattle 4th of July Trip</h1>
        <p className="text-blue-300 text-sm">{TEAM_A} vs. {TEAM_B}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Resume active round */}
        {activeRound && (
          <div className="bg-blue-900 rounded-xl p-4 text-white border border-blue-700">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="font-semibold">Round In Progress</div>
                <div className="text-blue-300 text-sm">
                  {activeRound.setup?.course.name} · {activeRound.holeResults.filter(Boolean).length} holes played
                </div>
              </div>
              <button onClick={onDismissResume} className="text-blue-400 text-xs hover:text-blue-200 pt-0.5">
                discard
              </button>
            </div>
            <button
              onClick={onResumeRound}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-2.5 rounded-lg transition-colors"
            >
              Resume Round
            </button>
          </div>
        )}

        {/* Trip standings */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Trip Standings</h2>
          {trip.rounds.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-2">No rounds recorded yet</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 mb-3">
                {(["A", "B"] as const).map((team) => {
                  const isLeader = team === "A" ? netA > 0 : netA < 0;
                  const amount = team === "A" ? totals.teamA : totals.teamB;
                  return (
                    <div
                      key={team}
                      className={`rounded-xl p-3 text-center border-2 ${
                        isLeader
                          ? team === "A"
                            ? "border-red-500 bg-red-50"
                            : "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-gray-200"
                      }`}
                    >
                      <div className={`text-xs font-semibold mb-1 ${team === "A" ? "text-red-600" : "text-orange-600"}`}>
                        Team {team}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{team === "A" ? TEAM_A : TEAM_B}</div>
                      <div className="text-2xl font-bold text-gray-900">{amount} pts</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-center text-xs text-gray-500">
                {netA === 0
                  ? "All Square"
                  : netA > 0
                  ? `Team A leads by ${netA} pts`
                  : `Team B leads by ${Math.abs(netA)} pts`}
                {" · "}
                {trip.rounds.length} round{trip.rounds.length !== 1 ? "s" : ""}
              </p>
            </>
          )}
        </div>

        {/* Start new round */}
        {!activeRound && (
          <button
            onClick={onStartNewRound}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-md"
          >
            + Start New Round
          </button>
        )}

        {/* Round history */}
        {reversedRounds.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 px-1">Rounds</h2>
            {reversedRounds.map((round, i) => {
              const roundNumber = trip.rounds.length - i;
              const payout = computeRoundPayout(round);
              const tee = round.setup.course.tees.find((t) => t.id === round.setup.teeId);
              const gameLabel = round.setup.gameType === "vegas" ? "Vegas" : "Best Ball";
              return (
                <button
                  key={round.id}
                  onClick={() => onViewRound(round.id)}
                  className="w-full bg-gray-100 rounded-xl p-4 shadow-sm text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 truncate">
                        Round {roundNumber} · {round.setup.course.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {tee?.name} tees · {gameLabel} · {formatDate(round.completedAt)}
                      </div>
                    </div>
                    <div className="text-gray-400 text-lg ml-2 flex-shrink-0">›</div>
                  </div>
                  <div
                    className={`mt-2 inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      payout.winnerTeam === "A"
                        ? "bg-red-100 text-red-700"
                        : payout.winnerTeam === "B"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {payout.winnerTeam === "tie"
                      ? "All Square"
                      : payout.winnerTeam === "A"
                      ? `Team A +${payout.amount} pts`
                      : `Team B +${payout.amount} pts`}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
