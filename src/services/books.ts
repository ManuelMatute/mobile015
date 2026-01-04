// src/services/books.ts
import type { Book } from "../models/Book";
import type { UserPrefs } from "../models/UserPrefs";

const SEARCH_URL = "https://openlibrary.org/search.json";
const WORK_URL = "https://openlibrary.org/works"; // /works/OLxxxxW.json
const SUBJECT_URL = "https://openlibrary.org/subjects"; // /subjects/{slug}.json
const AUTHOR_URL = "https://openlibrary.org/authors"; // /authors/OLxxxxA.json
const COVERS = "https://covers.openlibrary.org/b/id";

const DEFAULT_LANG = "es";

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

function authorIdFromKey(key?: string) {
  // "/authors/OLxxxxA" => "OLxxxxA"
  if (!key) return "";
  const k = String(key);
  if (!k.includes("/")) return k;
  const parts = k.split("/");
  return parts[parts.length - 1] || "";
}

function normalizeSubjects(subjects?: string[]) {
  const raw = subjects ?? [];
  const uniq = Array.from(new Set(raw.map((s) => String(s).trim()).filter(Boolean)));
  // Nota: en listados (cards) conviene recortar; en detalle ya estás manejando ver más/menos en BookDetail
  return uniq.slice(0, 10);
}

/** Para search.json (Solr) */
function subjectQuery(subject: string) {
  const s = subject.trim();
  if (!s) return "";
  if (s.includes(" ")) return `subject:"${s}"`;
  return `subject:${s}`;
}

export function estimateHours(pageCount?: number, pagesPerHour = 35): number | null {
  if (!pageCount || pageCount <= 0) return null;
  return Math.max(1, Math.round((pageCount / pagesPerHour) * 10) / 10);
}

/** ---------- SEARCH (Explore) ---------- */

async function olSearch(params: URLSearchParams): Promise<any[]> {
  const url = `${SEARCH_URL}?${params.toString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("OpenLibrary search error:", res.status, url, txt.slice(0, 200));
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
    typeof doc?.number_of_pages_median === "number" ? doc.number_of_pages_median : undefined;

  return {
    id: workId,
    title: doc?.title ?? "Sin título",
    authors: Array.isArray(doc?.author_name) ? doc.author_name : undefined,
    description: undefined,
    pageCount,
    language: appLang,
    categories: subjects,
    thumbnail: coverUrl(doc?.cover_i, "M"),
    previewLink: workId ? `https://openlibrary.org/works/${workId}` : undefined,
    publishedDate: doc?.first_publish_year ? String(doc.first_publish_year) : undefined,
  };
}

export async function searchBooks(
  query: string,
  opts?: { lang?: string; maxResults?: number }
): Promise<Book[]> {
  const q = query.trim();
  const maxResults = opts?.maxResults ?? 20;

  if (!q) return getRecommendedBooks({ lang: opts?.lang ?? DEFAULT_LANG, maxResults });

  const params = new URLSearchParams({
    q,
    limit: String(maxResults),
    // lang influye pero NO excluye
    lang: opts?.lang ?? DEFAULT_LANG,
    fields: "key,title,author_name,cover_i,first_publish_year,language,subject,number_of_pages_median",
  });

  const docs = await olSearch(params);
  return docs.map(mapDocToBook);
}

/** ---------- WORK + EDITIONS (para BookDetail y enriquecer páginas) ---------- */

async function fetchWork(workId: string) {
  const url = `${WORK_URL}/${encodeURIComponent(workId)}.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function fetchEditions(workId: string, limit = 15) {
  const url = `${WORK_URL}/${encodeURIComponent(workId)}/editions.json?limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
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

/** ---------- AUTHORS (para que en detalle sí salga autor) ---------- */

async function fetchAuthorName(authorId: string): Promise<string | null> {
  const clean = String(authorId || "").trim();
  if (!clean) return null;

  const url = `${AUTHOR_URL}/${encodeURIComponent(clean)}.json`;
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

async function pickWorkAuthors(work: any, max = 3): Promise<string[] | undefined> {
  // work.authors suele ser: [{ author: { key: "/authors/OL..A" }, type: {...}}]
  const arr: any[] = Array.isArray(work?.authors) ? work.authors : [];
  const ids: string[] = arr
    .map((a: any) => authorIdFromKey(a?.author?.key))
    .filter((id: string) => Boolean(id));

  const uniqIds: string[] = Array.from(new Set(ids)).slice(0, max);
  if (uniqIds.length === 0) return undefined;

  // ✅ FIX: evita uniqIds.map(fetchAuthorName) directo y usa type guard en filter
  const names = (await Promise.all(uniqIds.map((id) => fetchAuthorName(id)))).filter(
    (n): n is string => Boolean(n)
  );

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

    const coverId = typeof work?.covers?.[0] === "number" ? work.covers[0] : undefined;

    // ✅ autores desde Work API + Authors API
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
      publishedDate: work?.created?.value ? String(work.created.value).slice(0, 10) : undefined,
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

  const baseQuery = opts?.genre ? subjectQuery(opts.genre) : "popular OR recommended OR classics";

  const params = new URLSearchParams({
    q: baseQuery,
    limit: String(maxResults),
    lang: opts?.lang ?? DEFAULT_LANG,
    fields: "key,title,author_name,cover_i,first_publish_year,language,subject,number_of_pages_median",
  });

  const docs = await olSearch(params);
  return docs.map(mapDocToBook);
}

/** ---------- SUBJECTS API (para que “Romance => Romance”) ---------- */

/**
 * Mapeo: Género “bonito” (tu UI) => slugs reales/útiles en Subjects API.
 * Nota: esto no tiene que ser perfecto desde el día 1; lo vas ampliando.
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

  // details=true trae más info por work en muchos casos
  const url = `${SUBJECT_URL}/${encodeURIComponent(clean)}.json?limit=${limit}&details=true`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("OpenLibrary subject error:", res.status, url, txt.slice(0, 200));
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
    Array.isArray(work?.subject) ? work.subject : Array.isArray(work?.subjects) ? work.subjects : []
  );

  const coverId = typeof work?.cover_id === "number" ? work.cover_id : undefined;

  return {
    id: workId,
    title: work?.title ?? "Sin título",
    authors,
    description: undefined,
    // Subjects API NO trae páginas; luego intentamos enriquecer por ediciones
    pageCount: undefined,
    language: undefined,
    categories: subjects,
    thumbnail: coverUrl(coverId, "M"),
    previewLink: workId ? `https://openlibrary.org/works/${workId}` : undefined,
    publishedDate: work?.first_publish_year ? String(work.first_publish_year) : undefined,
  };
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

  // NEW: prioriza más cortos (si hay pageCount)
  if (prefs?.level === "NEW") {
    filtered = filtered.sort((a, b) => {
      const ha = estimateHours(a.pageCount ?? 0) ?? 999;
      const hb = estimateHours(b.pageCount ?? 0) ?? 999;
      return ha - hb;
    });
  }

  return filtered;
}

/**
 * Enriquecer algunos libros con páginas/idioma usando ediciones.
 * (Mejora BookCard y BookDetail cuando navegas desde Home)
 */
async function enrichWithEditions(books: Book[], take = 14): Promise<Book[]> {
  const head = books.slice(0, take);
  const tail = books.slice(take);

  const enrichedHead = await Promise.all(
    head.map(async (b) => {
      try {
        const ed = await fetchEditions(b.id, 12);
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

  return [...enrichedHead, ...tail];
}

/** ---------- Recomendaciones por usuario (HOME) ---------- */

export async function getRecommendedBooksForUser(
  prefs: UserPrefs | null,
  opts: { maxResults?: number } = {}
): Promise<Book[]> {
  const maxResults = opts.maxResults ?? 6;

  const slugs = subjectsFromGenres(prefs?.genres ?? []);

  // Pool grande para variedad
  const targetPool = Math.max(40, maxResults * 8);
  const perSlug = 40;

  let pool: Book[] = [];

  // 1) Si hay géneros: Subjects API (respeta género)
  if (slugs.length > 0) {
    for (const slug of slugs) {
      const works = await fetchSubjectWorks(slug, perSlug);
      const mapped = works.map(mapSubjectWorkToBook).filter((b) => !!b.id);
      pool = uniqById([...pool, ...mapped]);

      if (pool.length >= targetPool) break;
    }

    // enriquecer un poco para páginas/idioma
    pool = await enrichWithEditions(pool, 14);

    // aplicar filtros
    pool = filterAndSortForPrefs(pool, prefs);
  }

  // 2) Fallback
  if (pool.length < maxResults) {
    const fb = await getRecommendedBooks({
      maxResults: Math.max(60, maxResults * 12),
      lang: DEFAULT_LANG,
    });
    pool = filterAndSortForPrefs(uniqById([...pool, ...fb]), prefs);
  }

  return pool.slice(0, maxResults);
}
