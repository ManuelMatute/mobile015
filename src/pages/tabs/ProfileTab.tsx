import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from "@ionic/react";
import { useState } from "react";
import { removeKey } from "../../services/storage";
import { resetStreak } from "../../services/streak";

export default function ProfileTab() {
  const [msg, setMsg] = useState("");

  const redoOnboarding = async () => {
    await removeKey("user_prefs_v1");
    setMsg("Onboarding reiniciado. Recarga la app (o vuelve a /onboarding).");
  };

  const reset = async () => {
    await resetStreak();
    setMsg("Racha reseteada ✅");
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Perfil</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonButton expand="block" color="medium" onClick={reset}>
          Resetear racha
        </IonButton>

        <IonButton expand="block" color="danger" onClick={redoOnboarding} style={{ marginTop: 10 }}>
          Rehacer onboarding
        </IonButton>

        {msg && <p style={{ marginTop: 16 }}>{msg}</p>}
      </IonContent>
    </IonPage>
  );
}
