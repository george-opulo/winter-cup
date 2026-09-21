const FLAKES = Array.from({ length: 22 }, (_, i) => ({
  left: ((i * 37) % 100) + 0.5,
  size: 8 + ((i * 13) % 10),
  duration: 9 + ((i * 7) % 12),
  delay: -((i * 11) % 18),
}));

export function Snow() {
  return (
    <div className="snow" aria-hidden>
      {FLAKES.map((f, i) => (
        <span
          key={i}
          style={{
            left: `${f.left}%`,
            fontSize: `${f.size}px`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        >
          ❄
        </span>
      ))}
    </div>
  );
}
