"use client";

import { useMemo, useRef, useState } from "react";

const COLORS = ["#93a5f7", "#f5c95c", "#6fd3a3", "#f0918f", "#7fc8e8", "#d5a6f0", "#f2b46d"];

interface WheelPlayer {
  id: string;
  name: string;
  hasChosen: boolean;
}

export function Wheel({ players }: { players: WheelPlayer[] }) {
  const [excludeChosen, setExcludeChosen] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const rotationRef = useRef(0);

  const pool = useMemo(
    () => players.filter((p) => !excludeChosen || !p.hasChosen),
    [players, excludeChosen]
  );
  const n = pool.length;
  const segment = 360 / Math.max(n, 1);

  const gradient = useMemo(() => {
    if (n === 0) return "conic-gradient(#223055 0deg 360deg)";
    const stops = pool.map(
      (_, i) => `${COLORS[i % COLORS.length]} ${i * segment}deg ${(i + 1) * segment}deg`
    );
    return `conic-gradient(from 0deg, ${stops.join(", ")})`;
  }, [pool, n, segment]);

  function spin() {
    if (spinning || n === 0) return;
    setResult(null);
    setSpinning(true);
    const extra = 5 * 360 + Math.random() * 360 * 3;
    const next = rotationRef.current + extra;
    rotationRef.current = next;
    setRotation(next);
    window.setTimeout(() => {
      // The pointer sits at the top (0deg in wheel coordinates before rotation).
      // After rotating by `next`, the segment under the pointer is the one whose
      // range contains (360 - next mod 360).
      const angle = ((360 - (next % 360)) % 360 + 360) % 360;
      const index = Math.floor(angle / segment) % n;
      setResult(pool[index].name);
      setSpinning(false);
    }, 4600);
  }

  return (
    <div className="wheel-wrap">
      <label className="toggle-line">
        <input
          type="checkbox"
          checked={excludeChosen}
          onChange={(e) => setExcludeChosen(e.target.checked)}
          disabled={spinning}
        />
        Skip players who&apos;ve already picked
      </label>

      {n === 0 ? (
        <p className="muted">Everyone has picked a course already this season. 🎉</p>
      ) : (
        <>
          <div className="wheel-pointer" />
          <div
            className="wheel"
            style={{ background: gradient, transform: `rotate(${rotation}deg)` }}
          >
            {pool.map((p, i) => (
              <span
                key={p.id}
                className="label"
                style={{
                  transform: `rotate(${i * segment + segment / 2 - 90}deg) translate(28%, -50%)`,
                }}
              >
                {p.name}
              </span>
            ))}
          </div>
          <div className="wheel-result" aria-live="polite">
            {result ? `${result} picks the course! ⛳` : spinning ? "…" : " "}
          </div>
          <button className="btn" onClick={spin} disabled={spinning}>
            {spinning ? "Spinning…" : "Spin the wheel"}
          </button>
        </>
      )}
    </div>
  );
}
