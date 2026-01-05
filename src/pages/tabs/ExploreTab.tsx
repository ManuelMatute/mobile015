// src/pages/tabs/ExploreTab.tsx
import { IonButton } from "@ionic/react";
import { useMemo, useState } from "react";
import { useHistory } from "react-router";

import PageShell from "../../components/ui/PageShell";
import BookCard from "../../components/BookCard";
import { searchBooksWithFilters } from "../../services/books";

import type { Book } from "../../models/Book";

import "./ExploreTab.css";

const GENRES = [
  "Todos",
  "Romance",
  "Misterio",
  "Fantasía",
  "Ciencia Ficción",
  "Thriller",
  "Terror",
  "Aventura",
  "Juvenil",
  "Historia",
  "Biografía",
  "No Ficción",
  "Filosofía",
  "Autoayuda",
  "Psicología",
  "Negocios",
  "Tecnología",
  "Poesía",
  "Cómics",
];

function normalizeList(list?: string[]) {
  const raw = Array.isArray(list) ? list : [];
  return raw
    .flatMap((x) => String(x).split("/"))
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function matchesGenre(book: Book, genre: string) {
  if (!genre || genre === "Todos") return true;

  const cats = normalizeList(book.categories);
  const g = genre.toLowerCase();

  // match flexible (ej: "ciencia ficción" puede venir como "science fiction")
  // Si luego quieres, aquí hacemos un mapa ES->EN.
  return cats.some((c) => c.includes(g));
}

export default function ExploreTab() {
  const history = useHistory();

  const [q, setQ] = useState("");
  const [activeGenre, setActiveGenre] = useState("Todos");
  const [showFilters, setShowFilters] = useState(false);

  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const [rawResults, setRawResults] = useState<Book[]>([]);

  const results = useMemo(() => {
    return rawResults.filter((b) => matchesGenre(b, activeGenre));
  }, [rawResults, activeGenre]);

  const runSearch = async () => {
    const trimmed = q.trim();
    const queryToUse = trimmed || (activeGenre !== "Todos" ? activeGenre : "");

    // si no hay nada que buscar, mostramos el estado inicial (sin resultados)
    if (!queryToUse) {
      setHasSearched(false);
      setRawResults([]);
      return;
    }

    setHasSearched(true);
    setLoading(true);

    try {
      // Nota: esto hace búsqueda por texto (título/autor) usando tu servicio actual
      const res = await searchBooksWithFilters(q, {
        maxResults: 40,
        genre: activeGenre, // "Todos" o un género real
      });
      setRawResults(res);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") runSearch();
  };

  const openBook = (b: Book) => {
    history.push(`/book/${b.id}`, { book: b });
  };

  return (
    <PageShell title="Explorar">
      <div className="explore-hero">
        <div className="explore-hero-inner">
          <div className="explore-hero-title">Descubre tu próxima lectura</div>
          <div className="explore-hero-sub">
            Explora miles de libros y encuentra tu favorito
          </div>

          <div className="explore-search-row">
            <div className="explore-search-inputWrap">
              <span className="explore-search-icon">🔍</span>
              <input
                className="explore-search-input"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Buscar libros o autores..."
              />
            </div>

            <IonButton
              className="explore-filter-btn"
              onClick={() => setShowFilters((v) => !v)}
            >
              Filtros
            </IonButton>

            <IonButton className="explore-search-btn" onClick={runSearch}>
              Buscar
            </IonButton>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="explore-filters">
          <div className="explore-filters-title">Géneros</div>
          <div className="explore-filters-chips">
            {GENRES.map((g) => {
              const active = g === activeGenre;
              return (
                <button
                  key={g}
                  className={`explore-chip ${active ? "is-active" : ""}`}
                  onClick={() => {
                    setActiveGenre(g);
                    // si ya buscó, aplicamos filtro al vuelo (sin volver a pegarle a OpenLibrary)
                    // si NO ha buscado, no hacemos nada todavía (solo deja elegido el filtro)
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>

          {hasSearched && (
            <div className="explore-filters-hint">
              Tip: los filtros se aplican sobre tus resultados actuales.
            </div>
          )}
        </div>
      )}

      <div className="explore-body">
        {!hasSearched ? (
          <div className="explore-empty">
            <div className="explore-empty-emoji">📚</div>
            <div className="explore-empty-title">Comienza tu búsqueda</div>
            <div className="explore-empty-sub">
              Usa el buscador y filtros para encontrar tu próximo libro favorito
            </div>
          </div>
        ) : loading ? (
          <div className="explore-empty">
            <div className="explore-empty-title">Buscando...</div>
            <div className="explore-empty-sub">
              Esto puede tardar unos segundos (OpenLibrary).
            </div>
          </div>
        ) : results.length === 0 ? (
          <div className="explore-empty">
            <div className="explore-empty-emoji">🔍</div>
            <div className="explore-empty-title">No se encontraron resultados</div>
            <div className="explore-empty-sub">
              Intenta con otra búsqueda o ajusta los filtros
            </div>
          </div>
        ) : (
          <>
            <div className="explore-results-head">
              <div className="explore-results-title">
                Resultados{" "}
                <span className="explore-results-count">({results.length} libros)</span>
              </div>

              <IonButton
                fill="clear"
                className="app-muted-button"
                onClick={() => {
                  setQ("");
                  setActiveGenre("Todos");
                  setHasSearched(false);
                  setRawResults([]);
                }}
              >
                Limpiar
              </IonButton>
            </div>

            <div className="explore-grid">
              {results.map((b) => (
                <div key={b.id} className="explore-grid-item">
                  <BookCard book={b} onClick={() => openBook(b)} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}
