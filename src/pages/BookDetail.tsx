import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import type { Book } from "../models/Book";
import type { UserPrefs } from "../models/UserPrefs";
import { estimateHours, getBookById } from "../services/books";
import { markReadToday } from "../services/streak";
import { getJSON } from "../services/storage";
import { addToRead, markFinished, startReading } from "../services/library";

import "./BookDetail.css";

const PREFS_KEY = "user_prefs_v1";

// Tags “Ver más”
const TAGS_COLLAPSED_COUNT = 10;
const TAGS_MAX_IN_DETAIL = 80;

type LocationState = { book?: Book };

function uniqStrings(list: (string | undefined | null)[]) {
  const clean = list.map((x) => String(x ?? "").trim()).filter(Boolean);
  return Array.from(new Set(clean));
}

function mergeBooks(base: Book, incoming: Book): Book {
  const mergedCategories = uniqStrings([
    ...(base.categories ?? []),
    ...(incoming.categories ?? []),
  ]).slice(0, TAGS_MAX_IN_DETAIL);

  return {
    id: base.id || incoming.id,
    title: base.title || incoming.title,

    authors:
      base.authors && base.authors.length ? base.authors : incoming.authors,
    description: base.description ?? incoming.description,

    pageCount:
      typeof base.pageCount === "number" ? base.pageCount : incoming.pageCount,
    language: base.language ?? incoming.language,

    thumbnail: base.thumbnail ?? incoming.thumbnail,
    previewLink: base.previewLink ?? incoming.previewLink,
    publishedDate: base.publishedDate ?? incoming.publishedDate,

    categories: mergedCategories.length
      ? mergedCategories
      : base.categories ?? incoming.categories,
  };
}

function normalizeCategories(categories?: string[]) {
  const raw = categories ?? [];
  const parts = raw
    .flatMap((c) => String(c).split("/"))
    .map((s) => s.trim())
    .filter(Boolean);

  const uniq = Array.from(new Set(parts));
  return uniq.slice(0, TAGS_MAX_IN_DETAIL);
}

function pagesPerHourFromPrefs(prefs: UserPrefs | null) {
  if (!prefs) return 35;
  if (prefs.level === "NEW") return 28;
  if (prefs.level === "EXPERIENCED") return 40;
  return 35;
}

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation<LocationState>();

  const initialBook = location.state?.book ?? null;

  const [book, setBook] = useState<Book | null>(initialBook);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  const [loading, setLoading] = useState(!initialBook);
  const [error, setError] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [showAllTags, setShowAllTags] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setError("");
      setShowAllTags(false);

      if (!initialBook) setLoading(true);

      try {
        const [bWork, p] = await Promise.all([
          getBookById(id), // Work API 
          getJSON<UserPrefs | null>(PREFS_KEY, null),
        ]);

        if (!mounted) return;

        setPrefs(p);

        if (!bWork) {
          if (!initialBook) {
            setBook(null);
            setError(
              "No se pudo cargar este libro (OpenLibrary no devolvió datos para este ID)."
            );
          }
          return;
        }

        if (initialBook) setBook(mergeBooks(initialBook, bWork));
        else setBook(bWork);
      } catch (e) {
        if (!mounted) return;
        if (!initialBook) {
          setBook(null);
          setError(
            "Ocurrió un error cargando el libro. Revisa la consola (Network) para ver el detalle."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id]);

  const cats = useMemo(
    () => normalizeCategories(book?.categories),
    [book?.categories]
  );
  const hasCats = cats.length > 0;

  const pagesPerHour = useMemo(() => pagesPerHourFromPrefs(prefs), [prefs]);
  const hours = useMemo(
    () => estimateHours(book?.pageCount, pagesPerHour),
    [book?.pageCount, pagesPerHour]
  );

  const days = useMemo(() => {
    const mins = prefs?.dailyMinutesGoal;
    if (!hours || !mins) return null;
    const totalMinutes = Math.round(hours * 60);
    return Math.max(1, Math.ceil(totalMinutes / mins));
  }, [hours, prefs?.dailyMinutesGoal]);

  const shownCats = useMemo(() => {
    if (!hasCats) return ["Otros"];
    if (showAllTags) return cats;
    return cats.slice(0, TAGS_COLLAPSED_COUNT);
  }, [cats, hasCats, showAllTags]);

  const canToggleTags = hasCats && cats.length > TAGS_COLLAPSED_COUNT;

  if (loading) {
    return (
      <IonPage className="app-page">
        <IonHeader className="app-header">
          <IonToolbar>
            <IonTitle>Libro</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="app-content">
          <div className="app-container">Cargando...</div>
        </IonContent>
      </IonPage>
    );
  }

  if (!book) {
    return (
      <IonPage className="app-page">
        <IonHeader className="app-header">
          <IonToolbar>
            <IonTitle>Libro</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="app-content">
          <div className="app-container">
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, color: "var(--text-primary)", marginBottom: 8 }}>
                No disponible
              </div>
              <div className="app-subtitle" style={{ margin: 0, fontWeight: 700 }}>
                {error || "No se encontró información para este libro."}
              </div>

              <IonButton
                expand="block"
                className="app-secondary-button"
                style={{ marginTop: 12 }}
                onClick={() => window.location.reload()}
              >
                Reintentar
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const authorText = book.authors?.join(", ") ?? "Desconocido";
  const pagesText = book.pageCount ? `${book.pageCount}` : "--";
  const hoursText = hours ? `${hours} horas` : "--";
  const daysText = days ? `${days} día(s) aprox.` : "--";

  const onStart = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await startReading(book);
      setMsg("Guardado en: Leyendo ✅");
    } finally {
      setBusy(false);
    }
  };

  const onAddToRead = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await addToRead(book);
      setMsg("Añadido a: Por leer ✅");
    } finally {
      setBusy(false);
    }
  };

  const onFinish = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await markFinished(book);
      setMsg("Marcado como: Terminado ✅");
    } finally {
      setBusy(false);
    }
  };

  const onMarkRead = async () => {
    if (busy) return;
    setBusy(true);
    setMsg("");
    try {
      await markReadToday();
      setMsg("Racha actualizada ✅");
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonPage className="app-page bookdetail-page">
      {/*  Mantenemos IonHeader pero ponemos el título bonito dentro del contenido */}
      <IonHeader className="app-header">
        <IonToolbar>
          <IonTitle>Libro</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="app-content">
        <div className="bookdetail-container">
          {/* HEADER */}
          <div className="bookdetail-header">
            <div className="bookdetail-title">{book.title}</div>
          </div>

          {/* CONTENT */}
          <div className="bookdetail-content">
            <div className="bookdetail-layout">
              <div className="bookdetail-coverWrap">
                {book.thumbnail ? (
                  <img
                    src={book.thumbnail}
                    alt={book.title}
                    className="bookdetail-cover"
                  />
                ) : (
                  <div className="bookdetail-coverFallback">
                    <div className="bookdetail-coverInitial">
                      {(book.title || "Libro").slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="bookdetail-details">
                <div className="bookdetail-section">
                  <div className="bookdetail-sectionTitle">Detalles</div>

                  <div className="bookdetail-detailItem">
                    <span className="bookdetail-label">Autor:</span>
                    <span className="bookdetail-value">{authorText}</span>
                  </div>

                  <div className="bookdetail-detailItem">
                    <span className="bookdetail-label">Páginas:</span>
                    <span className="bookdetail-value">{pagesText}</span>
                  </div>

                  <div className="bookdetail-detailItem">
                    <span className="bookdetail-label">Tiempo estimado:</span>
                    <span className="bookdetail-value">{hoursText}</span>
                  </div>

                  <div className="bookdetail-detailItem">
                    <span className="bookdetail-label">Días (según tu meta):</span>
                    <span className="bookdetail-value">{daysText}</span>
                  </div>
                </div>

                <div className="bookdetail-section">
                  <div className="bookdetail-sectionTitle">Géneros</div>

                  {hasCats && (
                    <div className="bookdetail-genresHeader">
                      <div className="bookdetail-genresCount">
                        Mostrando{" "}
                        {Math.min(showAllTags ? cats.length : TAGS_COLLAPSED_COUNT, cats.length)}{" "}
                        de {cats.length}
                      </div>

                      {canToggleTags && (
                        <IonButton
                          fill="clear"
                          className="app-muted-button"
                          style={{ height: 32, margin: 0 }}
                          onClick={() => setShowAllTags((v) => !v)}
                        >
                          {showAllTags ? "Ver menos" : "Ver más"}
                        </IonButton>
                      )}
                    </div>
                  )}

                  <div className="bookdetail-genres">
                    {shownCats.map((c) => (
                      <span key={c} className="bookdetail-genreTag">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="bookdetail-actions">
              <button
                className="btn btn-primary btn-icon btn-start"
                onClick={onStart}
                disabled={busy}
              >
                Empezar a leer
              </button>

              <button
                className="btn btn-secondary btn-icon btn-add"
                onClick={onAddToRead}
                disabled={busy}
              >
                Añadir a Por leer
              </button>

              <button
                className="btn btn-success btn-icon btn-complete"
                onClick={onFinish}
                disabled={busy}
              >
                Marcar como terminado
              </button>

              <button
                className="btn btn-today btn-icon btn-today"
                onClick={onMarkRead}
                disabled={busy}
              >
                Marcar “Leí hoy” ✓
              </button>
            </div>
          </div>

          {msg && <div className="bookdetail-msg">{msg}</div>}
        </div>
      </IonContent>
    </IonPage>
  );
}
