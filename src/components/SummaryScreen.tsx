"use client";
import type { GameState } from "@/lib/gameState";

interface Props {
  state: GameState;
  onSaveToTrip: () => void;
  onEditScores?: () => void;
}

export default function SummaryScreen({ state, onSaveToTrip, onEditScores }: Props) {
  const { setup, tally, holeResults } = state;
  if (!setup) return null;
  const { players, dollarRate, course, gameType, bettingFormat, nassauFront, nassauBack, nassauTotal, standardAmount } = setup;

  const teamAName = `${players[0].name} / ${players[1].name}`;
  const teamBName = `${players[2].name} / ${players[3].name}`;
  const wonA = holeResults.filter(r => r?.winner === "A").length;
  const wonB = holeResults.filter(r => r?.winner === "B").length;

  const payoutInfo = (() => {
    if (gameType === "vegas") {
      const net = tally.teamA - tally.teamB;
      if (net === 0) return { tied: true, winnerName: "", amount: 0, subtitle: "No money changes hands", detail: `${tally.teamA} pts each` };
      const winnerName = net > 0 ? teamAName : teamBName;
      const amount = Math.abs(net) * dollarRate;
      return { tied: false, winnerName, amount, subtitle: `per player (${Math.abs(net)} pts × $${dollarRate.toFixed(2)})`, detail: `Each losing player pays each winning player $${amount.toFixed(2)}` };
    }
    if (bettingFormat === "per-hole") {
      const net = wonA - wonB;
      if (net === 0) return { tied: true, winnerName: "", amount: 0, subtitle: "No money changes hands", detail: `${wonA} holes each` };
      const winnerName = net > 0 ? teamAName : teamBName;
      const amount = Math.abs(net) * dollarRate;
      return { tied: false, winnerName, amount, subtitle: `${Math.abs(net)} holes × $${dollarRate.toFixed(2)}`, detail: `Each losing player pays each winning player $${amount.toFixed(2)}` };
    }
    if (bettingFormat === "standard") {
      if (wonA === wonB) return { tied: true, winnerName: "", amount: 0, subtitle: "No money changes hands", detail: `${wonA}-${wonB} tie` };
      const winnerName = wonA > wonB ? teamAName : teamBName;
      return { tied: false, winnerName, amount: standardAmount, subtitle: `${Math.max(wonA, wonB)}-${Math.min(wonA, wonB)} holes`, detail: `Each losing player pays each winning player $${standardAmount.toFixed(2)}` };
    }
    // Nassau
    const front = holeResults.slice(0, 9);
    const back = holeResults.slice(9, 18);
    const frontA = front.filter(r => r?.winner === "A").length;
    const frontB = front.filter(r => r?.winner === "B").length;
    const backA = back.filter(r => r?.winner === "A").length;
    const backB = back.filter(r => r?.winner === "B").length;
    const totalA = frontA + backA;
    const totalB = frontB + backB;
    const frontWin = frontA > frontB ? "A" : frontB > frontA ? "B" : "tie";
    const backWin = backA > backB ? "A" : backB > backA ? "B" : "tie";
    const totalWin = totalA > totalB ? "A" : totalB > totalA ? "B" : "tie";
    const nassauA = (frontWin === "A" ? nassauFront : 0) + (backWin === "A" ? nassauBack : 0) + (totalWin === "A" ? nassauTotal : 0);
    const nassauB = (frontWin === "B" ? nassauFront : 0) + (backWin === "B" ? nassauBack : 0) + (totalWin === "B" ? nassauTotal : 0);
    const net = nassauA - nassauB;
    const nassauBreakdown = [
      `Front: ${frontWin === "tie" ? "Push" : frontWin === "A" ? `A +$${nassauFront}` : `B +$${nassauFront}`}`,
      `Back: ${backWin === "tie" ? "Push" : backWin === "A" ? `A +$${nassauBack}` : `B +$${nassauBack}`}`,
      `Total: ${totalWin === "tie" ? "Push" : totalWin === "A" ? `A +$${nassauTotal}` : `B +$${nassauTotal}`}`,
    ].join("  ·  ");
    if (net === 0) return { tied: true, winnerName: "", amount: 0, subtitle: "Nassau: All Square", detail: nassauBreakdown };
    const winnerName = net > 0 ? teamAName : teamBName;
    return { tied: false, winnerName, amount: Math.abs(net), subtitle: "Nassau", detail: nassauBreakdown };
  })();

  const teamAWins = !payoutInfo.tied && payoutInfo.winnerName === teamAName;
  const teamBWins = !payoutInfo.tied && payoutInfo.winnerName === teamBName;

  return (
    <div className="min-h-screen bg-gray-200 text-gray-900 flex flex-col">
      <div className="bg-blue-950 px-4 py-4 border-b border-blue-900 text-center">
        <h1 className="text-xl font-bold text-white">Round Complete</h1>
        <p className="text-blue-300 text-sm">{course.name}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Winner banner */}
        <div className={`rounded-2xl p-6 text-center text-white ${
          teamAWins ? "bg-red-600" : teamBWins ? "bg-orange-500" : "bg-blue-700"
        }`}>
          {payoutInfo.tied ? (
            <>
              <div className="text-4xl mb-2">🤝</div>
              <div className="text-2xl font-bold">All Square!</div>
              <div className="text-white/80 mt-1">{payoutInfo.subtitle}</div>
              {payoutInfo.detail && <div className="text-sm text-white/60 mt-1">{payoutInfo.detail}</div>}
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">🏆</div>
              <div className="text-2xl font-bold">{payoutInfo.winnerName} wins!</div>
              <div className="text-5xl font-bold mt-3">${payoutInfo.amount.toFixed(2)}</div>
              <div className="text-white/80 text-sm mt-1">{payoutInfo.subtitle}</div>
              <div className="text-sm text-white/60 mt-2">{payoutInfo.detail}</div>
            </>
          )}
        </div>

        {/* Tally */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Final Tally</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((team) => {
              const pts = team === "A" ? (gameType === "vegas" ? tally.teamA : wonA) : (gameType === "vegas" ? tally.teamB : wonB);
              const name = team === "A" ? teamAName : teamBName;
              const isWinner = (team === "A" && teamAWins) || (team === "B" && teamBWins);
              return (
                <div key={team} className={`rounded-xl p-3 text-center border-2 ${
                  isWinner
                    ? team === "A" ? "border-red-500 bg-red-50" : "border-orange-500 bg-orange-50"
                    : "border-gray-300 bg-gray-200"
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${team === "A" ? "text-red-600" : "text-orange-600"}`}>Team {team}</div>
                  <div className="text-sm text-gray-700 truncate mb-2">{name}</div>
                  <div className="text-3xl font-bold text-gray-900">{pts}</div>
                  <div className="text-xs text-gray-400">{gameType === "vegas" ? "points" : "holes won"}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hole by hole */}
        <div className="bg-gray-100 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs uppercase tracking-wider text-gray-500 mb-3">Hole by Hole</h2>
          <div className="space-y-1">
            {holeResults.map((result, i) => {
              if (!result) return <div key={i} className="text-xs text-gray-400 px-2">Hole {i + 1} — not played</div>;
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  result.winner === "A" ? "bg-red-50 border border-red-100"
                  : result.winner === "B" ? "bg-orange-50 border border-orange-100"
                  : "bg-gray-200 border border-gray-300"
                }`}>
                  <div className="w-5 text-xs text-gray-400 text-right">{i + 1}</div>
                  <div className="text-xs text-gray-400">p{course.holes[i].par}</div>
                  <div className="flex-1 font-mono text-xs">
                    <span className="text-red-600 font-semibold">{result.teamA.finalNumber}</span>
                    <span className="text-gray-400 mx-1">vs</span>
                    <span className="text-orange-600 font-semibold">{result.teamB.finalNumber}</span>
                    {result.isDoubled && <span className="text-yellow-600 ml-1">×2</span>}
                    {result.gameType === "best-ball-second" && result.teamA.bestNet === result.teamB.bestNet && result.winner !== "tie" && (
                      <span className="text-gray-400 ml-1">(2nd)</span>
                    )}
                  </div>
                  {result.winner !== "tie" ? (
                    <div className={`text-xs font-semibold ${result.winner === "A" ? "text-red-600" : "text-orange-600"}`}>
                      {result.winner} +{result.points}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">tie</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <button onClick={onSaveToTrip} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-md">
            Save & Back to Trip
          </button>
          {onEditScores && (
            <button onClick={onEditScores} className="w-full text-center text-gray-500 hover:text-gray-700 py-3 text-sm transition-colors">
              Edit Scores
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
