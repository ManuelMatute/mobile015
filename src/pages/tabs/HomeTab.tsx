import { IonButton, IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { useEffect, useState } from "react";
import { useHistory } from "react-router";

import StreakBadge from "../../components/StreakBadge";
import BookCard from "../../components/BookCard";

import { getStreak, markReadToday } from "../../services/streak";
import { getRecommendedBooks } from "../../services/books";
import type { Book } from "../../models/Book";

export default function HomeTab() {
  const [streak, setStreak] = useState(0);
  const [books, setBooks] = useState<Book[]>([]);
  const history = useHistory();

  useEffect(() => {
    (async () => {
      const s = await getStreak();
      setStreak(s.streakCount);

      // Recomendaciones reales (Google Books)
      const rec = await getRecommendedBooks({ maxResults: 6 });
      setBooks(rec);
    })();
  }, []);

  const onReadToday = async () => {
    const s = await markReadToday();
    setStreak(s.streakCount);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Inicio</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <StreakBadge count={streak} />

        <IonButton expand="block" onClick={onReadToday} style={{ marginTop: 10 }}>
          Leí hoy ✅
        </IonButton>

        <h3 style={{ marginTop: 18 }}>Recomendado para hoy</h3>

        <IonList>
          {books.slice(0, 6).map((b) => (
            <BookCard key={b.id} book={b} onClick={() => history.push(`/book/${b.id}`)} />
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
