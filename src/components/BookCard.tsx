import { IonCard, IonCardContent } from "@ionic/react";
import type { Book } from "../models/Book";
import { estimateHours } from "../services/books";
import "./BookCard.css";

export default function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  const hours = estimateHours(book.pageCount);

  return (
    <IonCard className="book-card-v2" onClick={onClick}>
      <IonCardContent className="book-card-v2-content">
        <div className="book-card-v2-cover">
          {book.thumbnail ? (
            <img className="book-card-v2-img" src={book.thumbnail} alt={book.title} />
          ) : (
            <div className="book-card-v2-fallback">
              <div className="book-card-v2-initial">{(book.title || "Libro").slice(0, 1).toUpperCase()}</div>
            </div>
          )}
        </div>

        <div className="book-card-v2-info">
          <div className="book-card-v2-title">{book.title}</div>
          <div className="book-card-v2-author">{book.authors?.join(", ") ?? "Autor desconocido"}</div>

          <div className="book-card-v2-meta">
            <span className="book-card-v2-pill">{hours ? `${hours}h aprox.` : "--"}</span>
            {book.language && <span className="book-card-v2-pill">{book.language.toUpperCase()}</span>}
            {typeof book.pageCount === "number" && book.pageCount > 0 && (
              <span className="book-card-v2-pill">{book.pageCount} págs</span>
            )}
          </div>
        </div>
      </IonCardContent>
    </IonCard>
  );
}
