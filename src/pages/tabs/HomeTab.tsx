// HomeTab.tsx
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useState } from "react";
import { useHistory } from "react-router";
import { useIonViewWillEnter } from "@ionic/react";

import StreakBadge from "../../components/StreakBadge";
import BookCard from "../../components/BookCard";

import { getStreak, markReadToday } from "../../services/streak";
import { getRecommendedBooksForUser } from "../../services/books";
import { getJSON, setJSON } from "../../services/storage";
import type { Book } from "../../models/Book";
import type { UserPrefs } from "../../models/UserPrefs";

const PREFS_KEY = "user_prefs_v1";

// Cache y límite de refresh para Home
const HOME_RECS_DATE_KEY = "home_recs_date_v1";
const HOME_RECS_CACHE_KEY = "home_recs_cache_v1";
const HOME_RECS_REFRESH_COUNT_KEY = "home_recs_refresh_count_v1";
const HOME_RECS_PREFS_SIG_KEY = "home_recs_prefs_sig_v1";

const HOME_RECS_MAX_REFRESH_PER_DAY = 3;

function todayKey() {
  // YYYY-MM-DD
  return new Date().toISOString().slice(0, 10);
}

function prefsSignature(prefs: UserPrefs | null) {
  if (!prefs) return "NO_PREFS";
  const genres = Array.isArray(prefs.genres) ? [...prefs.genres].sort() : [];
  return [
    prefs.onboarded ? "1" : "0",
    prefs.level ?? "",
    String(prefs.dailyMinutesGoal ?? ""),
    genres.join("|"),
  ].join("::");
}

export default function HomeTab() {
  const [streak, setStreak] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recMsg, setRecMsg] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  const history = useHistory();

  const loadStreak = async () => {
    const s = await getStreak();
    setStreak(s.streakCount);
  };

  const fetchAndCacheRecs = async (prefs: UserPrefs | null, sig: string) => {
    const rec = await getRecommendedBooksForUser(prefs, { maxResults: 6 });
    setBooks(rec);
    await setJSON(HOME_RECS_CACHE_KEY, rec);
    await setJSON(HOME_RECS_PREFS_SIG_KEY, sig);

    if (!rec || rec.length === 0) {
      setRecMsg(
        "No se pudieron cargar recomendaciones. Revisa la consola (Network) para ver el error de OpenLibrary."
      );
    }
  };

  // Carga recomendaciones: usa cache del día, PERO resetea si cambian las prefs
  const loadRecsFromCacheOrFetch = async () => {
    setLoadingRecs(true);
    setRecMsg("");

    try {
      const t = todayKey();

      const prefs = await getJSON<UserPrefs | null>(PREFS_KEY, null);
      const sig = prefsSignature(prefs);

      const cachedDate = await getJSON<string | null>(HOME_RECS_DATE_KEY, null);
      const cachedBooks = await getJSON<Book[] | null>(HOME_RECS_CACHE_KEY, null);
      const cachedRefreshCount = await getJSON<number>(HOME_RECS_REFRESH_COUNT_KEY, 0);
      const cachedSig = await getJSON<string | null>(HOME_RECS_PREFS_SIG_KEY, null);

      // 1) Nuevo día => reset contador + generar nuevas recomendaciones
      if (cachedDate !== t) {
        await setJSON(HOME_RECS_DATE_KEY, t);
        await setJSON(HOME_RECS_REFRESH_COUNT_KEY, 0);
        setRefreshCount(0);

        await fetchAndCacheRecs(prefs, sig);
        return;
      }

      // 2) Mismo día, pero cambiaron las preferencias => reset cache + contador + regenerar
      if (cachedSig !== sig) {
        await setJSON(HOME_RECS_REFRESH_COUNT_KEY, 0);
        setRefreshCount(0);

        await fetchAndCacheRecs(prefs, sig);
        return;
      }

      // 3) Mismo día y mismas prefs: usar cache si existe
      setRefreshCount(typeof cachedRefreshCount === "number" ? cachedRefreshCount : 0);

      if (Array.isArray(cachedBooks) && cachedBooks.length > 0) {
        setBooks(cachedBooks);
        return;
      }

      // 4) Si no hay cache, fetchear y guardarlo
      await fetchAndCacheRecs(prefs, sig);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Botón “Actualizar” con máximo 3 por día (por prefs actuales)
  const refreshRecs = async () => {
    if (loadingRecs) return;

    setLoadingRecs(true);
    setRecMsg("");

    try {
      const t = todayKey();

      const prefs = await getJSON<UserPrefs | null>(PREFS_KEY, null);
      const sig = prefsSignature(prefs);

      const cachedDate = await getJSON<string | null>(HOME_RECS_DATE_KEY, null);
      const cachedSig = await getJSON<string | null>(HOME_RECS_PREFS_SIG_KEY, null);

      // Si cambió el día o cambiaron prefs, primero “normalizamos” (resetea y genera)
      if (cachedDate !== t || cachedSig !== sig) {
        await setJSON(HOME_RECS_DATE_KEY, t);
        await setJSON(HOME_RECS_REFRESH_COUNT_KEY, 0);
        setRefreshCount(0);

        await fetchAndCacheRecs(prefs, sig);
        return;
      }

      const count = await getJSON<number>(HOME_RECS_REFRESH_COUNT_KEY, 0);
      if (count >= HOME_RECS_MAX_REFRESH_PER_DAY) return;

      const rec = await getRecommendedBooksForUser(prefs, { maxResults: 6 });

      setBooks(rec);
      await setJSON(HOME_RECS_CACHE_KEY, rec);

      const next = count + 1;
      await setJSON(HOME_RECS_REFRESH_COUNT_KEY, next);
      setRefreshCount(next);

      if (!rec || rec.length === 0) {
        setRecMsg(
          "No se pudieron cargar recomendaciones. Revisa la consola (Network) para ver el error de OpenLibrary."
        );
      }
    } finally {
      setLoadingRecs(false);
    }
  };

  const load = async () => {
    await loadStreak();
    await loadRecsFromCacheOrFetch();
  };

  useIonViewWillEnter(() => {
    load();
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

  const refreshDisabled =
    loadingRecs || refreshCount >= HOME_RECS_MAX_REFRESH_PER_DAY;

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

          <div className="app-section">
            <div
              className="app-section-title"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <span>Recomendado para hoy</span>

              <IonButton
                size="small"
                className="app-secondary-button"
                onClick={refreshRecs}
                disabled={refreshDisabled}
              >
                Actualizar ({refreshCount}/{HOME_RECS_MAX_REFRESH_PER_DAY})
              </IonButton>
            </div>

            {loadingRecs && (
              <div className="app-subtitle" style={{ fontWeight: 800 }}>
                Cargando recomendaciones...
              </div>
            )}

            {!loadingRecs && recMsg && (
              <div className="app-card" style={{ padding: 16 }}>
                <div
                  className="app-subtitle"
                  style={{ margin: 0, fontWeight: 800 }}
                >
                  {recMsg}
                </div>

                <IonButton
                  expand="block"
                  className="app-secondary-button"
                  style={{ marginTop: 12 }}
                  onClick={loadRecsFromCacheOrFetch}
                >
                  Reintentar carga
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

            {!loadingRecs &&
              !recMsg &&
              refreshCount >= HOME_RECS_MAX_REFRESH_PER_DAY && (
                <div className="app-subtitle" style={{ marginTop: 10 }}>
                  Llegaste al máximo de actualizaciones por hoy. Vuelve mañana
                  para más.
                </div>
              )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
