import { ImageResponse } from "next/og";
import { computeSeason } from "@/lib/engine";
import { OG_COLORS as C, fmtToPar, loadGoogleFont } from "@/lib/og";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const alt = "Winter Cup live table";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const season = await getStore().loadSeason();
  const { standings, results } = computeSeason(season);
  const top = standings.slice(0, 5);

  const [archivo, mono] = await Promise.all([
    loadGoogleFont("Archivo", 800),
    loadGoogleFont("Spline Sans Mono", 500),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          backgroundColor: C.bg,
          color: C.text,
          padding: "72px 80px",
          fontFamily: "Mono",
          gap: 72,
        }}
      >
        {/* Left: wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: 340,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Archivo",
              fontSize: 74,
              fontWeight: 800,
              textTransform: "uppercase",
              lineHeight: 0.95,
            }}
          >
            <div style={{ display: "flex" }}>Winter</div>
            <div style={{ display: "flex", color: C.pop }}>Cup</div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 15,
              textTransform: "uppercase",
              letterSpacing: 4,
              color: C.dim,
              gap: 10,
            }}
          >
            <div style={{ display: "flex" }}>Live standings</div>
            <div style={{ display: "flex" }}>
              {results.length === 0
                ? "Season starts 26 Sep"
                : `After round ${results.length}`}
            </div>
          </div>
        </div>

        {/* Right: table */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "center",
          }}
        >
          {top.map((s, i) => {
            const inv = s.position === 1;
            return (
              <div
                key={s.player.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px 24px",
                  borderRadius: inv ? 14 : 0,
                  backgroundColor: inv ? C.text : "transparent",
                  color: inv ? C.bg : C.text,
                  borderBottom:
                    inv || i === top.length - 1 ? "none" : `1px solid ${C.line}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 15,
                      color: inv ? C.pop : C.dim,
                      width: 42,
                    }}
                  >
                    {s.position === 0 ? "—" : String(s.position).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontFamily: "Archivo",
                      fontSize: 25,
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
                    fontSize: 28,
                    fontWeight: 800,
                  }}
                >
                  {s.played + s.absences === 0 ? "—" : fmtToPar(s.toPar)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: archivo, weight: 800 },
        { name: "Mono", data: mono, weight: 500 },
      ],
    }
  );
}
