"use client";
import { useState } from "react";
import { COURSES } from "@/data/courses";
import type { GameSetup, HandicapMode, GameType, BettingFormat } from "@/lib/gameState";

interface Props {
  onStart: (setup: GameSetup) => void;
  existingSetup?: GameSetup | null;
  roundNumber?: number;
  onCancel?: () => void;
}

const DEFAULT_NAMES: [string, string, string, string] = ["Drew", "Aaron", "Graham", "Clayton"];

function computeCourseHandicap(index: number, slope: number, rating: number, par: number): number {
  return Math.round(index * (slope / 113) + (rating - par));
}

export default function SetupScreen({ onStart, existingSetup, roundNumber, onCancel }: Props) {
  const [dollarRate, setDollarRate] = useState(existingSetup ? String(existingSetup.dollarRate) : "1");
  const [courseId, setCourseId] = useState(existingSetup ? existingSetup.course.id : COURSES[0].id);
  const [gameType, setGameType] = useState<GameType>(existingSetup ? existingSetup.gameType : "best-ball-second");
  const [bettingFormat, setBettingFormat] = useState<BettingFormat>(existingSetup ? existingSetup.bettingFormat : "nassau");
  const [nassauFront, setNassauFront] = useState(existingSetup ? String(existingSetup.nassauFront) : "1");
  const [nassauBack, setNassauBack] = useState(existingSetup ? String(existingSetup.nassauBack) : "1");
  const [nassauTotal, setNassauTotal] = useState(existingSetup ? String(existingSetup.nassauTotal) : "1");
  const [standardAmount, setStandardAmount] = useState(existingSetup ? String(existingSetup.standardAmount) : "1");
  const [handicapMode, setHandicapMode] = useState<HandicapMode>(existingSetup ? existingSetup.handicapMode : "manual");
  const [handicapInputs, setHandicapInputs] = useState<[string, string, string, string]>(
    existingSetup ? existingSetup.strokeCounts.map(String) as [string, string, string, string] : ["0", "0", "0", "0"]
  );

  const course = COURSES.find((c) => c.id === courseId) ?? COURSES[0];
  const defaultTeeId = existingSetup?.teeId ?? course.tees[0].id;
  const [teeId, setTeeId] = useState(defaultTeeId);
  const tee = course.tees.find((t) => t.id === teeId) ?? course.tees[0];

  function setHandicapInput(i: number, v: string) {
    const h = [...handicapInputs] as [string, string, string, string];
    h[i] = v;
    setHandicapInputs(h);
  }

  function handleCourseChange(id: string) {
    const newCourse = COURSES.find((c) => c.id === id) ?? COURSES[0];
    setCourseId(id);
    setTeeId(newCourse.tees[0].id);
  }

  function getRawHandicaps(): number[] {
    return handicapInputs.map((h) => {
      const val = parseFloat(h) || 0;
      if (handicapMode === "course") {
        return Math.max(0, computeCourseHandicap(val, tee.slope, tee.rating, tee.par));
      }
      return Math.max(0, Math.round(val));
    });
  }

  function getStrokeCounts(): [number, number, number, number] {
    const raw = getRawHandicaps();
    const min = Math.min(...raw);
    return raw.map((s) => Math.max(0, s - min)) as [number, number, number, number];
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rate = parseFloat(dollarRate);
    onStart({
      players: DEFAULT_NAMES.map((name) => ({ name })) as [{ name: string }, { name: string }, { name: string }, { name: string }],
      dollarRate: isNaN(rate) ? 1 : rate,
      course,
      teeId: tee.id,
      gameType,
      bettingFormat,
      nassauFront: parseFloat(nassauFront) || 5,
      nassauBack: parseFloat(nassauBack) || 5,
      nassauTotal: parseFloat(nassauTotal) || 5,
      standardAmount: parseFloat(standardAmount) || 20,
      handicapMode,
      strokeCounts: getStrokeCounts(),
    });
  }

  const handicapLabel = handicapMode === "course" ? "Handicap Index" : "Stroke Count";

  const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-gray-500 block mb-2";
  const cardCls = "bg-gray-100 rounded-xl p-4 shadow-sm";
  const toggleBase = "flex-1 py-2 rounded-lg text-sm font-medium transition-colors";
  const toggleOn = "bg-blue-600 text-white";
  const toggleOff = "bg-gray-100 text-gray-600 hover:bg-gray-200";

  return (
    <div className="min-h-screen bg-gray-200 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="bg-blue-950 rounded-2xl mb-6 py-8 text-center">
          <div className="text-4xl mb-2">⛳</div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Seattle 4th of July Trip</h1>
          <p className="text-blue-300 text-sm mt-1">
            {roundNumber ? `Round ${roundNumber} Setup` : "Set up your round"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Game type */}
          <div className={cardCls}>
            <label className={labelCls}>Game</label>
            <select value={gameType} onChange={(e) => setGameType(e.target.value as GameType)} className={inputCls}>
              <option value="vegas">Vegas</option>
              <option value="best-ball">Best Ball</option>
              <option value="best-ball-second">Best Ball — 2nd Ball Kicker</option>
            </select>
          </div>

          {/* Fixed teams */}
          <div className={`${cardCls} grid grid-cols-2 gap-4`}>
            <div>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider text-red-600">Olds</div>
              <div className="text-sm text-gray-700">Drew</div>
              <div className="text-sm text-gray-700">Aaron</div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-2 uppercase tracking-wider text-orange-500">Youths</div>
              <div className="text-sm text-gray-700">Graham</div>
              <div className="text-sm text-gray-700">Clayton</div>
            </div>
          </div>

          {/* Course */}
          <div className={cardCls}>
            <label className={labelCls}>Course</label>
            <select value={courseId} onChange={(e) => handleCourseChange(e.target.value)} className={`${inputCls} mb-3`}>
              {COURSES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <label className={labelCls}>Tees</label>
            <div className="flex gap-2 flex-wrap">
              {course.tees.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTeeId(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${teeId === t.id ? toggleOn : toggleOff}`}
                >
                  {t.name}
                </button>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">
              Rating {tee.rating} · Slope {tee.slope} · Par {tee.par}
            </div>
          </div>

          {/* Multiplier — Vegas only */}
          {gameType === "vegas" && (
            <div className={cardCls}>
              <label className={labelCls}>Pts Per Point</label>
              <input type="number" step="1" min="0" value={dollarRate} onChange={(e) => setDollarRate(e.target.value)}
                className={inputCls}
              />
            </div>
          )}

          {/* Betting format — best-ball games only */}
          {(gameType === "best-ball" || gameType === "best-ball-second") && (
            <div className={cardCls}>
              <label className={labelCls}>Betting Format</label>
              <select value={bettingFormat} onChange={(e) => setBettingFormat(e.target.value as BettingFormat)} className={`${inputCls} mb-3`}>
                <option value="nassau">Nassau (Front / Back / Total)</option>
                <option value="standard">Standard (Per 18)</option>
                <option value="per-hole">Per Hole</option>
              </select>

              {bettingFormat === "nassau" && (
                <div className="grid grid-cols-3 gap-2">
                  {([["Front 9", nassauFront, setNassauFront], ["Back 9", nassauBack, setNassauBack], ["Total", nassauTotal, setNassauTotal]] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
                    <div key={label}>
                      <label className="text-xs text-gray-500 block mb-1">{label}</label>
                      <input type="number" step="1" min="0" value={val} onChange={(e) => setter(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {bettingFormat === "standard" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Points</label>
                  <input type="number" step="1" min="0" value={standardAmount} onChange={(e) => setStandardAmount(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}

              {bettingFormat === "per-hole" && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Pts Per Hole</label>
                  <input type="number" step="1" min="0" value={dollarRate} onChange={(e) => setDollarRate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
            </div>
          )}

          {/* Handicap mode */}
          <div className={cardCls}>
            <label className={labelCls}>Handicap Mode</label>
            <div className="flex gap-2 mb-4">
              {(["course", "manual"] as HandicapMode[]).map((mode) => (
                <button key={mode} type="button" onClick={() => setHandicapMode(mode)}
                  className={`${toggleBase} ${handicapMode === mode ? toggleOn : toggleOff}`}
                >
                  {mode === "course" ? "Course HCP" : "Manual Strokes"}
                </button>
              ))}
            </div>
            {(() => {
              const raw = getRawHandicaps();
              const min = Math.min(...raw);
              return (
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_NAMES.map((name, i) => {
                    const relStrokes = Math.max(0, raw[i] - min);
                    return (
                      <div key={i}>
                        <label className="text-xs text-gray-500 block mb-1 truncate">{name}</label>
                        <input
                          type="number" min="0" max="54" step={handicapMode === "course" ? "0.1" : "1"}
                          value={handicapInputs[i]}
                          onChange={(e) => setHandicapInput(i as 0|1|2|3, e.target.value)}
                          className={inputCls}
                          placeholder={handicapLabel}
                        />
                        <div className="text-xs text-gray-500 mt-1 text-center">
                          {handicapMode === "course" && <span>HCP {raw[i]} → </span>}
                          <span className="text-blue-700 font-semibold">{relStrokes} stroke{relStrokes !== 1 ? "s" : ""}</span>
                          {relStrokes === 0 && <span className="text-gray-400"> (low)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <p className="text-xs text-gray-400 mt-2">
              {handicapMode === "course"
                ? `Strokes relative to lowest handicap. Course HCP = Index × (${tee.slope}/113) + (${tee.rating} − ${tee.par}).`
                : "Strokes are relative to the lowest value — the lowest handicap plays scratch."}
            </p>
          </div>

          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow-lg">
            Start Round
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="w-full text-center text-gray-500 hover:text-gray-700 py-3 text-sm transition-colors">
              ← Back to Trip
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
