import { IonButton } from "@ionic/react";
import { useIonViewWillEnter } from "@ionic/react";
import { useMemo, useState } from "react";
import { useHistory } from "react-router";

import PageShell from "../../components/ui/PageShell";
import type { Book } from "../../models/Book";
import { getFinished, getProgress, getReadingNow, getToRead, markFinished, removeFromFinished, removeFromToRead, setReadingNow, updateProgress } from "../../services/library";

import "./LibraryTab.css";

function BookRow({ book, right, onClick }: { book: Book; right?: React.ReactNode; onClick: () => void }) {
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
  const [now, setNow] = useState<Book | null>(null);
  const [toRead, setToReadList] = useState<Book[]>([]);
  const [done, setDoneList] = useState<Book[]>([]);
  const [progress, setProgressMap] = useState<Record<string, number>>({});
  const history = useHistory();

  const load = async () => {
    const [n, t, d, p] = await Promise.all([getReadingNow(), getToRead(), getFinished(), getProgress()]);
    setNow(n);
    setToReadList(t);
    setDoneList(d);
    setProgressMap(p);
  };

  useIonViewWillEnter(() => {
    load();
  });

  const nowProg = useMemo(() => {
    if (!now) return 0;
    return progress[now.id] ?? 0;
  }, [now, progress]);

  const onOpen = (id: string) => {
    history.push(`/book/${id}`);
  };

  const onClearNow = async () => {
    await setReadingNow(null);
    await load();
  };

  const onIncProgress = async (delta: number) => {
    if (!now) return;
    const cur = progress[now.id] ?? 0;
    await updateProgress(now.id, cur + delta);
    await load();
  };

  const onFinishNow = async () => {
    if (!now) return;
    await markFinished(now);
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

          {!now ? (
            <p className="app-subtitle" style={{ marginTop: 8 }}>
              Aún no has empezado un libro.
            </p>
          ) : (
            <>
              <BookRow book={now} onClick={() => onOpen(now.id)} right={<div className="lib-badge">{nowProg}%</div>} />

              <div className="lib-actions">
                <IonButton className="app-secondary-button" onClick={() => onIncProgress(10)}>
                  +10%
                </IonButton>
                <IonButton className="app-secondary-button" onClick={() => onIncProgress(-10)}>
                  -10%
                </IonButton>
              </div>

              <div className="lib-actions" style={{ marginTop: 10 }}>
                <IonButton className="app-secondary-button" onClick={onFinishNow}>
                  Terminar
                </IonButton>
                <IonButton className="app-secondary-button" onClick={onClearNow}>
                  Quitar
                </IonButton>
              </div>
            </>
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
                    <button className="lib-x" onClick={(e) => { e.stopPropagation(); onRemoveToRead(b.id); }}>
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
                    <button className="lib-x" onClick={(e) => { e.stopPropagation(); onRemoveDone(b.id); }}>
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
