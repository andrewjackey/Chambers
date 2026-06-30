"use client";
import { useState, useEffect, useMemo } from "react";
import type { GameState } from "@/lib/gameState";
import type { HoleResult } from "@/lib/scoring";
import { scoreHole } from "@/lib/scoring";
import { currentHoleIndex } from "@/lib/gameState";

interface Props {
  state: GameState;
  onEnterScores: (holeIndex: number, grossScores: [number, number, number, number]) => void;
  onEditHole: (holeIndex: number) => void;
  onFinish: () => void;
  onBackToSetup: () => void;
  onNewRound: () => void;
}

function defaultScores(par: number): [string, string, string, string] {
  const s = par.toString();
  return [s, s, s, s];
}

export default function ScoreEntryScreen({ state, onEnterScores, onEditHole, onFinish, onBackToSetup, onNewRound }: Props) {
  const { setup, holeResults, tally, entries } = state;
  if (!setup) return null;
  const { course, players, strokeCounts, dollarRate } = setup;
  const totalHoles = course.holes.length;
  const activeHole = currentHoleIndex(state);
  const [editingHole, setEditingHole] = useState(activeHole);
  const [confirmingNew, setConfirmingNew] = useState(false);
  const hole = course.holes[editingHole];
  const [scores, setScores] = useState<[string, string, string, string]>(defaultScores(hole.par));

  useEffect(() => {
    setEditingHole(activeHole);
  }, [activeHole]);

  useEffect(() => {
    const existing = entries[editingHole];
    if (existing) {
      setScores(existing.grossScores.map(String) as [string, string, string, string]);
    } else {
      setScores(defaultScores(course.holes[editingHole].par));
    }
  }, [editingHole, entries, course.holes]);

  function setScore(i: number, v: string) {
    const s = [...scores] as [string, string, string, string];
    s[i] = v;
    setScores(s);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const gross = scores.map((s) => Math.max(1, parseInt(s) || 1)) as [number, number, number, number];
    onEnterScores(editingHole, gross);
    if (editingHole === totalHoles - 1) {
      onFinish();
    }
  }

  function goToHole(i: number) {
    setEditingHole(i);
    onEditHole(i);
  }

  const liveResult = useMemo(() => {
    const gross = scores.map((s) => Math.max(1, parseInt(s) || hole.par)) as [number, number, number, number];
    return scoreHole(hole, strokeCounts, gross, setup.gameType);
  }, [scores, hole, strokeCounts, setup.gameType]);

  const completedCount = holeResults.filter(Boolean).length;
  const netA = tally.teamA - tally.teamB;
  const teamAShort = players[0].name.split(" ")[0] + "/" + players[1].name.split(" ")[0];
  const teamBShort = players[2].name.split(" ")[0] + "/" + players[3].name.split(" ")[0];
  const bettingHeader = getBettingHeader(holeResults, netA, setup, teamAShort, teamBShort);

  return (
    <div className="min-h-screen bg-blue-950 text-white flex flex-col">
      {/* Header */}
      <div className="bg-blue-900 px-4 py-3 flex items-center justify-between border-b border-blue-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToSetup}
            className="text-blue-400 hover:text-white text-lg leading-none"
            title="Edit settings"
          >
            ←
          </button>
          <div>
            <div className="text-xs text-blue-400 uppercase tracking-wider">Hole {editingHole + 1} of {totalHoles}</div>
            <div className="text-sm font-medium">{course.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-blue-400">After {completedCount} holes</div>
            {bettingHeader}
          </div>
          {confirmingNew ? (
            <div className="flex flex-col gap-1 items-end">
              <button
                onClick={() => { setConfirmingNew(false); onNewRound(); }}
                className="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded-lg transition-colors"
              >
                Yes, new round
              </button>
              <button
                onClick={() => setConfirmingNew(false)}
                className="text-xs text-blue-500 hover:text-blue-300"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingNew(true)}
              className="text-xs text-blue-600 hover:text-blue-400 transition-colors whitespace-nowrap"
              title="Start a new round"
            >
              New
            </button>
          )}
        </div>
      </div>

      {/* Hole nav strip */}
      <div className="bg-blue-900/50 px-2 py-2 flex gap-1 overflow-x-auto border-b border-blue-800 flex-shrink-0">
        {course.holes.map((h, i) => {
          const result = holeResults[i];
          const isEditing = i === editingHole;
          return (
            <button
              key={i}
              onClick={() => goToHole(i)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                isEditing
                  ? "bg-blue-400 text-blue-950"
                  : result
                  ? result.winner === "A"
                    ? "bg-red-600/80 text-white"
                    : result.winner === "B"
                    ? "bg-orange-600/80 text-white"
                    : "bg-blue-700 text-blue-300"
                  : "bg-blue-800/60 text-blue-400"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Score entry */}
      <div className="flex-1 overflow-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-900/50 rounded-xl p-4 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl font-bold">Hole {hole.hole}</span>
              <div className="text-right">
                <span className="text-xs text-blue-400 block">Par {hole.par}</span>
                <span className="text-xs text-blue-500">SI: {hole.strokeIndex}</span>
              </div>
            </div>
          </div>

          {/* Team A */}
          <div className="bg-red-900/30 border border-red-800/50 rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-3">Team A</div>
            {[0, 1].map((pi) => {
              const idx = pi as 0 | 1;
              const si = strokeCounts[idx];
              const strokes = getStrokesOnHole(si, hole.strokeIndex);
              return (
                <div key={pi} className="flex items-center gap-3 mb-3 last:mb-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{players[idx].name}</div>
                    {strokes > 0 && (
                      <div className="text-xs text-red-400">{"●".repeat(strokes)} {strokes} stroke{strokes > 1 ? "s" : ""}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setScore(idx, String(Math.max(1, (parseInt(scores[idx]) || hole.par) - 1)))}
                      className="w-8 h-8 bg-blue-700 hover:bg-blue-600 rounded-lg text-xl font-bold flex items-center justify-center">−</button>
                    <input
                      type="number" min="1" max="20"
                      value={scores[idx]}
                      onChange={(e) => setScore(idx, e.target.value)}
                      className="w-12 bg-blue-800 rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-red-400 py-1"
                    />
                    <button type="button" onClick={() => setScore(idx, String((parseInt(scores[idx]) || hole.par) + 1))}
                      className="w-8 h-8 bg-blue-700 hover:bg-blue-600 rounded-lg text-xl font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team B */}
          <div className="bg-orange-900/30 border border-orange-800/50 rounded-xl p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-orange-400 mb-3">Team B</div>
            {[0, 1].map((pi) => {
              const idx = (pi + 2) as 2 | 3;
              const si = strokeCounts[idx];
              const strokes = getStrokesOnHole(si, hole.strokeIndex);
              return (
                <div key={pi} className="flex items-center gap-3 mb-3 last:mb-0">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{players[idx].name}</div>
                    {strokes > 0 && (
                      <div className="text-xs text-orange-400">{"●".repeat(strokes)} {strokes} stroke{strokes > 1 ? "s" : ""}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setScore(idx, String(Math.max(1, (parseInt(scores[idx]) || hole.par) - 1)))}
                      className="w-8 h-8 bg-blue-700 hover:bg-blue-600 rounded-lg text-xl font-bold flex items-center justify-center">−</button>
                    <input
                      type="number" min="1" max="20"
                      value={scores[idx]}
                      onChange={(e) => setScore(idx, e.target.value)}
                      className="w-12 bg-blue-800 rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-400 py-1"
                    />
                    <button type="button" onClick={() => setScore(idx, String((parseInt(scores[idx]) || hole.par) + 1))}
                      className="w-8 h-8 bg-blue-700 hover:bg-blue-600 rounded-lg text-xl font-bold flex items-center justify-center">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <HoleResultPreview result={liveResult} players={players} dollarRate={dollarRate} />

          <button
            type="submit"
            className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-4 rounded-xl text-lg transition-colors"
          >
            {editingHole === totalHoles - 1 ? "Finish Round" : `Save & Next →`}
          </button>
        </form>

        {completedCount > 0 && (
          <div className="mt-6">
            <h2 className="text-xs uppercase tracking-wider text-blue-400 mb-2">Scorecard</h2>
            <div className="flex items-center gap-2 px-3 mb-1 text-xs text-blue-600 uppercase tracking-wider">
              <div className="w-6 text-center">#</div>
              <div className="w-6">Par</div>
              <div className="flex-1">Score</div>
              {setup.gameType === "vegas" || setup.bettingFormat === "per-hole" ? (
                <>
                  <div className="w-16 text-right">Hole $</div>
                  <div className="w-20 text-right">Total $</div>
                </>
              ) : (
                <>
                  <div className="w-10 text-right">Hole</div>
                  <div className="w-24 text-right">{setup.bettingFormat === "nassau" ? "Nassau" : "Total"}</div>
                </>
              )}
            </div>
            <div className="space-y-1">
              {holeResults.map((result, i) => {
                if (!result) return null;
                return (
                  <button key={i} onClick={() => goToHole(i)} className="w-full text-left">
                    <ScorecardRow result={result} holeNum={i + 1} par={course.holes[i].par}
                      runningA={computeRunningTally(holeResults, i, "A")}
                      runningB={computeRunningTally(holeResults, i, "B")}
                      dollarRate={dollarRate}
                      players={players}
                      setup={setup}
                      holeIndex={i}
                      allResults={holeResults}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getStrokesOnHole(strokeCount: number, strokeIndex: number): number {
  let strokes = 0;
  if (strokeIndex <= strokeCount) strokes += 1;
  if (strokeIndex <= strokeCount - 18) strokes += 1;
  return strokes;
}

function computeRunningTally(results: HoleResult[], throughIndex: number, team: "A" | "B"): number {
  let total = 0;
  for (let i = 0; i <= throughIndex; i++) {
    const r = results[i];
    if (!r) continue;
    if (r.winner === team) total += r.points;
  }
  return total;
}

function HoleResultPreview({ result, players, dollarRate }: { result: HoleResult; players: [{ name: string }, { name: string }, { name: string }, { name: string }]; dollarRate: number }) {
  const isVegas = result.gameType === "vegas";
  const isBestBall = result.gameType === "best-ball" || result.gameType === "best-ball-second";
  const flippedA = isVegas && result.teamA.finalNumber !== result.teamA.rawNumber;
  const flippedB = isVegas && result.teamB.finalNumber !== result.teamB.rawNumber;
  const usedSecond = result.gameType === "best-ball-second" && result.teamA.bestNet === result.teamB.bestNet && result.winner !== "tie";

  let winLabel: React.ReactNode;
  if (result.winner === "tie") {
    winLabel = <div className="text-xs text-blue-400 mt-1">Tie</div>;
  } else if (isBestBall) {
    winLabel = (
      <div className={`text-xs font-semibold mt-1 ${result.winner === "A" ? "text-red-300" : "text-orange-300"}`}>
        Team {result.winner} wins hole{usedSecond ? <span className="text-blue-400"> (2nd)</span> : null}
      </div>
    );
  } else {
    const winnerName = result.winner === "A"
      ? players[0].name.split(" ")[0] + "/" + players[1].name.split(" ")[0]
      : players[2].name.split(" ")[0] + "/" + players[3].name.split(" ")[0];
    winLabel = (
      <div className="text-xs text-blue-200 mt-1">
        {winnerName} wins ${(result.points * dollarRate).toFixed(2)}
      </div>
    );
  }

  return (
    <div className="bg-blue-900/40 border border-blue-700/50 rounded-xl p-3 text-sm">
      <div className="flex justify-between items-center mb-2">
        <div className="text-center">
          <div className="text-xs text-red-400 mb-1">Team A</div>
          <div className="font-mono text-2xl font-bold text-red-300">
            {flippedA ? <><span className="line-through text-blue-600 text-base mr-1">{result.teamA.rawNumber}</span>{result.teamA.finalNumber}</> : result.teamA.finalNumber}
          </div>
          {isBestBall && result.teamA.secondNet !== result.teamA.bestNet && (
            <div className="text-xs text-red-500">{result.teamA.secondNet}</div>
          )}
          {isVegas && result.teamA.hasEagle && <div className="text-xs text-yellow-400">Eagle!</div>}
          {isVegas && result.teamA.hasBirdie && !result.teamA.hasEagle && <div className="text-xs text-red-300">Birdie</div>}
        </div>
        <div className="text-center">
          <div className={`font-bold text-lg ${result.isDoubled ? "text-yellow-400" : "text-blue-400"}`}>
            {result.isDoubled ? "×2" : "vs"}
          </div>
          {winLabel}
        </div>
        <div className="text-center">
          <div className="text-xs text-orange-400 mb-1">Team B</div>
          <div className="font-mono text-2xl font-bold text-orange-300">
            {flippedB ? <><span className="line-through text-blue-600 text-base mr-1">{result.teamB.rawNumber}</span>{result.teamB.finalNumber}</> : result.teamB.finalNumber}
          </div>
          {isBestBall && result.teamB.secondNet !== result.teamB.bestNet && (
            <div className="text-xs text-orange-500">{result.teamB.secondNet}</div>
          )}
          {isVegas && result.teamB.hasEagle && <div className="text-xs text-yellow-400">Eagle!</div>}
          {isVegas && result.teamB.hasBirdie && !result.teamB.hasEagle && <div className="text-xs text-orange-400">Birdie</div>}
        </div>
      </div>
    </div>
  );
}

function ScorecardRow({
  result, holeNum, par, runningA, runningB, dollarRate, players, setup, holeIndex, allResults,
}: {
  result: HoleResult; holeNum: number; par: number;
  runningA: number; runningB: number; dollarRate: number;
  players: [{ name: string }, { name: string }, { name: string }, { name: string }];
  setup: import("@/lib/gameState").GameSetup;
  holeIndex: number;
  allResults: HoleResult[];
}) {
  const isVegasOrPerHole = setup.gameType === "vegas" || setup.bettingFormat === "per-hole";
  const net = runningA - runningB;

  const holeCell = isVegasOrPerHole ? (
    <div className="w-16 text-xs text-right">
      {result.winner !== "tie" ? (
        <span className={result.winner === "A" ? "text-red-400" : "text-orange-400"}>
          {result.winner === "A" ? "A" : "B"} +${(result.points * dollarRate).toFixed(2)}
        </span>
      ) : (
        <span className="text-blue-600">tie</span>
      )}
    </div>
  ) : (
    <div className="w-10 text-xs text-right">
      {result.winner !== "tie" ? (
        <span className={result.winner === "A" ? "text-red-400" : "text-orange-400"}>{result.winner}</span>
      ) : (
        <span className="text-blue-600">tie</span>
      )}
    </div>
  );

  let totalCell: React.ReactNode;
  if (isVegasOrPerHole) {
    totalCell = (
      <div className={`text-xs text-right w-20 font-semibold ${net > 0 ? "text-red-300" : net < 0 ? "text-orange-300" : "text-blue-400"}`}>
        {net === 0 ? "Even" : net > 0
          ? `A +$${(net * dollarRate).toFixed(2)}`
          : `B +$${(Math.abs(net) * dollarRate).toFixed(2)}`}
      </div>
    );
  } else if (setup.bettingFormat === "nassau") {
    const ns = computeNassauStatus(allResults.slice(0, holeIndex + 1), setup.nassauFront, setup.nassauBack, setup.nassauTotal);
    totalCell = (
      <div className="text-xs text-right w-24 font-semibold text-blue-200">{ns.summary}</div>
    );
  } else {
    totalCell = (
      <div className={`text-xs text-right w-24 font-semibold ${net > 0 ? "text-red-300" : net < 0 ? "text-orange-300" : "text-blue-400"}`}>
        {net === 0 ? "Even" : net > 0 ? `A +${net}` : `B +${Math.abs(net)}`}
      </div>
    );
  }

  return (
    <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${
      result.winner === "A" ? "bg-red-900/30" : result.winner === "B" ? "bg-orange-900/30" : "bg-blue-900/20"
    }`}>
      <div className="w-6 text-center text-blue-400 text-xs font-bold">{holeNum}</div>
      <div className="text-xs text-blue-500">P{par}</div>
      <div className="flex-1 font-mono text-xs">
        <span className="text-red-300">{result.teamA.finalNumber}</span>
        <span className="text-blue-600 mx-1">vs</span>
        <span className="text-orange-300">{result.teamB.finalNumber}</span>
        {result.isDoubled && <span className="text-yellow-400 ml-1">×2</span>}
        {result.gameType === "best-ball-second" && result.teamA.bestNet === result.teamB.bestNet && result.winner !== "tie" && (
          <span className="text-blue-600 ml-1 text-xs">(2nd)</span>
        )}
      </div>
      {holeCell}
      {totalCell}
    </div>
  );
}

function computeNassauStatus(results: HoleResult[], frontStake: number, backStake: number, totalStake: number) {
  const front = results.slice(0, 9);
  const back = results.slice(9, 18);
  const frontA = front.filter(r => r?.winner === "A").length;
  const frontB = front.filter(r => r?.winner === "B").length;
  const backA = back.filter(r => r?.winner === "A").length;
  const backB = back.filter(r => r?.winner === "B").length;
  const totalA = frontA + backA;
  const totalB = frontB + backB;
  const frontDone = front.filter(Boolean).length === 9;
  const backDone = back.filter(Boolean).length === 9;

  const seg = (a: number, b: number, stake: number, done: boolean) => {
    if (a > b) return { winner: "A" as const, dollars: done ? stake : null, lead: a - b };
    if (b > a) return { winner: "B" as const, dollars: done ? stake : null, lead: b - a };
    return { winner: "tie" as const, dollars: done ? 0 : null, lead: 0 };
  };

  const f = seg(frontA, frontB, frontStake, frontDone);
  const bk = seg(backA, backB, backStake, backDone);
  const tot = seg(totalA, totalB, totalStake, frontDone && backDone);

  const fLabel = f.winner === "tie" ? "E" : `${f.winner}${f.dollars !== null ? ` $${f.dollars}` : `+${f.lead}`}`;
  const bLabel = bk.winner === "tie" ? "E" : `${bk.winner}${bk.dollars !== null ? ` $${bk.dollars}` : `+${bk.lead}`}`;
  const tLabel = tot.winner === "tie" ? "E" : `${tot.winner}${tot.dollars !== null ? ` $${tot.dollars}` : `+${tot.lead}`}`;

  const totalDollarsA = (f.winner === "A" && f.dollars ? f.dollars : 0) + (bk.winner === "A" && bk.dollars ? bk.dollars : 0) + (tot.winner === "A" && tot.dollars ? tot.dollars : 0);
  const totalDollarsB = (f.winner === "B" && f.dollars ? f.dollars : 0) + (bk.winner === "B" && bk.dollars ? bk.dollars : 0) + (tot.winner === "B" && tot.dollars ? tot.dollars : 0);

  return { f, bk, tot, fLabel, bLabel, tLabel, totalDollarsA, totalDollarsB, summary: `F:${fLabel} B:${bLabel} T:${tLabel}` };
}

function getBettingHeader(
  holeResults: HoleResult[],
  netA: number,
  setup: import("@/lib/gameState").GameSetup,
  teamAShort: string,
  teamBShort: string,
): React.ReactNode {
  const { gameType, bettingFormat, dollarRate, nassauFront, nassauBack, nassauTotal, standardAmount } = setup;

  if (gameType === "vegas") {
    if (netA === 0) return <div className="text-sm font-bold text-yellow-400">All Square</div>;
    const leader = netA > 0 ? teamAShort : teamBShort;
    return <div className="text-sm font-bold text-blue-200">{leader} +${(Math.abs(netA) * dollarRate).toFixed(2)}</div>;
  }

  const wonA = holeResults.filter(r => r?.winner === "A").length;
  const wonB = holeResults.filter(r => r?.winner === "B").length;

  if (bettingFormat === "per-hole") {
    const net = (wonA - wonB) * dollarRate;
    if (net === 0) return <div className="text-sm font-bold text-yellow-400">All Square</div>;
    const leader = net > 0 ? teamAShort : teamBShort;
    return <div className="text-sm font-bold text-blue-200">{leader} +${Math.abs(net).toFixed(2)}</div>;
  }

  if (bettingFormat === "standard") {
    if (wonA === wonB) return <div className="text-sm font-bold text-yellow-400">All Square</div>;
    const leader = wonA > wonB ? teamAShort : teamBShort;
    return (
      <div className="text-right">
        <div className="text-sm font-bold text-blue-200">{leader} leads {Math.max(wonA, wonB)}-{Math.min(wonA, wonB)}</div>
        <div className="text-xs text-blue-400">Bet: ${standardAmount.toFixed(2)}</div>
      </div>
    );
  }

  const ns = computeNassauStatus(holeResults, nassauFront, nassauBack, nassauTotal);
  return (
    <div className="text-right">
      <div className="text-xs font-semibold text-blue-200 leading-tight">
        <span className="text-blue-400">F: </span>{ns.fLabel}
        <span className="text-blue-600 mx-1">·</span>
        <span className="text-blue-400">B: </span>{ns.bLabel}
        <span className="text-blue-600 mx-1">·</span>
        <span className="text-blue-400">T: </span>{ns.tLabel}
      </div>
      {(ns.totalDollarsA > 0 || ns.totalDollarsB > 0) && (
        <div className="text-xs text-blue-300 mt-0.5">
          {ns.totalDollarsA > ns.totalDollarsB
            ? `${teamAShort} +$${ns.totalDollarsA}`
            : `${teamBShort} +$${ns.totalDollarsB}`}
        </div>
      )}
    </div>
  );
}
