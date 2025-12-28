export type Book = {
  id: string;
  title: string;
  authors?: string[];
  description?: string;
  pageCount?: number;
  language?: string;
  categories?: string[];
  thumbnail?: string;     
  previewLink?: string;   
  publishedDate?: string; 
};
