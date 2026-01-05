// src/models/Book.ts
export type BookLanguage = "es" | "en";

export type Book = {
  id: string;
  title: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
  language?: BookLanguage;      // <- tipado
  categories?: string[];
  thumbnail?: string;
  previewLink?: string;
  publishedDate?: string;
};
