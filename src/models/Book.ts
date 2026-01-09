export type BookLanguage = "es" | "en";

export type Book = {
  id: string;
  title: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
  language?: BookLanguage;      
  categories?: string[];
  thumbnail?: string;
  previewLink?: string;
  publishedDate?: string;
};
