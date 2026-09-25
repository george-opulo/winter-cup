"use client";

import { useState } from "react";

export function ShareCard({ roundId, label }: { roundId: string; label: string }) {
  const [busy, setBusy] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const res = await fetch(`/api/share/${roundId}`);
      if (!res.ok) throw new Error("card not ready");
      const blob = await res.blob();
      const file = new File([blob], "winter-cup.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Winter Cup — ${label}` });
      } else {
        window.open(`/api/share/${roundId}`, "_blank");
      }
    } catch {
      // Cancelled the share sheet, or the card 404'd — nothing to clean up.
    }
    setBusy(false);
  }

  return (
    <button className="btn small" onClick={share} disabled={busy}>
      {busy ? "Making card…" : "Share result card"}
    </button>
  );
}
