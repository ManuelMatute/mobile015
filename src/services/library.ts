import type { Book } from "../models/Book";
import { getJSON, setJSON } from "./storage";

const KEY_NOW = "reading_now_v1";
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

export async function getReadingNow(): Promise<Book | null> {
  return getJSON<Book | null>(KEY_NOW, null);
}

export async function setReadingNow(book: Book | null) {
  await setJSON(KEY_NOW, book);
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

export async function startReading(book: Book) {
  const [toRead, done, progress] = await Promise.all([getToRead(), getFinished(), getProgress()]);

  await setReadingNow(book);
  await setToRead(withoutId(toRead, book.id));
  await setFinished(withoutId(done, book.id));

  if (progress[book.id] == null) {
    const next = { ...progress, [book.id]: 0 };
    await setProgress(next);
  }
}

export async function addToRead(book: Book) {
  const [toRead, done] = await Promise.all([getToRead(), getFinished()]);
  const next = uniqById([book, ...withoutId(withoutId(toRead, book.id), book.id)]);
  await setToRead(next);
  await setFinished(withoutId(done, book.id));
}

export async function markFinished(book: Book) {
  const [toRead, done, now, progress] = await Promise.all([
    getToRead(),
    getFinished(),
    getReadingNow(),
    getProgress(),
  ]);

  const nextDone = uniqById([book, ...withoutId(done, book.id)]);
  await setFinished(nextDone);
  await setToRead(withoutId(toRead, book.id));

  if (now?.id === book.id) {
    await setReadingNow(null);
  }

  const nextProgress = { ...progress, [book.id]: 100 };
  await setProgress(nextProgress);
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
