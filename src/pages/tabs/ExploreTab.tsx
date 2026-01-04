import { IonSearchbar } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router";

import PageShell from "../../components/ui/PageShell";
import BookCard from "../../components/BookCard";
import { searchBooks } from "../../services/books";
import type { Book } from "../../models/Book";

export default function ExploreTab() {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const history = useHistory();
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    setBooks([]);
  }, []);

  const onSearch = (value: string) => {
    setQ(value);

    if (tRef.current) window.clearTimeout(tRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setBooks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    tRef.current = window.setTimeout(async () => {
      const res = await searchBooks(trimmed, { maxResults: 20 });
      setBooks(res);
      setLoading(false);
    }, 350);
  };

  const openBook = (b: Book) => {
    // ✅ Igual: pasamos el book completo al detalle
    history.push(`/book/${b.id}`, { book: b });
  };

  return (
    <PageShell title="Explorar">
      <IonSearchbar
        className="app-searchbar"
        value={q}
        onIonInput={(e) => onSearch(e.detail.value ?? "")}
        placeholder="Buscar libros o autores..."
      />

      <div className="app-section">
        {loading && <p className="app-subtitle">Buscando...</p>}

        {!loading && q.trim().length > 0 && books.length === 0 && (
          <p className="app-subtitle">No se encontraron resultados.</p>
        )}

        <div className="app-list">
          {books.map((b) => (
            <BookCard key={b.id} book={b} onClick={() => openBook(b)} />
          ))}
        </div>
      </div>
    </PageShell>
  );
}
