import { IonContent, IonHeader, IonList, IonPage, IonTitle, IonToolbar, IonSearchbar } from "@ionic/react";
import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router";

import BookCard from "../../components/BookCard";
import { searchBooks } from "../../services/books";
import type { Book } from "../../models/Book";

export default function ExploreTab() {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const history = useHistory();
  const tRef = useRef<number | null>(null);

  useEffect(() => {
    
    setBooks([]);
  }, []);

  const onSearch = (value: string) => {
    setQ(value);

    if (tRef.current) window.clearTimeout(tRef.current);

    tRef.current = window.setTimeout(async () => {
      const res = await searchBooks(value, { maxResults: 20 });
      setBooks(res);
    }, 350);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Explorar</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent>
        <IonSearchbar
          value={q}
          onIonInput={(e) => onSearch(e.detail.value ?? "")}
          placeholder="Buscar libros o autores..."
        />

        <IonList>
          {books.map((b) => (
            <BookCard key={b.id} book={b} onClick={() => history.push(`/book/${b.id}`)} />
          ))}
        </IonList>
      </IonContent>
    </IonPage>
  );
}
