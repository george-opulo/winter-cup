"use server";

import { revalidatePath } from "next/cache";
import { checkPin, grantAdmin, requireAdmin, revokeAdmin } from "./auth";
import { getStore } from "./store";
import type { ScoreEntry } from "./types";

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(_prev: { error?: string } | null, formData: FormData) {
  const pin = String(formData.get("pin") ?? "");
  if (!checkPin(pin)) {
    return { error: "Wrong PIN" };
  }
  await grantAdmin();
  refresh();
  return {};
}

export async function logout() {
  await revokeAdmin();
  refresh();
}

export async function addPlayer(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const capRaw = String(formData.get("cap") ?? "").trim();
  const cap = capRaw === "" ? null : Number(capRaw);
  await getStore().addPlayer(name, Number.isFinite(cap as number) ? cap : null);
  refresh();
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const capRaw = String(formData.get("cap") ?? "").trim();
  const cap = capRaw === "" ? null : Number(capRaw);
  const active = formData.get("active") === "on";
  if (!id || !name) return;
  await getStore().updatePlayer(id, {
    name,
    startingHandicap: Number.isFinite(cap as number) ? cap : null,
    active,
  });
  refresh();
}

export async function createRound(formData: FormData) {
  await requireAdmin();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return;
  await getStore().createRound({
    label,
    course: String(formData.get("course") ?? "").trim(),
    chooserId: String(formData.get("chooserId") ?? "") || null,
    date: String(formData.get("date") ?? "") || null,
    teeTime: String(formData.get("teeTime") ?? "") || null,
  });
  refresh();
}

export async function updateRound(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getStore().updateRound(id, {
    label: String(formData.get("label") ?? "").trim(),
    course: String(formData.get("course") ?? "").trim(),
    chooserId: String(formData.get("chooserId") ?? "") || null,
    date: String(formData.get("date") ?? "") || null,
    teeTime: String(formData.get("teeTime") ?? "") || null,
  });
  refresh();
}

export async function deleteRound(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getStore().deleteRound(id);
  refresh();
}

export async function reopenRound(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await getStore().updateRound(id, { status: "upcoming" });
  refresh();
}

/** Score entry. Expects per-player fields: gross_<playerId>, absent_<playerId>,
 *  override_<playerId>. A player with no gross and no absent flag is left out
 *  of the round entirely (e.g. joined the cup later). */
export async function saveScores(formData: FormData) {
  await requireAdmin();
  const roundId = String(formData.get("roundId") ?? "");
  if (!roundId) return;
  const playerIds = formData.getAll("playerIds").map(String);
  const scores: ScoreEntry[] = [];
  for (const playerId of playerIds) {
    const grossRaw = String(formData.get(`gross_${playerId}`) ?? "").trim();
    const absent = formData.get(`absent_${playerId}`) === "on";
    const overrideRaw = String(formData.get(`override_${playerId}`) ?? "").trim();
    const gross = grossRaw === "" ? null : Number(grossRaw);
    const overrideNet = overrideRaw === "" ? null : Number(overrideRaw);
    if (absent) {
      scores.push({
        playerId,
        gross: null,
        absent: true,
        overrideNet: Number.isFinite(overrideNet as number) ? overrideNet : null,
      });
    } else if (gross != null && Number.isFinite(gross)) {
      scores.push({ playerId, gross, absent: false, overrideNet: null });
    }
  }
  await getStore().saveScores(roundId, scores);
  refresh();
}

/* ------------------------------ Scheduler ------------------------------- */
/* Submitting free dates is open to the group (the URL is only shared among
   the 7 players) — no PIN needed. Applying the auto-schedule is admin-only. */

export async function setFreeDate(playerId: string, date: string, free: boolean) {
  if (!playerId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  await getStore().setFreeDate(playerId, date, free);
  refresh();
}

/** Applies the auto-schedule: fields named date_<roundId> set round dates. */
export async function applySchedule(formData: FormData) {
  await requireAdmin();
  const store = getStore();
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("date_")) continue;
    const roundId = key.slice("date_".length);
    const date = String(value);
    if (!roundId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    await store.updateRound(roundId, { date });
  }
  refresh();
}
