// src/services/library.ts
import type { Book } from "../models/Book";
import { getJSON, setJSON } from "./storage";

const KEY_NOW = "reading_now_v1"; // ahora será Book[] (compatible con el formato viejo)
const KEY_TO_READ = "to_read_v1";
const KEY_DONE = "finished_v1";

// ✅ LEGACY (antes guardaba %)
const KEY_PROGRESS_LEGACY_PERCENT = "reading_progress_v1";

// ✅ NUEVO (ahora guardamos páginas leídas)
const KEY_PROGRESS_PAGES = "reading_progress_pages_v1";

type ProgressMap = Record<string, number>; // ahora lo usamos como "pagesRead"

function uniqById(list: Book[]) {
  const m = new Map<string, Book>();
  for (const b of list) m.set(b.id, b);
  return Array.from(m.values());
}

function withoutId(list: Book[], id: string) {
  return list.filter((b) => b.id !== id);
}

function clampInt(n: number, min: number, max: number) {
  const v = Math.round(Number.isFinite(n) ? n : 0);
  return Math.max(min, Math.min(max, v));
}

function pageCountOf(book?: Book | null) {
  const p = book?.pageCount;
  return typeof p === "number" && p > 0 ? p : 0;
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

/**
 * ✅ NUEVO: leer progreso en páginas
 */
export async function getProgressPages(): Promise<ProgressMap> {
  return getJSON<ProgressMap>(KEY_PROGRESS_PAGES, {});
}

export async function setProgressPages(map: ProgressMap) {
  await setJSON(KEY_PROGRESS_PAGES, map);
}

/**
 * ✅ LEGACY: leer progreso viejo (porcentaje)
 */
async function getProgressLegacyPercent(): Promise<Record<string, number>> {
  return getJSON<Record<string, number>>(KEY_PROGRESS_LEGACY_PERCENT, {});
}

/**
 * ✅ MIGRACIÓN AUTOMÁTICA:
 * Si no existe reading_progress_pages_v1, intentamos convertir desde porcentaje (reading_progress_v1)
 * usando pageCount de los libros disponibles.
 */
export async function ensureProgressPagesFromLegacy(allBooks: Book[]): Promise<ProgressMap> {
  const pages = await getProgressPages();

  // si ya existe algo, no tocamos
  if (pages && Object.keys(pages).length > 0) return pages;

  const legacy = await getProgressLegacyPercent();
  if (!legacy || Object.keys(legacy).length === 0) return pages;

  const byId = new Map<string, Book>();
  for (const b of allBooks) byId.set(b.id, b);

  const migrated: ProgressMap = {};

  for (const [id, percentRaw] of Object.entries(legacy)) {
    const book = byId.get(id);
    const total = pageCountOf(book);

    // si no tengo pageCount, no puedo convertir bien -> lo dejo en 0 (o lo ignoras)
    if (total <= 0) {
      migrated[id] = 0;
      continue;
    }

    const percent = clampInt(percentRaw, 0, 100);
    migrated[id] = clampInt((percent / 100) * total, 0, total);
  }

  await setProgressPages(migrated);
  return migrated;
}

/**
 * ✅ Actualiza páginas leídas sumando delta.
 * Si pasas totalPages, hace clamp a [0..totalPages].
 */
export async function updateProgressPages(bookId: string, deltaPages: number, totalPages?: number) {
  const progress = await getProgressPages();
  const cur = progress[bookId] ?? 0;

  const max = typeof totalPages === "number" && totalPages > 0 ? totalPages : Number.MAX_SAFE_INTEGER;
  const nextVal = clampInt(cur + deltaPages, 0, max);

  await setProgressPages({ ...progress, [bookId]: nextVal });
}

/**
 * ✅ Set exacto de páginas leídas (por si luego quieres slider/input)
 */
export async function setProgressPagesExact(bookId: string, pagesRead: number, totalPages?: number) {
  const progress = await getProgressPages();
  const max = typeof totalPages === "number" && totalPages > 0 ? totalPages : Number.MAX_SAFE_INTEGER;
  const nextVal = clampInt(pagesRead, 0, max);
  await setProgressPages({ ...progress, [bookId]: nextVal });
}

// ✅ ahora "empezar a leer" agrega el libro al array de leyendo
export async function startReading(book: Book) {
  const [now, toRead, done, progressPages] = await Promise.all([
    getReadingNow(),
    getToRead(),
    getFinished(),
    getProgressPages(),
  ]);

  const nextNow = uniqById([book, ...withoutId(now, book.id)]);
  await setReadingNow(nextNow);

  await setToRead(withoutId(toRead, book.id));
  await setFinished(withoutId(done, book.id));

  // si no existe registro, lo creamos en 0 páginas
  if (progressPages[book.id] == null) {
    await setProgressPages({ ...progressPages, [book.id]: 0 });
  }
}

export async function addToRead(book: Book) {
  const [now, toRead, done] = await Promise.all([getReadingNow(), getToRead(), getFinished()]);

  // si lo mandas a "por leer", lo sacamos de "leyendo" también
  await setReadingNow(withoutId(now, book.id));

  const next = uniqById([book, ...withoutId(toRead, book.id)]);
  await setToRead(next);
  await setFinished(withoutId(done, book.id));
}

export async function markFinished(book: Book) {
  const [now, toRead, done, progressPages] = await Promise.all([
    getReadingNow(),
    getToRead(),
    getFinished(),
    getProgressPages(),
  ]);

  // sacarlo de leyendo
  await setReadingNow(withoutId(now, book.id));

  // mover a terminados
  const nextDone = uniqById([book, ...withoutId(done, book.id)]);
  await setFinished(nextDone);

  // sacarlo de por leer
  await setToRead(withoutId(toRead, book.id));

  // ✅ progreso = totalPages si existe, si no 0 (no podemos inventar)
  const total = pageCountOf(book);
  const nextProgress = { ...progressPages, [book.id]: total > 0 ? total : (progressPages[book.id] ?? 0) };
  await setProgressPages(nextProgress);

  // (opcional) si quieres mantener legacy en 100% para compat vieja:
  // const legacy = await getProgressLegacyPercent();
  // await setJSON(KEY_PROGRESS_LEGACY_PERCENT, { ...legacy, [book.id]: 100 });
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
