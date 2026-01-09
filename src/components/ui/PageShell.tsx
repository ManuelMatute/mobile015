import React from "react";
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";

type Props = {
  title: string;
  children: React.ReactNode;
  wide?: boolean;
};

export default function PageShell({ title, children, wide }: Props) {
  return (
    <IonPage className="app-page">
      <IonHeader className="app-header">
        <IonToolbar>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="app-content">
        <div className={wide ? "app-container app-container-wide" : "app-container"}>{children}</div>
      </IonContent>
    </IonPage>
  );
}
