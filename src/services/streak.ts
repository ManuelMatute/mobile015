import { getJSON, setJSON } from "./storage";

type StreakState = {
  streakCount: number;
  lastReadISO: string | null; 
};

const KEY = "streak_state_v1";

function todayISO(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function diffDays(aISO: string, bISO: string): number {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((b.getTime() - a.getTime()) / ms);
}

export async function getStreak(): Promise<StreakState> {
  return getJSON<StreakState>(KEY, { streakCount: 0, lastReadISO: null });
}

export async function markReadToday(): Promise<StreakState> {
  const state = await getStreak();
  const today = todayISO();

  if (state.lastReadISO === today) return state;

  if (!state.lastReadISO) {
    const next = { streakCount: 1, lastReadISO: today };
    await setJSON(KEY, next);
    return next;
  }

  const days = diffDays(state.lastReadISO, today);

  if (days === 1) {
    const next = { streakCount: state.streakCount + 1, lastReadISO: today };
    await setJSON(KEY, next);
    return next;
  }

  const next = { streakCount: 1, lastReadISO: today };
  await setJSON(KEY, next);
  return next;
}

export async function resetStreak(): Promise<void> {
  await setJSON(KEY, { streakCount: 0, lastReadISO: null });
}
