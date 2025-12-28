import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel } from "@ionic/react";

export default function LibraryTab() {
  // Skeleton: luego conectamos a storage (leyendo/por leer/terminados)
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Mi lectura</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h3>Leyendo</h3>
        <IonList>
          <IonItem>
            <IonLabel>
              <h2>(Placeholder) Tu libro actual</h2>
              <p>Progreso: 0%</p>
            </IonLabel>
          </IonItem>
        </IonList>

        <h3 style={{ marginTop: 16 }}>Por leer</h3>
        <IonList>
          <IonItem>
            <IonLabel>(Placeholder) Lista por leer</IonLabel>
          </IonItem>
        </IonList>

        <h3 style={{ marginTop: 16 }}>Terminados</h3>
        <IonList>
          <IonItem>
            <IonLabel>(Placeholder) Lista terminados</IonLabel>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
}
