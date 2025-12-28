import { IonItem, IonLabel, IonNote, IonThumbnail } from "@ionic/react";
import type { Book } from "../models/Book"; 
import { estimateHours } from "../services/books"; 

export default function BookCard({ book, onClick }: { book: Book; onClick: () => void }) {
  const hours = estimateHours(book.pageCount);

  return (
    <IonItem button onClick={onClick}>
      <IonThumbnail slot="start">
        {book.thumbnail ? (
          <img
            src={book.thumbnail}
            alt={book.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "#ddd" }} />
        )}
      </IonThumbnail>

      <IonLabel>
        <h2>{book.title}</h2>
        <p>{book.authors?.join(", ") ?? "Autor desconocido"}</p>
      </IonLabel>

      <IonNote slot="end">{hours ? `${hours}h` : "--"}</IonNote>
    </IonItem>
  );
}