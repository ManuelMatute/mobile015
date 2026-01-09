import { IonButton } from "@ionic/react";
import { useIonViewWillEnter } from "@ionic/react";
import { useMemo, useState } from "react";
import { useHistory } from "react-router";

import PageShell from "../../components/ui/PageShell";
import type { Book } from "../../models/Book";
import {
  ensureProgressPagesFromLegacy,
  getFinished,
  getProgressPages,
  getReadingNow,
  getToRead,
  markFinished,
  removeFromFinished,
  removeFromNow,
  removeFromToRead,
  setProgressPagesExact,
} from "../../services/library";

import "./LibraryTab.css";

function BookRow({
  book,
  right,
  onClick,
}: {
  book: Book;
  right?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <div className="lib-row" onClick={onClick}>
      <div className="lib-thumb">
        {book.thumbnail ? (
          <img src={book.thumbnail} alt={book.title} />
        ) : (
          <div className="lib-thumb-fallback" />
        )}
      </div>

      <div className="lib-info">
        <div className="lib-title">{book.title}</div>
        <div className="lib-sub">{book.authors?.join(", ") ?? "Autor desconocido"}</div>
      </div>

      {right && <div className="lib-right">{right}</div>}
    </div>
  );
}

function pageCountOf(b: Book) {
  const p = b.pageCount;
  return typeof p === "number" && p > 0 ? p : 0;
}

export default function LibraryTab() {
  const [now, setNowList] = useState<Book[]>([]);
  const [toRead, setToReadList] = useState<Book[]>([]);
  const [done, setDoneList] = useState<Book[]>([]);
  const [progressPages, setProgressPagesMap] = useState<Record<string, number>>({});
  const [pageInputs, setPageInputs] = useState<Record<string, string>>({});

  const history = useHistory();

  const load = async () => {
    const [n, t, d] = await Promise.all([getReadingNow(), getToRead(), getFinished()]);

    const allBooks = [...n, ...t, ...d];
    await ensureProgressPagesFromLegacy(allBooks);

    const p = await getProgressPages();

    setNowList(n);
    setToReadList(t);
    setDoneList(d);
    setProgressPagesMap(p);
  };

  useIonViewWillEnter(() => {
    load();
  });

  const pagesReadFor = useMemo(() => {
    return (id: string) => progressPages[id] ?? 0;
  }, [progressPages]);

  const onOpen = (id: string) => {
    history.push(`/book/${id}`);
  };

  const onSetPages = async (book: Book, pages: number) => {
    const total = pageCountOf(book);
    await setProgressPagesExact(book.id, pages, total > 0 ? total : undefined);
    await load();
    setPageInputs(prev => ({ ...prev, [book.id]: "" }));
  };

  const onIncPages = async (book: Book, deltaPages: number) => {
    const total = pageCountOf(book);
    const current = pagesReadFor(book.id);
    const newPages = current + deltaPages;
    
    if (total > 0 && newPages > total) {
      await setProgressPagesExact(book.id, total, total);
    } else if (newPages < 0) {
      await setProgressPagesExact(book.id, 0, total > 0 ? total : undefined);
    } else {
      await setProgressPagesExact(book.id, newPages, total > 0 ? total : undefined);
    }
    
    await load();
  };

  const onFinish = async (b: Book) => {
    await markFinished(b);
    await load();
  };

  const onRemoveNow = async (id: string) => {
    await removeFromNow(id);
    await load();
  };

  const onRemoveToRead = async (id: string) => {
    await removeFromToRead(id);
    await load();
  };

  const onRemoveDone = async (id: string) => {
    await removeFromFinished(id);
    await load();
  };

  const handlePageInputKeyPress = (e: React.KeyboardEvent, book: Book) => {
    if (e.key === 'Enter') {
      const value = parseInt(pageInputs[book.id] || "0");
      if (!isNaN(value)) {
        onSetPages(book, value);
      }
    }
  };

  return (
    <PageShell title="Mi lectura">
      <div className="app-section">
        <div className="app-card" style={{ padding: 16 }}>
          <div className="lib-section-title">Leyendo</div>

          {now.length === 0 ? (
            <p className="app-subtitle" style={{ marginTop: 8 }}>
              Aún no has empezado un libro.
            </p>
          ) : (
            <div className="lib-list">
              {now.map((b) => {
                const readPages = pagesReadFor(b.id);
                const totalPages = pageCountOf(b);

                const pct =
                  totalPages > 0
                    ? Math.max(0, Math.min(100, Math.round((readPages / totalPages) * 100)))
                    : 0;

                const rightBadge =
                  totalPages > 0 ? (
                    <div className="lib-badge">
                      {readPages}/{totalPages}
                    </div>
                  ) : (
                    <div className="lib-badge">{readPages} págs</div>
                  );

                return (
                  <div key={b.id} style={{ marginTop: 10 }}>
                    <BookRow book={b} onClick={() => onOpen(b.id)} right={rightBadge} />

                    {/* Texto: Página X de Y con porcentaje */}
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {totalPages > 0 ? `Página ${readPages} de ${totalPages}` : `Páginas leídas: ${readPages}`}
                      {totalPages > 0 ? ` (${pct}%)` : ""}
                    </div>

                    {/* Barra de progreso */}
                    {totalPages > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          width: "100%",
                          height: 8,
                          borderRadius: 999,
                          background: "rgba(0,0,0,0.08)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${pct}%`,
                            borderRadius: 999,
                            background: "var(--ion-color-primary)",
                            transition: "width 200ms ease",
                          }}
                        />
                      </div>
                    )}

                    {/*  Caja para escribir número con botones +/- */}
                    <div className="lib-actions" style={{ marginTop: 12 }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 8,
                        width: "100%",
                        justifyContent: "center"
                      }}>
                        {/* Botón - */}
                        <button
                          onClick={() => onIncPages(b, -1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            border: "2px solid var(--ion-color-primary)",
                            background: "white",
                            fontSize: 24,
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--ion-color-primary)",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--ion-color-primary)";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.color = "var(--ion-color-primary)";
                          }}
                        >
                          -
                        </button>
                        
                        {/* Caja de texto para número */}
                        <div style={{ position: "relative", width: 120 }}>
                          <input
                            type="number"
                            min="0"
                            max={totalPages > 0 ? totalPages : undefined}
                            value={pageInputs[b.id] || ""}
                            onChange={(e) => setPageInputs(prev => ({ ...prev, [b.id]: e.target.value }))}
                            onKeyPress={(e) => handlePageInputKeyPress(e, b)}
                            placeholder={`${readPages}`}
                            style={{
                              width: "100%",
                              padding: "12px 12px",
                              paddingRight: 40,
                              borderRadius: 8,
                              border: "2px solid var(--ion-color-primary)",
                              fontSize: 18,
                              fontWeight: 600,
                              textAlign: "center",
                              background: "white",
                              color: "var(--text-primary)",
                              boxSizing: "border-box"
                            }}
                          />
                          <span style={{
                            position: "absolute",
                            right: 12,
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                            pointerEvents: "none"
                          }}>
                            págs
                          </span>
                        </div>
                        
                        {/* Botón + */}
                        <button
                          onClick={() => onIncPages(b, 1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 8,
                            border: "2px solid var(--ion-color-primary)",
                            background: "white",
                            fontSize: 24,
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--ion-color-primary)",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "var(--ion-color-primary)";
                            e.currentTarget.style.color = "white";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "white";
                            e.currentTarget.style.color = "var(--ion-color-primary)";
                          }}
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Botón para aplicar el número escrito (Enter o click) */}
                      <IonButton 
                        className="app-primary-button"
                        style={{ marginTop: 12, width: "100%" }}
                        onClick={() => {
                          const value = parseInt(pageInputs[b.id] || "0");
                          if (!isNaN(value)) {
                            onSetPages(b, value);
                          }
                        }}
                        disabled={!pageInputs[b.id] || isNaN(parseInt(pageInputs[b.id]))}
                      >
                        Ir a esta página
                      </IonButton>
                    </div>

                    {/* Botones Terminar y Quitar */}
                    <div className="lib-actions" style={{ marginTop: 12 }}>
                      <IonButton className="app-secondary-button" onClick={() => onFinish(b)}>
                        Terminar
                      </IonButton>
                      <IonButton className="app-secondary-button" onClick={() => onRemoveNow(b.id)}>
                        Quitar
                      </IonButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="app-section">
        <div className="app-card" style={{ padding: 16 }}>
          <div className="lib-section-title">Por leer</div>

          {toRead.length === 0 ? (
            <p className="app-subtitle" style={{ marginTop: 8 }}>
              Tu lista está vacía.
            </p>
          ) : (
            <div className="lib-list">
              {toRead.map((b) => (
                <BookRow
                  key={b.id}
                  book={b}
                  onClick={() => onOpen(b.id)}
                  right={
                    <button
                      className="lib-x"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveToRead(b.id);
                      }}
                    >
                      ✕
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="app-section">
        <div className="app-card" style={{ padding: 16 }}>
          <div className="lib-section-title">Terminados</div>

          {done.length === 0 ? (
            <p className="app-subtitle" style={{ marginTop: 8 }}>
              Todavía no marcas libros como terminados.
            </p>
          ) : (
            <div className="lib-list">
              {done.map((b) => (
                <BookRow
                  key={b.id}
                  book={b}
                  onClick={() => onOpen(b.id)}
                  right={
                    <button
                      className="lib-x"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveDone(b.id);
                      }}
                    >
                      ✕
                    </button>
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}