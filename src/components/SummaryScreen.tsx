"use client";
import type { GameState } from "@/lib/gameState";

interface Props {
  state: GameState;
  onReset: () => void;
}

export default function SummaryScreen({ state, onReset }: Props) {
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
    <div className="min-h-screen bg-blue-950 text-white flex flex-col">
      <div className="bg-blue-900 px-4 py-4 border-b border-blue-800 text-center">
        <h1 className="text-xl font-bold">Round Complete</h1>
        <p className="text-blue-400 text-sm">{course.name}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Winner banner */}
        <div className={`rounded-2xl p-6 text-center ${
          teamAWins ? "bg-red-900/50 border border-red-600" :
          teamBWins ? "bg-orange-900/50 border border-orange-600" :
          "bg-blue-900/50 border border-blue-600"
        }`}>
          {payoutInfo.tied ? (
            <>
              <div className="text-4xl mb-2">🤝</div>
              <div className="text-2xl font-bold">All Square!</div>
              <div className="text-blue-400 mt-1">{payoutInfo.subtitle}</div>
              {payoutInfo.detail && <div className="text-xs text-blue-600 mt-1">{payoutInfo.detail}</div>}
            </>
          ) : (
            <>
              <div className="text-4xl mb-2">🏆</div>
              <div className={`text-2xl font-bold ${teamAWins ? "text-red-300" : "text-orange-300"}`}>
                {payoutInfo.winnerName} wins!
              </div>
              <div className="text-5xl font-bold mt-3 text-white">${payoutInfo.amount.toFixed(2)}</div>
              <div className="text-blue-400 text-sm mt-1">{payoutInfo.subtitle}</div>
              <div className="text-xs text-blue-500 mt-2">{payoutInfo.detail}</div>
            </>
          )}
        </div>

        {/* Tally breakdown */}
        <div className="bg-blue-900/50 rounded-xl p-4">
          <h2 className="text-xs uppercase tracking-wider text-blue-400 mb-3">Final Tally</h2>
          <div className="grid grid-cols-2 gap-3">
            {(["A", "B"] as const).map((team) => {
              const pts = team === "A" ? (gameType === "vegas" ? tally.teamA : wonA) : (gameType === "vegas" ? tally.teamB : wonB);
              const name = team === "A" ? teamAName : teamBName;
              const isWinner = (team === "A" && teamAWins) || (team === "B" && teamBWins);
              return (
                <div key={team} className={`rounded-lg p-3 text-center ${
                  isWinner ? (team === "A" ? "bg-red-800/50" : "bg-orange-800/50") : "bg-blue-800/30"
                }`}>
                  <div className={`text-xs font-semibold mb-1 ${team === "A" ? "text-red-400" : "text-orange-400"}`}>
                    Team {team}
                  </div>
                  <div className="text-sm text-blue-200 truncate mb-2">{name}</div>
                  <div className="text-3xl font-bold">{pts}</div>
                  <div className="text-xs text-blue-400">{gameType === "vegas" ? "points" : "holes won"}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hole-by-hole summary */}
        <div className="bg-blue-900/50 rounded-xl p-4">
          <h2 className="text-xs uppercase tracking-wider text-blue-400 mb-3">Hole by Hole</h2>
          <div className="space-y-1">
            {holeResults.map((result, i) => {
              if (!result) return (
                <div key={i} className="text-xs text-blue-700 px-2">Hole {i + 1} — not played</div>
              );
              return (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  result.winner === "A" ? "bg-red-900/30" : result.winner === "B" ? "bg-orange-900/30" : "bg-blue-900/20"
                }`}>
                  <div className="w-5 text-xs text-blue-500 text-right">{i + 1}</div>
                  <div className="text-xs text-blue-600">p{course.holes[i].par}</div>
                  <div className="flex-1 font-mono text-xs">
                    <span className="text-red-300">{result.teamA.finalNumber}</span>
                    <span className="text-blue-600 mx-1">vs</span>
                    <span className="text-orange-300">{result.teamB.finalNumber}</span>
                    {result.isDoubled && <span className="text-yellow-400 ml-1">×2</span>}
                    {result.gameType === "best-ball-second" && result.teamA.bestNet === result.teamB.bestNet && result.winner !== "tie" && (
                      <span className="text-blue-600 ml-1">(2nd)</span>
                    )}
                  </div>
                  {result.winner !== "tie" ? (
                    <div className={`text-xs font-semibold ${result.winner === "A" ? "text-red-400" : "text-orange-400"}`}>
                      {result.winner === "A" ? "A" : "B"} +{result.points}
                    </div>
                  ) : (
                    <div className="text-xs text-blue-600">tie</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onReset}
          className="w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 rounded-xl text-lg transition-colors"
        >
          New Round
        </button>
      </div>
    </div>
  );
}
