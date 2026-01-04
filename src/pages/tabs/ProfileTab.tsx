import { IonButton } from "@ionic/react";
import { useState } from "react";
import PageShell from "../../components/ui/PageShell";
import { removeKey } from "../../services/storage";
import { resetStreak } from "../../services/streak";

export default function ProfileTab() {
  const [msg, setMsg] = useState("");

  const redoOnboarding = async () => {
    await removeKey("user_prefs_v1");
    setMsg("Onboarding reiniciado. Recarga la app o entra a /onboarding.");
  };

  const reset = async () => {
    await resetStreak();
    setMsg("Racha reseteada ✅");
  };

  return (
    <PageShell title="Perfil">
      <div className="app-section">
        <div className="app-card" style={{ padding: 16 }}>
          <p className="app-subtitle" style={{ marginBottom: 12 }}>
            Ajustes rápidos
          </p>

          <IonButton expand="block" className="app-secondary-button" onClick={reset}>
            Resetear racha
          </IonButton>

          <div style={{ height: 10 }} />

          <IonButton expand="block" className="app-primary-button" onClick={redoOnboarding}>
            Rehacer onboarding
          </IonButton>

          {msg && (
            <p className="app-subtitle" style={{ marginTop: 14 }}>
              {msg}
            </p>
          )}
        </div>
      </div>
    </PageShell>
  );
}
