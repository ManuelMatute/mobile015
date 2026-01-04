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
import { getJSON } from "../../services/storage";
import type { Book } from "../../models/Book";
import type { UserPrefs } from "../../models/UserPrefs";

const PREFS_KEY = "user_prefs_v1";

export default function HomeTab() {
  const [streak, setStreak] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingRead, setLoadingRead] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recMsg, setRecMsg] = useState("");
  const history = useHistory();

  const load = async () => {
    setLoadingRecs(true);
    setRecMsg("");
    try {
      const s = await getStreak();
      setStreak(s.streakCount);

      const prefs = await getJSON<UserPrefs | null>(PREFS_KEY, null);
      const rec = await getRecommendedBooksForUser(prefs, { maxResults: 6 });
      setBooks(rec);

      if (!rec || rec.length === 0) {
        setRecMsg(
          "No se pudieron cargar recomendaciones. Revisa la consola (Network) para ver el error de OpenLibrary."
        );
      }
    } finally {
      setLoadingRecs(false);
    }
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

  const openBook = (b: Book) => {
    // ✅ Pasamos el book completo al detalle para que NO cambie la info al entrar
    history.push(`/book/${b.id}`, { book: b });
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

          <div className="app-section">
            <div className="app-section-title">Recomendado para hoy</div>

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
                  onClick={load}
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
                    onClick={() => openBook(b)}
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
