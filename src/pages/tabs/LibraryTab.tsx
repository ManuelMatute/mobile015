import { IonButton } from "@ionic/react";
import { useIonViewWillEnter } from "@ionic/react";
import { useMemo, useState } from "react";
import { useHistory } from "react-router";

import PageShell from "../../components/ui/PageShell";
import type { Book } from "../../models/Book";
import {
  getFinished,
  getProgress,
  getReadingNow,
  getToRead,
  markFinished,
  removeFromFinished,
  removeFromNow,
  removeFromToRead,
  updateProgress,
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

export default function LibraryTab() {
  const [now, setNowList] = useState<Book[]>([]);
  const [toRead, setToReadList] = useState<Book[]>([]);
  const [done, setDoneList] = useState<Book[]>([]);
  const [progress, setProgressMap] = useState<Record<string, number>>({});
  const history = useHistory();

  const load = async () => {
    const [n, t, d, p] = await Promise.all([
      getReadingNow(),
      getToRead(),
      getFinished(),
      getProgress(),
    ]);
    setNowList(n);
    setToReadList(t);
    setDoneList(d);
    setProgressMap(p);
  };

  useIonViewWillEnter(() => {
    load();
  });

  const progFor = useMemo(() => {
    return (id: string) => progress[id] ?? 0;
  }, [progress]);

  const onOpen = (id: string) => {
    history.push(`/book/${id}`);
  };

  const onIncProgress = async (bookId: string, delta: number) => {
    const cur = progress[bookId] ?? 0;
    await updateProgress(bookId, cur + delta);
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
                const p = progFor(b.id);

                return (
                  <div key={b.id} style={{ marginTop: 10 }}>
                    <BookRow
                      book={b}
                      onClick={() => onOpen(b.id)}
                      right={<div className="lib-badge">{p}%</div>}
                    />

                    <div className="lib-actions">
                      <IonButton className="app-secondary-button" onClick={() => onIncProgress(b.id, 10)}>
                        +10%
                      </IonButton>
                      <IonButton className="app-secondary-button" onClick={() => onIncProgress(b.id, -10)}>
                        -10%
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
