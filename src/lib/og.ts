/** Shared bits for the generated share/preview images (next/og + satori). */

export const OG_COLORS = {
  bg: "#0b1d16",
  card: "#10281f",
  line: "#1f4234",
  text: "#ece9dd",
  dim: "#8ca79a",
  pop: "#ff5a1f",
  loss: "#e0705f",
  inverseDim: "#5c6660",
};

export function fmtToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

const FONT_CACHE = new Map<string, Promise<ArrayBuffer>>();

/** Fetches a TTF from Google Fonts (css2 serves truetype to unknown agents). */
export function loadGoogleFont(family: string, weight: number): Promise<ArrayBuffer> {
  const key = `${family}:${weight}`;
  if (!FONT_CACHE.has(key)) {
    FONT_CACHE.set(
      key,
      (async () => {
        const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
          family
        )}:wght@${weight}`;
        const css = await (await fetch(cssUrl)).text();
        const match = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/);
        if (!match) throw new Error(`No downloadable font for ${key}`);
        const res = await fetch(match[1]);
        return await res.arrayBuffer();
      })()
    );
  }
  return FONT_CACHE.get(key)!;
}
