import { ImageResponse } from "next/og";
import { cutLines } from "@/lib/commentary";
import { computeSeason } from "@/lib/engine";
import { formatWhen } from "@/lib/format";
import { OG_COLORS as C, fmtToPar, loadGoogleFont } from "@/lib/og";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const chipStyle = (color: string, filled = false) => ({
  display: "flex",
  fontSize: 14,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: 2,
  padding: "5px 12px",
  borderRadius: 999,
  border: `1.5px solid ${color}`,
  backgroundColor: filled ? color : "transparent",
  color: filled ? "#fff" : color,
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roundId: string }> }
) {
  const { roundId } = await params;
  const season = await getStore().loadSeason();
  const { results, standings } = computeSeason(season);
  const result = results.find((r) => r.round.id === roundId);
  if (!result) {
    return new Response("Round not played yet", { status: 404 });
  }

  const names = new Map(season.players.map((p) => [p.id, p.name]));
  const round = result.round;
  const sub = [round.label, formatWhen(round.date, round.teeTime), round.course]
    .filter(Boolean)
    .join("  ·  ");
  const commentary = cutLines(result, standings, names);

  const played = result.entries.filter((e) => !e.absent);
  const posOf = (net: number) => 1 + played.filter((p) => p.net < net).length;

  const [archivo, mono, monoBold] = await Promise.all([
    loadGoogleFont("Archivo", 800),
    loadGoogleFont("Spline Sans Mono", 500),
    loadGoogleFont("Spline Sans Mono", 700),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: C.bg,
          color: C.text,
          padding: "72px 76px 60px",
          fontFamily: "Mono",
        }}
      >
        {/* Masthead */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderBottom: `1px solid ${C.line}`,
            paddingBottom: 30,
          }}
        >
          <div
            style={{
              fontFamily: "Archivo",
              fontSize: 58,
              fontWeight: 800,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Winter Cup
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              textTransform: "uppercase",
              letterSpacing: 5,
              color: C.dim,
              marginTop: 16,
            }}
          >
            {sub}
          </div>
        </div>

        {/* Round result */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 36 }}>
          {result.entries.map((e) => {
            const inv = e.isWinner;
            return (
              <div
                key={e.playerId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "17px 22px",
                  borderRadius: inv ? 12 : 0,
                  backgroundColor: inv ? C.text : "transparent",
                  color: inv ? C.bg : C.text,
                  borderBottom: inv ? "none" : `1px solid ${C.line}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 15,
                      fontWeight: 700,
                      color: inv ? C.pop : C.dim,
                      width: 40,
                    }}
                  >
                    {e.absent ? "—" : String(posOf(e.net)).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Archivo",
                      fontSize: 24,
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {names.get(e.playerId) ?? "?"}
                  </div>
                  {e.isWinner && <div style={chipStyle(C.pop, true)}>Win ↓1</div>}
                  {e.isLoser && <div style={chipStyle(C.loss)}>Loss ↑1</div>}
                  {e.absent && <div style={chipStyle(C.dim)}>No show</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 15,
                      color: inv ? C.inverseDim : C.dim,
                    }}
                  >
                    {e.absent ? "" : `${e.gross} · CAP ${e.capUsed}`}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Archivo",
                      fontSize: 27,
                      fontWeight: 800,
                      width: 58,
                      justifyContent: "flex-end",
                    }}
                  >
                    {e.net}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* The Cut Line */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
            borderLeft: `3px solid ${C.pop}`,
            paddingLeft: 24,
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: 6,
              color: C.dim,
            }}
          >
            The Cut Line
          </div>
          {commentary.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: 2,
                color: i === 0 ? C.pop : C.text,
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Season table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 14,
              textTransform: "uppercase",
              letterSpacing: 6,
              color: C.dim,
              marginBottom: 12,
            }}
          >
            Season
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              backgroundColor: C.card,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              padding: "6px 26px",
            }}
          >
            {standings.map((s, i) => (
              <div
                key={s.player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom:
                    i === standings.length - 1 ? "none" : `1px solid ${C.line}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 14,
                      color: s.position === 1 ? C.pop : C.dim,
                      width: 38,
                    }}
                  >
                    {s.position === 0 ? "—" : String(s.position).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Archivo",
                      fontSize: 19,
                      fontWeight: 800,
                      textTransform: "uppercase",
                    }}
                  >
                    {s.player.name}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    fontFamily: "Archivo",
                    fontSize: 21,
                    fontWeight: 800,
                  }}
                >
                  {s.played + s.absences === 0 ? "—" : fmtToPar(s.toPar)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: "auto",
            paddingTop: 26,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 4,
            color: C.dim,
          }}
        >
          <div style={{ display: "flex" }}>2026/27</div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Archivo", data: archivo, weight: 800 },
        { name: "Mono", data: mono, weight: 500 },
        { name: "Mono", data: monoBold, weight: 700 },
      ],
    }
  );
}
