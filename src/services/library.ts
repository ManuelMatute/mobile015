import type { Book } from "../models/Book";
import { getJSON, setJSON } from "./storage";

const KEY_NOW = "reading_now_v1"; // ahora será Book[] (compatible con el formato viejo)
const KEY_TO_READ = "to_read_v1";
const KEY_DONE = "finished_v1";
const KEY_PROGRESS = "reading_progress_v1";

type ProgressMap = Record<string, number>;

function uniqById(list: Book[]) {
  const m = new Map<string, Book>();
  for (const b of list) m.set(b.id, b);
  return Array.from(m.values());
}

function withoutId(list: Book[], id: string) {
  return list.filter((b) => b.id !== id);
}

// ✅ MIGRACIÓN: soporta viejo (Book) y nuevo (Book[])
async function readNowCompat(): Promise<Book[]> {
  const raw = await getJSON<any>(KEY_NOW, null);

  // nuevo formato: array
  if (Array.isArray(raw)) {
    return raw.filter((x) => x && typeof x.id === "string");
  }

  // viejo formato: un solo book
  if (raw && typeof raw === "object" && typeof raw.id === "string") {
    const migrated = [raw as Book];
    await setJSON(KEY_NOW, migrated);
    return migrated;
  }

  return [];
}

export async function getReadingNow(): Promise<Book[]> {
  return readNowCompat();
}

export async function setReadingNow(list: Book[]) {
  await setJSON(KEY_NOW, uniqById(list));
}

export async function getToRead(): Promise<Book[]> {
  return getJSON<Book[]>(KEY_TO_READ, []);
}

export async function setToRead(list: Book[]) {
  await setJSON(KEY_TO_READ, uniqById(list));
}

export async function getFinished(): Promise<Book[]> {
  return getJSON<Book[]>(KEY_DONE, []);
}

export async function setFinished(list: Book[]) {
  await setJSON(KEY_DONE, uniqById(list));
}

export async function getProgress(): Promise<ProgressMap> {
  return getJSON<ProgressMap>(KEY_PROGRESS, {});
}

export async function setProgress(map: ProgressMap) {
  await setJSON(KEY_PROGRESS, map);
}

// ✅ ahora "empezar a leer" agrega el libro al array de leyendo
export async function startReading(book: Book) {
  const [now, toRead, done, progress] = await Promise.all([
    getReadingNow(),
    getToRead(),
    getFinished(),
    getProgress(),
  ]);

  const nextNow = uniqById([book, ...withoutId(now, book.id)]);
  await setReadingNow(nextNow);

  await setToRead(withoutId(toRead, book.id));
  await setFinished(withoutId(done, book.id));

  if (progress[book.id] == null) {
    const next = { ...progress, [book.id]: 0 };
    await setProgress(next);
  }
}

export async function addToRead(book: Book) {
  const [now, toRead, done] = await Promise.all([
    getReadingNow(),
    getToRead(),
    getFinished(),
  ]);

  // si lo mandas a "por leer", lo sacamos de "leyendo" también
  await setReadingNow(withoutId(now, book.id));

  const next = uniqById([book, ...withoutId(toRead, book.id)]);
  await setToRead(next);
  await setFinished(withoutId(done, book.id));
}

export async function markFinished(book: Book) {
  const [now, toRead, done, progress] = await Promise.all([
    getReadingNow(),
    getToRead(),
    getFinished(),
    getProgress(),
  ]);

  // sacarlo de leyendo
  await setReadingNow(withoutId(now, book.id));

  // mover a terminados
  const nextDone = uniqById([book, ...withoutId(done, book.id)]);
  await setFinished(nextDone);

  // sacarlo de por leer
  await setToRead(withoutId(toRead, book.id));

  // progreso al 100%
  const nextProgress = { ...progress, [book.id]: 100 };
  await setProgress(nextProgress);
}

export async function removeFromNow(id: string) {
  const now = await getReadingNow();
  await setReadingNow(withoutId(now, id));
}

export async function removeFromToRead(id: string) {
  const toRead = await getToRead();
  await setToRead(withoutId(toRead, id));
}

export async function removeFromFinished(id: string) {
  const done = await getFinished();
  await setFinished(withoutId(done, id));
}

export async function updateProgress(bookId: string, value: number) {
  const progress = await getProgress();
  const v = Math.max(0, Math.min(100, Math.round(value)));
  await setProgress({ ...progress, [bookId]: v });
}
