import type { Book } from "../models/Book";

const BASE_URL = "https://www.googleapis.com/books/v1/volumes";


const DEFAULT_LANG = "es";


const API_KEY: string | undefined = undefined;

function toURL(url: string) {
  return API_KEY ? `${url}&key=${encodeURIComponent(API_KEY)}` : url;
}

function mapVolumeToBook(item: any): Book {
  const info = item.volumeInfo ?? {};
  const images = info.imageLinks ?? {};

  // elegimos una portada razonable
  const thumbnail =
    images.thumbnail ||
    images.smallThumbnail ||
    images.small ||
    images.medium ||
    images.large ||
    images.extraLarge ||
    undefined;

  return {
    id: item.id,
    title: info.title ?? "Sin título",
    authors: info.authors,
    description: info.description,
    pageCount: info.pageCount,
    language: info.language,
    categories: info.categories,
    thumbnail,
    previewLink: info.previewLink,
    publishedDate: info.publishedDate,
  };
}


export function estimateHours(pageCount?: number, pagesPerHour = 35): number | null {
  if (!pageCount || pageCount <= 0) return null;
  return Math.max(1, Math.round((pageCount / pagesPerHour) * 10) / 10); // 1 decimal
}


export async function searchBooks(
  query: string,
  opts?: { lang?: string; maxResults?: number }
): Promise<Book[]> {
  const q = query.trim();
  const lang = opts?.lang ?? DEFAULT_LANG;
  const maxResults = opts?.maxResults ?? 20;


  if (!q) return getRecommendedBooks({ lang, maxResults });

  const params = new URLSearchParams({
    q,
    printType: "books",
    maxResults: String(maxResults),
    langRestrict: lang,
  });

  const url = toURL(`${BASE_URL}?${params.toString()}`);
  const res = await fetch(url);

  if (!res.ok) {
    console.error("Google Books search error:", res.status);
    return [];
  }

  const data = await res.json();
  const items: any[] = data.items ?? [];
  return items.map(mapVolumeToBook);
}


export async function getBookById(id: string): Promise<Book | null> {
  const url = toURL(`${BASE_URL}/${encodeURIComponent(id)}?projection=lite`);
  const res = await fetch(url);

  if (!res.ok) {
    console.error("Google Books getBookById error:", res.status);
    return null;
  }

  const data = await res.json();
  return mapVolumeToBook(data);
}


export async function getRecommendedBooks(opts?: {
  lang?: string;
  maxResults?: number;
  genre?: string;
}): Promise<Book[]> {
  const lang = opts?.lang ?? DEFAULT_LANG;
  const maxResults = opts?.maxResults ?? 10;

  

  const baseQuery = opts?.genre
    ? `subject:${opts.genre}`
    : `bestseller`;

  const params = new URLSearchParams({
    q: baseQuery,
    printType: "books",
    maxResults: String(maxResults),
    langRestrict: lang,
    orderBy: "relevance",
  });

  const url = toURL(`${BASE_URL}?${params.toString()}`);
  const res = await fetch(url);

  if (!res.ok) {
    console.error("Google Books recommended error:", res.status);
    return [];
  }

  const data = await res.json();
  const items: any[] = data.items ?? [];
  return items.map(mapVolumeToBook);
}
