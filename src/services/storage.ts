import { Preferences } from "@capacitor/preferences";

export async function setJSON(key: string, value: unknown) {
  await Preferences.set({ key, value: JSON.stringify(value) });
}

export async function getJSON<T>(key: string, fallback: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function removeKey(key: string) {
  await Preferences.remove({ key });
}