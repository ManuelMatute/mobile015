// src/services/books.ts
import type { Book } from "../models/Book";
import type { UserPrefs } from "../models/UserPrefs";
import { getJSON, setJSON } from "./storage";

const SEARCH_URL = "https://openlibrary.org/search.json";
const WORK_URL = "https://openlibrary.org/works"; // /works/OLxxxxW.json
const AUTHOR_URL = "https://openlibrary.org/authors"; // /authors/OLxxxxA.json
const SUBJECT_URL = "https://openlibrary.org/subjects"; // /subjects/{slug}.json
const COVERS = "https://covers.openlibrary.org/b/id";

const DEFAULT_LANG: "es" | "en" = "es";

// ---- Diversificación / anti-repetición ----
const RECENT_RECS_KEY = "recent_recs_v1";
const RECENT_RECS_MAX = 48; // cuántos IDs recordamos
const YEAR_THRESHOLD = 1990; // "suave": prioriza >= 1990 sin excluir
const SHUFFLE_JITTER = 0.35; // 0..1 (más alto = más random)

// ---- Enriquecimiento (ediciones) ----
// ✅ performance: menos ediciones y menos concurrencia
const ENRICH_TAKE = 20;
const ENRICH_CONCURRENCY = 4;
const EDITIONS_LIMIT = 6;

/** ---------- Helpers de normalización ---------- */

function toAppLangFromOL(lang?: string): "es" | "en" | undefined {
  const l = (lang ?? "").toLowerCase().trim();
  if (!l) return undefined;
  if (l === "spa") return "es";
  if (l === "eng") return "en";
  if (l === "es") return "es";
  if (l === "en") return "en";
  return undefined;
}

function coverUrl(coverId?: number, size: "S" | "M" | "L" = "M") {
  if (!coverId) return undefined;
  return `${COVERS}/${coverId}-${size}.jpg`;
}

function workIdFromKey(key?: string) {
  // key viene como "/works/OL123W" o "OL123W"
  if (!key) return "";
  const k = String(key);
  if (!k.includes("/")) return k;
  const parts = k.split("/");
  return parts[parts.length - 1] || "";
}

// ✅ TIPADO FUERTE desde aquí (clave del fix)
function authorIdFromKey(key: unknown): string | null {
  if (typeof key !== "string") return null;
  // "/authors/OL123A" => "OL123A"
  const id = key.split("/").pop();
  return id && id.trim().length > 0 ? id.trim() : null;
}

function normalizeSubjects(subjects?: string[]) {
  const raw = subjects ?? [];
  const uniq = Array.from(
    new Set(raw.map((s) => String(s).trim()).filter(Boolean))
  );
  return uniq.slice(0, 10);
}

function parseYear(publishedDate?: string): number {
  if (!publishedDate) return 0;
  const m = String(publishedDate).match(/\d{4}/);
  if (!m) return 0;
  const y = Number(m[0]);
  if (!Number.isFinite(y)) return 0;
  return y;
}

function isRecentYear(year: number, threshold = YEAR_THRESHOLD) {
  return year >= threshold;
}

/** Para search.json (Solr) */
function subjectQuery(subject: string) {
  const s = subject.trim();
  if (!s) return "";
  if (s.includes(" ")) return `subject:"${s}"`;
  return `subject:${s}`;
}

export function estimateHours(
  pageCount?: number,
  pagesPerHour = 35
): number | null {
  if (!pageCount || pageCount <= 0) return null;
  return Math.max(1, Math.round((pageCount / pagesPerHour) * 10) / 10);
}

/** ---------- Utilidad: shuffle ---------- */
function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * "Jitter": después del sort, metemos una pequeña mezcla para que no salgan
 * siempre los mismos 6.
 */
function jitterShuffle<T>(arr: T[], strength = SHUFFLE_JITTER) {
  if (arr.length < 3) return arr;
  if (strength <= 0) return arr;

  // copiamos para no mutar accidentalmente si se reusa
  const out = arr.slice();
  const swaps = Math.floor(out.length * strength);

  for (let k = 0; k < swaps; k++) {
    const i = Math.floor(Math.random() * out.length);
    const j = Math.floor(Math.random() * out.length);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** ---------- SEARCH (Explore) ---------- */

async function olSearch(params: URLSearchParams): Promise<any[]> {
  const url = `${SEARCH_URL}?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(
        "OpenLibrary search error:",
        res.status,
        url,
        txt.slice(0, 200)
      );
      return [];
    }
    const data = await res.json();
    return data?.docs ?? [];
  } catch (e) {
    console.error("OpenLibrary search failed:", url, e);
    return [];
  }
}

function mapDocToBook(doc: any): Book {
  const workId = workIdFromKey(doc?.key);
  const subjects = normalizeSubjects(doc?.subject);

  const langArr: string[] = Array.isArray(doc?.language) ? doc.language : [];
  const firstLang = langArr[0];
  const appLang = toAppLangFromOL(firstLang);

  const pageCount =
    typeof doc?.number_of_pages_median === "number"
      ? doc.number_of_pages_median
      : undefined;

  const b: Book = {
    id: workId,
    title: doc?.title ?? "Sin título",
    authors: Array.isArray(doc?.author_name) ? doc.author_name : undefined,
    description: undefined,
    pageCount,
    language: appLang,
    categories: subjects,
    thumbnail: coverUrl(doc?.cover_i, "M"),
    previewLink: workId ? `https://openlibrary.org/works/${workId}` : undefined,
    publishedDate: doc?.first_publish_year
      ? String(doc.first_publish_year)
      : undefined,
  };

  // señales de popularidad (cuando existan)
  (b as any).__editionCount =
    typeof doc?.edition_count === "number" ? doc.edition_count : undefined;

  return b;
}

export async function searchBooks(
  query: string,
  opts?: { lang?: string; maxResults?: number }
): Promise<Book[]> {
  const q = query.trim();
  const maxResults = opts?.maxResults ?? 20;

  if (!q)
    return getRecommendedBooks({ lang: opts?.lang ?? DEFAULT_LANG, maxResults });

  const params = new URLSearchParams({
    q,
    limit: String(maxResults),
    // lang influye pero NO excluye
    lang: opts?.lang ?? DEFAULT_LANG,
    // agregamos edition_count para señal de popularidad
    fields:
      "key,title,author_name,cover_i,first_publish_year,language,subject,number_of_pages_median,edition_count",
  });

  const docs = await olSearch(params);
  return docs.map(mapDocToBook);
}

// ✅ Explore: búsqueda con filtros reales (server-side genre con Subjects API)
export async function searchBooksWithFilters(
  query: string,
  opts?: { lang?: string; maxResults?: number; genre?: string }
): Promise<Book[]> {
  const q = (query ?? "").trim();
  const maxResults = opts?.maxResults ?? 20;
  const genre = (opts?.genre ?? "").trim();

  // Caso 1: sin género => comportamiento actual
  if (!genre || genre === "Todos") {
    return searchBooks(q, { lang: opts?.lang, maxResults });
  }

  // Caso 2: con género => Subjects API (server-side)
  const slugs = genreToSubjectSlugs[genre] ?? [];
  if (slugs.length === 0) {
    // si no mapeamos ese género, fallback al search normal
    return searchBooks(q || genre, { lang: opts?.lang, maxResults });
  }

  // Traemos works por subject (varios slugs) y armamos un pool
  const perSlug = Math.max(20, maxResults * 3);
  const worksBatches = await Promise.all(slugs.map((s) => fetchSubjectWorks(s, perSlug)));

  let pool = uniqById(
    worksBatches
      .flat()
      .map(mapSubjectWorkToBook)
      .filter((b) => !!b.id)
  );

  // Si el usuario también escribió texto, filtramos el pool por título/autor (rápido y se siente “real”)
  if (q) {
    const qq = q.toLowerCase();
    pool = pool.filter((b) => {
      const t = (b.title ?? "").toLowerCase();
      const a = (b.authors?.join(", ") ?? "").toLowerCase();
      return t.includes(qq) || a.includes(qq);
    });
  }

  // (Opcional) enriquecer un poco con ediciones (páginas/idioma) sin matar performance
  pool = await enrichWithEditions(pool, Math.min(ENRICH_TAKE, pool.length));

  return pool.slice(0, maxResults);
}



/** ---------- WORK + EDITIONS + AUTHOR (para BookDetail / enriquecer) ---------- */

async function fetchWork(workId: string) {
  const url = `${WORK_URL}/${encodeURIComponent(workId)}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchEditions(workId: string, limit = EDITIONS_LIMIT) {
  const url = `${WORK_URL}/${encodeURIComponent(workId)}/editions.json?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchAuthorName(authorId: string): Promise<string | null> {
  const id = String(authorId || "").trim();
  if (!id) return null;
  const url = `${AUTHOR_URL}/${encodeURIComponent(id)}.json`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const name = typeof data?.name === "string" ? data.name.trim() : "";
    return name || null;
  } catch {
    return null;
  }
}

function pickEditionPages(editions: any[] | undefined) {
  if (!Array.isArray(editions)) return undefined;
  const e = editions.find((x) => typeof x?.number_of_pages === "number");
  return typeof e?.number_of_pages === "number" ? e.number_of_pages : undefined;
}

function pickEditionLang(editions: any[] | undefined) {
  if (!Array.isArray(editions)) return undefined;
  for (const e of editions) {
    const langs = e?.languages;
    if (Array.isArray(langs) && langs.length) {
      const k = langs[0]?.key ?? "";
      const code = String(k).split("/").pop(); // "eng"
      const app = toAppLangFromOL(code);
      if (app) return app;
    }
  }
  return undefined;
}

function normalizeDescription(desc: any): string | undefined {
  if (!desc) return undefined;
  if (typeof desc === "string") return desc;
  if (typeof desc?.value === "string") return desc.value;
  return undefined;
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

async function pickWorkAuthors(work: any, max = 3): Promise<string[] | undefined> {
  const arr = Array.isArray(work?.authors) ? work.authors : [];

  // ✅ aquí forzamos el tipo real: (string | null)[]
  const idsRaw: (string | null)[] = arr.map((a: any) =>
    authorIdFromKey(a?.author?.key)
  );

  // ✅ aquí TS ya sabe que ids es string[]
  const ids: string[] = idsRaw.filter(isNonEmptyString);

  const uniqIds: string[] = Array.from(new Set(ids)).slice(0, max);
  if (uniqIds.length === 0) return undefined;

  const namesRaw = await Promise.all(uniqIds.map((id) => fetchAuthorName(id)));

  // si fetchAuthorName devuelve string | null
  const names: string[] = namesRaw.filter(isNonEmptyString);

  return names.length ? names : undefined;
}

export async function getBookById(id: string): Promise<Book | null> {
  try {
    const [work, ed] = await Promise.all([fetchWork(id), fetchEditions(id, 15)]);
    if (!work) return null;

    const editions = ed?.entries ?? [];

    const pageCount = pickEditionPages(editions);
    const langFromEdition = pickEditionLang(editions);

    const subjects = normalizeSubjects(work?.subjects);
    const desc = normalizeDescription(work?.description);

    const coverId =
      typeof work?.covers?.[0] === "number" ? work.covers[0] : undefined;

    // autores desde Work API (si existen)
    const authors = await pickWorkAuthors(work, 3);

    return {
      id,
      title: work?.title ?? "Sin título",
      authors,
      description: desc,
      pageCount,
      language: langFromEdition,
      categories: subjects,
      thumbnail: coverUrl(coverId, "L") ?? coverUrl(coverId, "M"),
      previewLink: `https://openlibrary.org/works/${id}`,
      // mejor: first_publish_date o first_publish_year si existe; si no, created
      publishedDate:
        (work?.first_publish_date ? String(work.first_publish_date) : undefined) ??
        (work?.first_publish_year ? String(work.first_publish_year) : undefined) ??
        (work?.created?.value ? String(work.created.value).slice(0, 10) : undefined),
    };
  } catch (e) {
    console.error("OpenLibrary getBookById failed:", id, e);
    return null;
  }
}

/** ---------- Recomendaciones genéricas (fallback) ---------- */

export async function getRecommendedBooks(opts?: {
  lang?: string;
  maxResults?: number;
  genre?: string;
}): Promise<Book[]> {
  const maxResults = opts?.maxResults ?? 10;

  const baseQuery = opts?.genre
    ? subjectQuery(opts.genre)
    : "popular OR recommended OR classics";

  const params = new URLSearchParams({
    q: baseQuery,
    limit: String(maxResults),
    lang: opts?.lang ?? DEFAULT_LANG,
    fields:
      "key,title,author_name,cover_i,first_publish_year,language,subject,number_of_pages_median,edition_count",
  });

  const docs = await olSearch(params);
  return docs.map(mapDocToBook);
}

/** ---------- SUBJECTS API (género => works reales) ---------- */

/**
 * Mapeo: Género (UI) => slugs de Subjects API.
 * Se puede ir ampliando con el tiempo.
 */
const genreToSubjectSlugs: Record<string, string[]> = {
  Romance: ["romance", "love", "love_stories"],
  Misterio: ["mystery", "detective_and_mystery_stories", "crime"],
  Fantasía: ["fantasy", "epic_fantasy", "magic"],
  "Ciencia Ficción": ["science_fiction", "sci-fi", "space_opera"],
  Thriller: ["thriller", "suspense", "psychological_thriller"],
  Terror: ["horror", "ghost_stories", "supernatural"],
  Aventura: ["adventure", "action", "sea_stories"],
  Juvenil: ["young_adult", "juvenile_fiction", "teen_fiction", "coming_of_age"],
  Historia: ["history", "historical_fiction", "world_history"],
  Biografía: ["biography", "biographies", "memoir"],
  "No Ficción": ["nonfiction", "essays", "journalism"],
  Filosofía: ["philosophy", "ethics", "metaphysics"],
  Autoayuda: ["self-help", "personal_development", "motivation"],
  Psicología: ["psychology", "mental_health", "cognitive_psychology"],
  Negocios: ["business", "entrepreneurship", "management"],
  Tecnología: ["technology", "computer_science", "programming"],
  Poesía: ["poetry", "poems", "verse"],
  Cómics: ["comics", "graphic_novels", "manga"],
};

async function fetchSubjectWorks(slug: string, limit = 40): Promise<any[]> {
  const clean = String(slug || "").trim();
  if (!clean) return [];

  const url = `${SUBJECT_URL}/${encodeURIComponent(clean)}.json?limit=${limit}&details=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(
        "OpenLibrary subject error:",
        res.status,
        url,
        txt.slice(0, 200)
      );
      return [];
    }
    const data = await res.json();
    return Array.isArray(data?.works) ? data.works : [];
  } catch (e) {
    console.error("OpenLibrary subject failed:", slug, e);
    return [];
  }
}

function mapSubjectWorkToBook(work: any): Book {
  const workId = workIdFromKey(work?.key);

  const authors =
    Array.isArray(work?.authors)
      ? work.authors.map((a: any) => a?.name).filter(Boolean)
      : undefined;

  const subjects = normalizeSubjects(
    Array.isArray(work?.subject)
      ? work.subject
      : Array.isArray(work?.subjects)
      ? work.subjects
      : []
  );

  const coverId = typeof work?.cover_id === "number" ? work.cover_id : undefined;

  const b: Book = {
    id: workId,
    title: work?.title ?? "Sin título",
    authors,
    description: undefined,
    pageCount: undefined, // Subjects API no trae páginas
    language: undefined, // se intenta poblar en enrich
    categories: subjects,
    thumbnail: coverUrl(coverId, "M"),
    previewLink: workId ? `https://openlibrary.org/works/${workId}` : undefined,
    publishedDate: work?.first_publish_year
      ? String(work.first_publish_year)
      : undefined,
  };

  // señal de popularidad: edition_count
  (b as any).__editionCount =
    typeof work?.edition_count === "number" ? work.edition_count : undefined;

  return b;
}

function subjectsFromGenres(genres: string[]) {
  const terms = genres
    .flatMap((g) => genreToSubjectSlugs[g] ?? [])
    .map((s) => String(s).trim())
    .filter(Boolean);

  return Array.from(new Set(terms));
}

/** ---------- Filtros por prefs ---------- */

function maxHoursFromPrefs(prefs: UserPrefs | null) {
  const mins = prefs?.dailyMinutesGoal ?? 10;
  if (mins === 5) return 6;
  if (mins === 10) return 9;
  return 14;
}

function maxPagesFromPrefs(prefs: UserPrefs | null) {
  if (prefs?.level === "NEW") return 320;
  return 900;
}

function uniqById(list: Book[]) {
  const m = new Map<string, Book>();
  for (const b of list) m.set(b.id, b);
  return Array.from(m.values());
}

/**
 * Orden "suave":
 * - prioriza >= YEAR_THRESHOLD
 * - dentro de recientes: más nuevo primero
 * - luego (si NEW): más corto primero
 * - y agrega señales de popularidad cuando existan
 */
function filterAndSortForPrefs(books: Book[], prefs: UserPrefs | null) {
  const maxHours = maxHoursFromPrefs(prefs);
  const maxPages = maxPagesFromPrefs(prefs);

  let filtered = books.filter((b) => {
    const pages = typeof b.pageCount === "number" ? b.pageCount : 0;

    // si no sabemos páginas, NO filtramos por páginas
    if (pages > 0 && pages > maxPages) return false;

    const h = estimateHours(pages);
    if (typeof h === "number" && h > maxHours) return false;

    return true;
  });

  filtered = filtered.sort((a, b) => {
    const ya = parseYear(a.publishedDate);
    const yb = parseYear(b.publishedDate);

    const ra = isRecentYear(ya) ? 1 : 0;
    const rb = isRecentYear(yb) ? 1 : 0;

    // 1) recientes primero
    if (ra !== rb) return rb - ra;

    // 2) más nuevo primero
    if (ya !== yb) return yb - ya;

    // 3) señal de popularidad: edition_count (si existe)
    const ea = Number((a as any).__editionCount ?? 0);
    const eb = Number((b as any).__editionCount ?? 0);
    if (ea !== eb) return eb - ea;

    // 4) NEW: prioriza más cortos (si hay pageCount)
    if (prefs?.level === "NEW") {
      const ha = estimateHours(a.pageCount ?? 0) ?? 999;
      const hb = estimateHours(b.pageCount ?? 0) ?? 999;
      if (ha !== hb) return ha - hb;
    }

    // 5) desempate estable
    return String(a.title || "").localeCompare(String(b.title || ""));
  });

  // 6) pequeña mezcla para variedad
  filtered = jitterShuffle(filtered, SHUFFLE_JITTER);

  return filtered;
}

/**
 * Enriquecer libros con páginas/idioma usando ediciones.
 */
async function enrichWithEditions(books: Book[], take = ENRICH_TAKE): Promise<Book[]> {
  const head = books.slice(0, take);
  const tail = books.slice(take);

  const out: Book[] = [];
  let i = 0;

  while (i < head.length) {
    const chunk = head.slice(i, i + ENRICH_CONCURRENCY);

    const enrichedChunk = await Promise.all(
      chunk.map(async (b) => {
        try {
          const ed = await fetchEditions(b.id, EDITIONS_LIMIT);
          const editions = ed?.entries ?? [];
          const pageCount = pickEditionPages(editions);
          const lang = pickEditionLang(editions);

          return {
            ...b,
            pageCount: typeof pageCount === "number" ? pageCount : b.pageCount,
            language: lang ?? b.language,
          };
        } catch {
          return b;
        }
      })
    );

    out.push(...enrichedChunk);
    i += ENRICH_CONCURRENCY;
  }

  return [...out, ...tail];
}

/** ---------- Anti-repetición: recordar IDs mostrados ---------- */

async function getRecentRecIds(): Promise<string[]> {
  const ids = await getJSON<string[]>(RECENT_RECS_KEY, []);
  return Array.isArray(ids) ? ids.filter(Boolean) : [];
}

async function pushRecentRecIds(newIds: string[]) {
  const prev = await getRecentRecIds();
  const merged = Array.from(new Set([...newIds, ...prev])).slice(0, RECENT_RECS_MAX);
  await setJSON(RECENT_RECS_KEY, merged);
}

function applyRecentExclusion(pool: Book[], recentIds: string[], keepAtLeast = 10) {
  if (!recentIds.length) return pool;

  const set = new Set(recentIds);
  const filtered = pool.filter((b) => !set.has(b.id));

  // si nos quedamos muy cortos, no excluimos (suave)
  if (filtered.length < keepAtLeast) return pool;

  return filtered;
}

/** ---------- Idiomas: split ---------- */

function splitByLanguage(books: Book[]) {
  const es: Book[] = [];
  const en: Book[] = [];
  const other: Book[] = [];

  for (const b of books) {
    if (b.language === "es") es.push(b);
    else if (b.language === "en") en.push(b);
    else other.push(b);
  }

  // “other” lo repartimos al final (si no sabemos, ES por defecto)
  for (const b of other) es.push(b);

  return { es, en };
}

/** ---------- Recomendaciones por usuario (HOME) ---------- */

export async function getRecommendedBooksForUser(
  prefs: UserPrefs | null,
  opts: { maxResults?: number } = {}
): Promise<Book[]> {
  const maxResults = opts.maxResults ?? 6;

  // Tomamos slugs asociados a géneros elegidos
  const slugs = subjectsFromGenres(prefs?.genres ?? []);

  // ✅ performance: pool más pequeño y menos items por slug
  const targetPool = Math.max(36, maxResults * 8);
  const perSlug = 24;

  let pool: Book[] = [];

  // 1) Si hay géneros: Subjects API
  if (slugs.length > 0) {
    const slugsShuffled = shuffleInPlace(slugs.slice());

    // ✅ performance: batches paralelos (3 slugs a la vez)
    const BATCH = 3;

    for (let i = 0; i < slugsShuffled.length; i += BATCH) {
      const batch = slugsShuffled.slice(i, i + BATCH);

      const results = await Promise.all(
        batch.map((slug) => fetchSubjectWorks(slug, perSlug))
      );

      const mergedWorks = results.flat();
      const mapped = mergedWorks.map(mapSubjectWorkToBook).filter((b) => !!b.id);

      pool = uniqById([...pool, ...mapped]);

      if (pool.length >= targetPool) break;
    }

    // enriquecer items (language/pageCount) — ahora más barato
    pool = await enrichWithEditions(pool, ENRICH_TAKE);

    // filtros + orden suave + jitter
    pool = filterAndSortForPrefs(pool, prefs);
  }

  // 2) Fallback: búsqueda amplia
  if (pool.length < maxResults) {
    const fb = await getRecommendedBooks({
      maxResults: Math.max(60, maxResults * 12),
      lang: DEFAULT_LANG,
    });
    pool = filterAndSortForPrefs(uniqById([...pool, ...fb]), prefs);
  }

  // 3) Anti-repetición (suave)
  const recent = await getRecentRecIds();
  pool = applyRecentExclusion(pool, recent, Math.max(10, maxResults * 3));

  // 4) Cortar y recordar IDs mostrados
  const chosen = pool.slice(0, maxResults);
  await pushRecentRecIds(chosen.map((b) => b.id));

  return chosen;
}

/**
 * Recomendaciones separadas por idioma (para UI por secciones).
 */
export async function getRecommendedBooksForUserSplitByLanguage(
  prefs: UserPrefs | null,
  opts: { maxPerLang?: number } = {}
): Promise<{ es: Book[]; en: Book[] }> {
  const maxPerLang = opts.maxPerLang ?? 6;

  const combined = await getRecommendedBooksForUser(prefs, {
    maxResults: Math.max(24, maxPerLang * 6),
  });

  const { es, en } = splitByLanguage(combined);

  return {
    es: es.slice(0, maxPerLang),
    en: en.slice(0, maxPerLang),
  };
}
