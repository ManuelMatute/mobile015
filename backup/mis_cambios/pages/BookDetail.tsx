import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import type { Book } from "../models/Book";
import { estimateHours, getBookById } from "../services/books";
import { markReadToday } from "../services/streak";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    (async () => {
      const b = await getBookById(id);
      setBook(b);
    })();
  }, [id]);

  if (!book) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Libro</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">Cargando...</IonContent>
      </IonPage>
    );
  }

  const hours = estimateHours(book.pageCount);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{book.title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        {book.thumbnail && (
          <img
            src={book.thumbnail}
            alt={book.title}
            style={{ width: "100%", maxWidth: 320, borderRadius: 12, marginBottom: 12 }}
          />
        )}

        <p>
          <b>Autor:</b> {book.authors?.join(", ") ?? "Desconocido"}
        </p>
        <p>
          <b>Páginas:</b> {book.pageCount ?? "--"}
        </p>
        <p>
          <b>Tiempo estimado:</b> {hours ? `${hours} horas` : "--"}
        </p>

        <IonButton expand="block" style={{ marginTop: 10 }}>
          Empezar a leer
        </IonButton>

        <IonButton expand="block" color="success" onClick={() => markReadToday()} style={{ marginTop: 10 }}>
          Marcar “Leí hoy” ✅
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
