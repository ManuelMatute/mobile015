import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useMemo, useState } from "react";
import { useHistory } from "react-router";
import { useIonViewWillEnter } from "@ionic/react";

import StreakBadge from "../../components/StreakBadge";
import BookCard from "../../components/BookCard";

import { getStreak, markReadToday } from "../../services/streak";
import { getRecommendedBooksForUser } from "../../services/books";
import { getJSON, setJSON } from "../../services/storage";
import type { Book } from "../../models/Book";
import type { UserPrefs } from "../../models/UserPrefs";

// ✅ CAMBIO: usamos progreso por páginas
import { getReadingNow, getProgressPages, ensureProgressPagesFromLegacy } from "../../services/library";

const PREFS_KEY = "user_prefs_v1";

// ✅ control de actualizaciones por día
const REC_REFRESH_KEY = "home_rec_refresh_v1";
const MAX_REFRESHES_PER_DAY = 3;

type RefreshState = {
  date: string; 
  used: number; 
  prefsSig: string; 
};

// cache de recomendaciones
const RECS_CACHE_KEY = "home_recs_cache_v1";
type RecsCache = {
  date: string; 
  prefsSig: string;
  books: Book[];
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function prefsSignature(prefs: UserPrefs | null) {
  const level = prefs?.level ?? "NEW";
  const dailyMinutesGoal = prefs?.dailyMinutesGoal ?? 10;
  const genres = Array.isArray(prefs?.genres)
    ? [...prefs.genres].map((g) => String(g)).sort()
    : [];
  return JSON.stringify({ level, dailyMinutesGoal, genres });
}

function pageCountOf(b?: Book | null) {
  const p = b?.pageCount;
  return typeof p === "number" && p > 0 ? p : 0;
}

export default function HomeTab() {
  const [streak, setStreak] = useState(0);

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recMsg, setRecMsg] = useState("");

  const [readingNow, setReadingNow] = useState<Book[]>([]);
  
  const [pagesMap, setPagesMap] = useState<Record<string, number>>({});

  const [refreshUsed, setRefreshUsed] = useState(0);

  const history = useHistory();

  const saveRecsCache = async (prefs: UserPrefs | null, recs: Book[]) => {
    const cache: RecsCache = {
      date: todayKey(),
      prefsSig: prefsSignature(prefs),
      books: recs,
    };
    await setJSON(RECS_CACHE_KEY, cache);
  };

  const ensureRefreshCounter = async (prefs: UserPrefs | null) => {
    const t = todayKey();
    const sig = prefsSignature(prefs);

    const st = await getJSON<RefreshState | null>(REC_REFRESH_KEY, null);

  
    if (!st || st.date !== t || st.prefsSig !== sig) {
      const next: RefreshState = { date: t, used: 0, prefsSig: sig };
      await setJSON(REC_REFRESH_KEY, next);
      setRefreshUsed(0);

      if (!st || st.prefsSig !== sig) {
        await setJSON(RECS_CACHE_KEY, null);
      }
      return;
    }

    setRefreshUsed(Math.max(0, Math.min(MAX_REFRESHES_PER_DAY, st.used)));
  };

  const loadHeaderStuff = async () => {
    const s = await getStreak();
    setStreak(s.streakCount);

    const nowList = await getReadingNow();

    await ensureProgressPagesFromLegacy(nowList);

    const pMap = await getProgressPages();

    setReadingNow(nowList);
    setPagesMap(pMap ?? {});
  };

  const loadRecsFromCacheOrFetch = async () => {
    setLoadingRecs(true);
    setRecMsg("");
    try {
      const prefs = await getJSON<UserPrefs | null>(PREFS_KEY, null);
      const sig = prefsSignature(prefs);

      await ensureRefreshCounter(prefs);


      const cache = await getJSON<RecsCache | null>(RECS_CACHE_KEY, null);
      if (
        cache &&
        cache.prefsSig === sig &&
        Array.isArray(cache.books) &&
        cache.books.length > 0
      ) {
        setBooks(cache.books);
        return;
      }

      const rec = await getRecommendedBooksForUser(prefs, { maxResults: 6 });
      setBooks(rec);

      if (rec && rec.length > 0) {
        await saveRecsCache(prefs, rec);
      } else {
        setRecMsg(
          "No se pudieron cargar recomendaciones. Revisa la consola (Network) para ver el error de OpenLibrary."
        );
      }
    } finally {
      setLoadingRecs(false);
    }
  };

  useIonViewWillEnter(() => {
    loadHeaderStuff();
    loadRecsFromCacheOrFetch();
  });

  const onReadToday = async () => {
    if (loadingRead) return;
    setLoadingRead(true);
    try {
      const s = await markReadToday();
      setStreak(s.streakCount);
    } finally {
      setLoadingRead(false);
    }
  };

  const openExplore = () => history.push("/tabs/explore");
  const openLibrary = () => history.push("/tabs/library");

  const completedCount = useMemo(() => {
    return readingNow.filter((b) => {
      const total = pageCountOf(b);
      if (total <= 0) return false;
      const read = Math.max(0, pagesMap[b.id] ?? 0);
      return read >= total;
    }).length;
  }, [readingNow, pagesMap]);

  const MAX_WIDGET_BOOKS = 2;
  const widgetBooks = useMemo(() => readingNow.slice(0, MAX_WIDGET_BOOKS), [readingNow]);
  const hasMoreThanWidget = readingNow.length > MAX_WIDGET_BOOKS;

  const canRefresh = refreshUsed < MAX_REFRESHES_PER_DAY;

  const onRefreshRecs = async () => {
    if (!canRefresh || loadingRecs) return;

    setLoadingRecs(true);
    setRecMsg("");

    try {
      const prefs = await getJSON<UserPrefs | null>(PREFS_KEY, null);
      const sig = prefsSignature(prefs);
      const t = todayKey();

      const nextUsed = Math.min(MAX_REFRESHES_PER_DAY, refreshUsed + 1);
      setRefreshUsed(nextUsed);
      await setJSON(REC_REFRESH_KEY, { date: t, used: nextUsed, prefsSig: sig });

      await setJSON(RECS_CACHE_KEY, null);

      const rec = await getRecommendedBooksForUser(prefs, { maxResults: 6 });
      setBooks(rec);

      if (rec && rec.length > 0) {
        await saveRecsCache(prefs, rec);
      } else {
        setRecMsg(
          "No se pudieron cargar recomendaciones. Revisa la consola (Network) para ver el error de OpenLibrary."
        );
      }
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <IonPage className="app-page">
      <IonHeader className="app-header">
        <IonToolbar>
          <IonTitle>Inicio</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="app-content">
        <div className="app-container">
          <div className="app-section">
            <StreakBadge count={streak} />
          </div>

          <div className="app-section">
            <IonButton
              expand="block"
              className="app-primary-button"
              onClick={onReadToday}
              disabled={loadingRead}
            >
              Leí hoy ✅
            </IonButton>
          </div>

          <div className="app-divider" />

          {/*  WIDGET ¿Leíste hoy? */}
          <div className="app-section">
            <div className="app-card" style={{ padding: 16 }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontWeight: 900,
                    color: "var(--text-primary)",
                    fontSize: 18,
                    marginBottom: 6,
                  }}
                >
                  ¿Leíste hoy?
                </div>

                {readingNow.length > 0 && (
                  <div
                    style={{
                      color: "var(--text-secondary)",
                      fontWeight: 800,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {completedCount} de {readingNow.length} completados
                  </div>
                )}

                {readingNow.length === 0 ? (
                  <>
                    <div className="app-subtitle" style={{ margin: 0, fontWeight: 700 }}>
                      No tienes libros en tu lista de lectura actual
                    </div>

                    <IonButton
                      className="app-primary-button"
                      style={{ marginTop: 12 }}
                      onClick={openExplore}
                    >
                      + Explorar Libros
                    </IonButton>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
                      {widgetBooks.map((b) => {
                        const total = pageCountOf(b);
                        const read = Math.max(0, pagesMap[b.id] ?? 0);

                        const pct =
                          total > 0
                            ? Math.max(0, Math.min(100, Math.round((read / total) * 100)))
                            : 0;

                        const progressLabel =
                          total > 0 ? `Página ${Math.min(read, total)} de ${total}` : `Páginas leídas: ${read}`;

                        return (
                          <div
                            key={b.id}
                            onClick={() => history.push(`/book/${b.id}`, { book: b })}
                            style={{
                              background: "white",
                              borderRadius: 14,
                              padding: 12,
                              border: "1px solid rgba(0,0,0,0.06)",
                              cursor: "pointer",
                            }}
                          >
                            <div style={{ display: "flex", gap: 12 }}>
                              <div
                                style={{
                                  width: 56,
                                  height: 72,
                                  borderRadius: 10,
                                  overflow: "hidden",
                                  background: "rgba(255, 107, 53, 0.10)",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {b.thumbnail ? (
                                  <img
                                    src={b.thumbnail}
                                    alt={b.title}
                                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                  />
                                ) : (
                                  <div style={{ fontWeight: 900, color: "var(--orange-dark)", fontSize: 20 }}>
                                    {(b.title || "Libro").slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 900,
                                    color: "var(--text-primary)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {b.title}
                                </div>
                                <div
                                  style={{
                                    color: "var(--text-secondary)",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    marginTop: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {b.authors?.join(", ") ?? "Autor desconocido"}
                                </div>

                                <div style={{ marginTop: 10 }}>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "space-between",
                                      fontSize: 12,
                                      fontWeight: 800,
                                      color: "var(--text-secondary)",
                                      marginBottom: 6,
                                    }}
                                  >
                                    <span>{progressLabel}</span>
                                    <span>{total > 0 ? `${pct}%` : ""}</span>
                                  </div>

                                  <div
                                    style={{
                                      width: "100%",
                                      height: 8,
                                      borderRadius: 999,
                                      background: "rgba(0,0,0,0.08)",
                                      overflow: "hidden",
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${pct}%`,
                                        height: "100%",
                                        borderRadius: 999,
                                        background: "var(--orange)",
                                        transition: "width 200ms ease",
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasMoreThanWidget ? (
                      <IonButton
                        fill="clear"
                        className="app-muted-button"
                        style={{ marginTop: 10 }}
                        onClick={openLibrary}
                      >
                        Ver más ({readingNow.length - MAX_WIDGET_BOOKS})
                      </IonButton>
                    ) : (
                      <IonButton
                        fill="clear"
                        className="app-muted-button"
                        style={{ marginTop: 10 }}
                        onClick={openLibrary}
                      >
                        Ver mi lectura
                      </IonButton>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Recomendaciones + botón Actualizar */}
          <div className="app-section">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div className="app-section-title">Recomendado para hoy</div>

              <IonButton
                size="small"
                className="app-secondary-button"
                onClick={onRefreshRecs}
                disabled={!canRefresh || loadingRecs}
                style={{ height: 34, margin: 0 }}
              >
                Actualizar ({Math.min(MAX_REFRESHES_PER_DAY, refreshUsed)}/{MAX_REFRESHES_PER_DAY})
              </IonButton>
            </div>

            {!canRefresh && (
              <div className="app-subtitle" style={{ marginTop: 8, fontWeight: 700 }}>
                Llegaste al máximo de actualizaciones por hoy. Vuelve mañana para más.
              </div>
            )}

            {loadingRecs && (
              <div className="app-subtitle" style={{ fontWeight: 800 }}>
                Cargando recomendaciones...
              </div>
            )}

            {!loadingRecs && recMsg && (
              <div className="app-card" style={{ padding: 16 }}>
                <div className="app-subtitle" style={{ margin: 0, fontWeight: 800 }}>
                  {recMsg}
                </div>
                <IonButton
                  expand="block"
                  className="app-secondary-button"
                  style={{ marginTop: 12 }}
                  onClick={loadRecsFromCacheOrFetch}
                >
                  Recargar
                </IonButton>
              </div>
            )}

            {!loadingRecs && !recMsg && (
              <div className="app-list">
                {books.slice(0, 6).map((b) => (
                  <BookCard
                    key={b.id}
                    book={b}
                    onClick={() => history.push(`/book/${b.id}`, { book: b })}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
