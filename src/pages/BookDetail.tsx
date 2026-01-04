import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router";
import type { Book } from "../models/Book";
import type { UserPrefs } from "../models/UserPrefs";
import { estimateHours, getBookById } from "../services/books";
import { markReadToday } from "../services/streak";
import { getJSON } from "../services/storage";
import { addToRead, markFinished, startReading } from "../services/library";

const PREFS_KEY = "user_prefs_v1";

// B) Tags “Ver más”
const TAGS_COLLAPSED_COUNT = 10;
const TAGS_MAX_IN_DETAIL = 80;

type LocationState = { book?: Book };

function uniqStrings(list: (string | undefined | null)[]) {
  const clean = list.map((x) => String(x ?? "").trim()).filter(Boolean);
  return Array.from(new Set(clean));
}

function mergeBooks(base: Book, incoming: Book): Book {
  // Regla: mantener lo que ya venía del Home/Explore si existe,
  // y “rellenar” con Work API si hace falta.
  const mergedCategories = uniqStrings([...(base.categories ?? []), ...(incoming.categories ?? [])]).slice(
    0,
    TAGS_MAX_IN_DETAIL
  );

  return {
    ...incoming, // trae lo “nuevo”
    ...base,     // pero base manda en lo que ya tenía (para consistencia visual)
    // Campos que sí conviene mergear:
    authors: (base.authors && base.authors.length > 0) ? base.authors : incoming.authors,
    description: base.description ?? incoming.description,
    pageCount: typeof base.pageCount === "number" ? base.pageCount : incoming.pageCount,
    language: base.language ?? incoming.language,
    thumbnail: base.thumbnail ?? incoming.thumbnail,
    categories: mergedCategories.length > 0 ? mergedCategories : (base.categories ?? incoming.categories),
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

  // ✅ 1) book inicial viene del Home/Explore (si existe)
  const initialBook = location.state?.book ?? null;

  const [book, setBook] = useState<Book | null>(initialBook);
  const [prefs, setPrefs] = useState<UserPrefs | null>(null);

  // ✅ Si ya tenemos initialBook, NO nos quedamos pegados en "Cargando..."
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

      // Si no vino book por state, sí mostramos loading fuerte
      if (!initialBook) setLoading(true);

      try {
        const [bWork, p] = await Promise.all([
          getBookById(id), // Work API (enriquece)
          getJSON<UserPrefs | null>(PREFS_KEY, null),
        ]);

        if (!mounted) return;

        setPrefs(p);

        if (!bWork) {
          // Si no hay Work, nos quedamos con initialBook si existía.
          if (!initialBook) {
            setBook(null);
            setError("No se pudo cargar este libro (OpenLibrary no devolvió datos para este ID).");
          }
          return;
        }

        // ✅ 2) Si ya había book (Home/Explore), mezclamos.
        if (initialBook) {
          setBook(mergeBooks(initialBook, bWork));
        } else {
          setBook(bWork);
        }
      } catch (e) {
        if (!mounted) return;
        // Si no había initialBook, mostramos error. Si sí había, lo dejamos usable.
        if (!initialBook) {
          setBook(null);
          setError("Ocurrió un error cargando el libro. Revisa la consola (Network) para ver el detalle.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
    // importante: initialBook no en deps para no re-ejecutar por objeto
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const cats = useMemo(() => normalizeCategories(book?.categories), [book?.categories]);
  const hasCats = cats.length > 0;

  const pagesPerHour = useMemo(() => pagesPerHourFromPrefs(prefs), [prefs]);
  const hours = useMemo(() => estimateHours(book?.pageCount, pagesPerHour), [book?.pageCount, pagesPerHour]);

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
    <IonPage className="app-page">
      <IonHeader className="app-header">
        <IonToolbar>
          <IonTitle>{book.title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="app-content">
        <div className="app-container">
          {book.thumbnail && (
            <img
              src={book.thumbnail}
              alt={book.title}
              style={{
                width: "100%",
                maxWidth: 340,
                borderRadius: 16,
                marginBottom: 14,
                boxShadow: "var(--app-shadow-soft)",
              }}
            />
          )}

          <div className="app-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 800, marginBottom: 10 }}>
              Detalles
            </div>

            <p style={{ margin: "8px 0" }}>
              <b>Autor:</b> {authorText}
            </p>

            <p style={{ margin: "8px 0" }}>
              <b>Páginas:</b> {pagesText}
            </p>

            <p style={{ margin: "8px 0" }}>
              <b>Tiempo estimado:</b> {hoursText}
            </p>

            <p style={{ margin: "8px 0" }}>
              <b>Días (según tu meta):</b> {daysText}
            </p>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>
                Géneros
              </div>

              {hasCats && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ color: "var(--text-secondary)", fontWeight: 800, fontSize: 12 }}>
                    Mostrando {Math.min(showAllTags ? cats.length : TAGS_COLLAPSED_COUNT, cats.length)} de {cats.length}
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

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {shownCats.map((c) => (
                  <span
                    key={c}
                    style={{
                      background: "var(--orange-lighter)",
                      color: "var(--orange-dark)",
                      border: "1px solid rgba(255, 107, 53, 0.25)",
                      padding: "4px 10px",
                      borderRadius: 999,
                      fontSize: "0.78rem",
                      fontWeight: 700,
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <IonButton expand="block" className="app-secondary-button" onClick={onStart} disabled={busy}>
              Empezar a leer
            </IonButton>

            <IonButton
              expand="block"
              className="app-secondary-button"
              onClick={onAddToRead}
              disabled={busy}
              style={{ marginTop: 10 }}
            >
              Añadir a Por leer
            </IonButton>

            <IonButton
              expand="block"
              className="app-secondary-button"
              onClick={onFinish}
              disabled={busy}
              style={{ marginTop: 10 }}
            >
              Marcar como terminado
            </IonButton>

            <IonButton
              expand="block"
              className="app-primary-button"
              onClick={onMarkRead}
              disabled={busy}
              style={{ marginTop: 10 }}
            >
              Marcar “Leí hoy” ✅
            </IonButton>

            {msg && (
              <div style={{ marginTop: 12, color: "var(--text-secondary)", fontWeight: 800 }}>
                {msg}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
