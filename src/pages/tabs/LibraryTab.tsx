// src/pages/tabs/LibraryTab.tsx
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
  updateProgressPages,
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

  const history = useHistory();

  const load = async () => {
    const [n, t, d] = await Promise.all([getReadingNow(), getToRead(), getFinished()]);

    // ✅ migración 1 sola vez si aún no existe progress_pages
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

  const onIncPages = async (book: Book, deltaPages: number) => {
    const total = pageCountOf(book);
    await updateProgressPages(book.id, deltaPages, total > 0 ? total : undefined);
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

                    {/* Texto: Página X de Y */}
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

                    {/* Botones: ahora son páginas */}
                    <div className="lib-actions">
                      <IonButton className="app-secondary-button" onClick={() => onIncPages(b, 10)}>
                        +10 págs
                      </IonButton>
                      <IonButton className="app-secondary-button" onClick={() => onIncPages(b, -10)}>
                        -10 págs
                      </IonButton>
                    </div>

                    <div className="lib-actions" style={{ marginTop: 10 }}>
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
