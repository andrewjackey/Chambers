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

  useEffect(() => { setEditingHole(activeHole); }, [activeHole]);

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
    if (editingHole === totalHoles - 1) onFinish();
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
    <div className="min-h-screen bg-slate-100 text-gray-900 flex flex-col">
      {/* Header — dark navy */}
      <div className="bg-blue-950 px-4 py-3 flex items-center justify-between border-b border-blue-900">
        <div className="flex items-center gap-3">
          <button onClick={onBackToSetup} className="text-blue-300 hover:text-white text-lg leading-none" title="Edit settings">←</button>
          <div>
            <div className="text-xs text-blue-300 uppercase tracking-wider">Hole {editingHole + 1} of {totalHoles}</div>
            <div className="text-sm font-semibold text-white">{course.name}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-blue-400">After {completedCount} holes</div>
            {bettingHeader}
          </div>
          {confirmingNew ? (
            <div className="flex flex-col gap-1 items-end">
              <button onClick={() => { setConfirmingNew(false); onNewRound(); }}
                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded-lg transition-colors">
                Yes, new round
              </button>
              <button onClick={() => setConfirmingNew(false)} className="text-xs text-blue-400 hover:text-blue-200">Cancel</button>
            </div>
          ) : (
            <button onClick={() => setConfirmingNew(true)}
              className="text-xs text-blue-400 hover:text-blue-200 transition-colors whitespace-nowrap" title="Start a new round">
              New
            </button>
          )}
        </div>
      </div>

      {/* Hole nav strip */}
      <div className="bg-blue-950 px-2 py-2 flex gap-1 overflow-x-auto border-b border-blue-900 flex-shrink-0">
        {course.holes.map((h, i) => {
          const result = holeResults[i];
          const isEditing = i === editingHole;
          return (
            <button key={i} onClick={() => goToHole(i)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                isEditing ? "bg-white text-blue-950"
                : result ? result.winner === "A" ? "bg-red-500 text-white"
                         : result.winner === "B" ? "bg-orange-500 text-white"
                         : "bg-blue-700 text-blue-200"
                : "bg-blue-800 text-blue-400"
              }`}>
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Score entry */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Hole info */}
        <div className="bg-blue-950 text-white rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-2xl font-bold">Hole {hole.hole}</span>
          <div className="text-right">
            <span className="text-sm text-blue-200 block">Par {hole.par}</span>
            <span className="text-xs text-blue-400">Stroke Index {hole.strokeIndex}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Team A */}
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-500">
            <div className="text-xs font-semibold uppercase tracking-wider text-red-600 mb-3">Team A</div>
            {[0, 1].map((pi) => {
              const idx = pi as 0 | 1;
              const si = strokeCounts[idx];
              const strokes = getStrokesOnHole(si, hole.strokeIndex);
              return (
                <div key={pi} className="flex items-center gap-3 mb-3 last:mb-0">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{players[idx].name}</div>
                    {strokes > 0 && (
                      <div className="text-xs text-red-500">{"●".repeat(strokes)} {strokes} stroke{strokes > 1 ? "s" : ""}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setScore(idx, String(Math.max(1, (parseInt(scores[idx]) || hole.par) - 1)))}
                      className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xl font-bold flex items-center justify-center transition-colors">−</button>
                    <input type="number" min="1" max="20" value={scores[idx]} onChange={(e) => setScore(idx, e.target.value)}
                      className="w-12 bg-white border-2 border-gray-300 rounded-lg text-center text-xl font-bold text-gray-900 focus:outline-none focus:border-red-400 py-1"
                    />
                    <button type="button" onClick={() => setScore(idx, String((parseInt(scores[idx]) || hole.par) + 1))}
                      className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xl font-bold flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Team B */}
          <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-500">
            <div className="text-xs font-semibold uppercase tracking-wider text-orange-600 mb-3">Team B</div>
            {[0, 1].map((pi) => {
              const idx = (pi + 2) as 2 | 3;
              const si = strokeCounts[idx];
              const strokes = getStrokesOnHole(si, hole.strokeIndex);
              return (
                <div key={pi} className="flex items-center gap-3 mb-3 last:mb-0">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-gray-900">{players[idx].name}</div>
                    {strokes > 0 && (
                      <div className="text-xs text-orange-500">{"●".repeat(strokes)} {strokes} stroke{strokes > 1 ? "s" : ""}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setScore(idx, String(Math.max(1, (parseInt(scores[idx]) || hole.par) - 1)))}
                      className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xl font-bold flex items-center justify-center transition-colors">−</button>
                    <input type="number" min="1" max="20" value={scores[idx]} onChange={(e) => setScore(idx, e.target.value)}
                      className="w-12 bg-white border-2 border-gray-300 rounded-lg text-center text-xl font-bold text-gray-900 focus:outline-none focus:border-orange-400 py-1"
                    />
                    <button type="button" onClick={() => setScore(idx, String((parseInt(scores[idx]) || hole.par) + 1))}
                      className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xl font-bold flex items-center justify-center transition-colors">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          <HoleResultPreview result={liveResult} players={players} dollarRate={dollarRate} />

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-md">
            {editingHole === totalHoles - 1 ? "Finish Round" : `Save & Next →`}
          </button>
        </form>

        {/* Running scorecard */}
        {completedCount > 0 && (
          <div className="mt-2">
            <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-2 px-1">Scorecard</h2>
            <div className="flex items-center gap-2 px-3 mb-1 text-xs text-gray-400 uppercase tracking-wider">
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
                      dollarRate={dollarRate} players={players} setup={setup} holeIndex={i} allResults={holeResults}
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

function HoleResultPreview({ result, players, dollarRate }: {
  result: HoleResult;
  players: [{ name: string }, { name: string }, { name: string }, { name: string }];
  dollarRate: number;
}) {
  const isVegas = result.gameType === "vegas";
  const isBestBall = result.gameType === "best-ball" || result.gameType === "best-ball-second";
  const flippedA = isVegas && result.teamA.finalNumber !== result.teamA.rawNumber;
  const flippedB = isVegas && result.teamB.finalNumber !== result.teamB.rawNumber;
  const usedSecond = result.gameType === "best-ball-second" && result.teamA.bestNet === result.teamB.bestNet && result.winner !== "tie";

  let winLabel: React.ReactNode;
  if (result.winner === "tie") {
    winLabel = <div className="text-xs text-gray-300 mt-1">Tie</div>;
  } else if (isBestBall) {
    winLabel = (
      <div className={`text-xs font-semibold mt-1 ${result.winner === "A" ? "text-red-300" : "text-orange-300"}`}>
        Team {result.winner} wins{usedSecond ? <span className="text-gray-400"> (2nd)</span> : null}
      </div>
    );
  } else {
    const winnerName = result.winner === "A"
      ? players[0].name.split(" ")[0] + "/" + players[1].name.split(" ")[0]
      : players[2].name.split(" ")[0] + "/" + players[3].name.split(" ")[0];
    winLabel = <div className="text-xs text-white mt-1">{winnerName} wins ${(result.points * dollarRate).toFixed(2)}</div>;
  }

  return (
    <div className="bg-blue-950 rounded-xl p-3 text-sm">
      <div className="flex justify-between items-center">
        <div className="text-center">
          <div className="text-xs text-red-400 mb-1">Team A</div>
          <div className="font-mono text-2xl font-bold text-red-300">
            {flippedA ? <><span className="line-through text-gray-600 text-base mr-1">{result.teamA.rawNumber}</span>{result.teamA.finalNumber}</> : result.teamA.finalNumber}
          </div>
          {isBestBall && result.teamA.secondNet !== result.teamA.bestNet && <div className="text-xs text-red-500">{result.teamA.secondNet}</div>}
          {isVegas && result.teamA.hasEagle && <div className="text-xs text-yellow-400">Eagle!</div>}
          {isVegas && result.teamA.hasBirdie && !result.teamA.hasEagle && <div className="text-xs text-green-400">Birdie</div>}
        </div>
        <div className="text-center">
          <div className={`font-bold text-lg ${result.isDoubled ? "text-yellow-400" : "text-gray-400"}`}>
            {result.isDoubled ? "×2" : "vs"}
          </div>
          {winLabel}
        </div>
        <div className="text-center">
          <div className="text-xs text-orange-400 mb-1">Team B</div>
          <div className="font-mono text-2xl font-bold text-orange-300">
            {flippedB ? <><span className="line-through text-gray-600 text-base mr-1">{result.teamB.rawNumber}</span>{result.teamB.finalNumber}</> : result.teamB.finalNumber}
          </div>
          {isBestBall && result.teamB.secondNet !== result.teamB.bestNet && <div className="text-xs text-orange-500">{result.teamB.secondNet}</div>}
          {isVegas && result.teamB.hasEagle && <div className="text-xs text-yellow-400">Eagle!</div>}
          {isVegas && result.teamB.hasBirdie && !result.teamB.hasEagle && <div className="text-xs text-green-400">Birdie</div>}
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
        <span className={result.winner === "A" ? "text-red-600 font-semibold" : "text-orange-600 font-semibold"}>
          {result.winner} +${(result.points * dollarRate).toFixed(2)}
        </span>
      ) : <span className="text-gray-400">tie</span>}
    </div>
  ) : (
    <div className="w-10 text-xs text-right">
      {result.winner !== "tie" ? (
        <span className={result.winner === "A" ? "text-red-600 font-semibold" : "text-orange-600 font-semibold"}>{result.winner}</span>
      ) : <span className="text-gray-400">tie</span>}
    </div>
  );

  let totalCell: React.ReactNode;
  if (isVegasOrPerHole) {
    totalCell = (
      <div className={`text-xs text-right w-20 font-semibold ${net > 0 ? "text-red-600" : net < 0 ? "text-orange-600" : "text-gray-500"}`}>
        {net === 0 ? "Even" : net > 0 ? `A +$${(net * dollarRate).toFixed(2)}` : `B +$${(Math.abs(net) * dollarRate).toFixed(2)}`}
      </div>
    );
  } else if (setup.bettingFormat === "nassau") {
    const ns = computeNassauStatus(allResults.slice(0, holeIndex + 1), setup.nassauFront, setup.nassauBack, setup.nassauTotal);
    totalCell = <div className="text-xs text-right w-24 font-semibold text-gray-700">{ns.summary}</div>;
  } else {
    totalCell = (
      <div className={`text-xs text-right w-24 font-semibold ${net > 0 ? "text-red-600" : net < 0 ? "text-orange-600" : "text-gray-500"}`}>
        {net === 0 ? "Even" : net > 0 ? `A +${net}` : `B +${Math.abs(net)}`}
      </div>
    );
  }

  return (
    <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${
      result.winner === "A" ? "bg-red-50 border border-red-100"
      : result.winner === "B" ? "bg-orange-50 border border-orange-100"
      : "bg-white border border-gray-100"
    }`}>
      <div className="w-6 text-center text-gray-500 text-xs font-bold">{holeNum}</div>
      <div className="text-xs text-gray-400">P{par}</div>
      <div className="flex-1 font-mono text-xs">
        <span className="text-red-600 font-semibold">{result.teamA.finalNumber}</span>
        <span className="text-gray-400 mx-1">vs</span>
        <span className="text-orange-600 font-semibold">{result.teamB.finalNumber}</span>
        {result.isDoubled && <span className="text-yellow-600 ml-1">×2</span>}
        {result.gameType === "best-ball-second" && result.teamA.bestNet === result.teamB.bestNet && result.winner !== "tie" && (
          <span className="text-gray-400 ml-1 text-xs">(2nd)</span>
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

  const fmt = (s: ReturnType<typeof seg>) =>
    s.winner === "tie" ? "E" : `${s.winner}${s.dollars !== null ? ` $${s.dollars}` : `+${s.lead}`}`;

  const totalDollarsA = (f.winner === "A" && f.dollars ? f.dollars : 0) + (bk.winner === "A" && bk.dollars ? bk.dollars : 0) + (tot.winner === "A" && tot.dollars ? tot.dollars : 0);
  const totalDollarsB = (f.winner === "B" && f.dollars ? f.dollars : 0) + (bk.winner === "B" && bk.dollars ? bk.dollars : 0) + (tot.winner === "B" && tot.dollars ? tot.dollars : 0);

  return { f, bk, tot, fLabel: fmt(f), bLabel: fmt(bk), tLabel: fmt(tot), totalDollarsA, totalDollarsB, summary: `F:${fmt(f)} B:${fmt(bk)} T:${fmt(tot)}` };
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
    const color = netA > 0 ? "text-red-300" : "text-orange-300";
    return <div className={`text-sm font-bold ${color}`}>{leader} +${(Math.abs(netA) * dollarRate).toFixed(2)}</div>;
  }

  const wonA = holeResults.filter(r => r?.winner === "A").length;
  const wonB = holeResults.filter(r => r?.winner === "B").length;

  if (bettingFormat === "per-hole") {
    const net = (wonA - wonB) * dollarRate;
    if (net === 0) return <div className="text-sm font-bold text-yellow-400">All Square</div>;
    const leader = net > 0 ? teamAShort : teamBShort;
    const color = net > 0 ? "text-red-300" : "text-orange-300";
    return <div className={`text-sm font-bold ${color}`}>{leader} +${Math.abs(net).toFixed(2)}</div>;
  }

  if (bettingFormat === "standard") {
    if (wonA === wonB) return <div className="text-sm font-bold text-yellow-400">All Square</div>;
    const leader = wonA > wonB ? teamAShort : teamBShort;
    const color = wonA > wonB ? "text-red-300" : "text-orange-300";
    return (
      <div className="text-right">
        <div className={`text-sm font-bold ${color}`}>{leader} leads {Math.max(wonA, wonB)}-{Math.min(wonA, wonB)}</div>
        <div className="text-xs text-blue-400">Bet: ${standardAmount.toFixed(2)}</div>
      </div>
    );
  }

  const ns = computeNassauStatus(holeResults, nassauFront, nassauBack, nassauTotal);
  return (
    <div className="text-right">
      <div className="text-xs font-semibold text-white leading-tight">
        <span className="text-blue-400">F: </span>{ns.fLabel}
        <span className="text-blue-700 mx-1">·</span>
        <span className="text-blue-400">B: </span>{ns.bLabel}
        <span className="text-blue-700 mx-1">·</span>
        <span className="text-blue-400">T: </span>{ns.tLabel}
      </div>
      {(ns.totalDollarsA > 0 || ns.totalDollarsB > 0) && (
        <div className={`text-xs mt-0.5 ${ns.totalDollarsA > ns.totalDollarsB ? "text-red-300" : "text-orange-300"}`}>
          {ns.totalDollarsA > ns.totalDollarsB ? `${teamAShort} +$${ns.totalDollarsA}` : `${teamBShort} +$${ns.totalDollarsB}`}
        </div>
      )}
    </div>
  );
}
