import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonChip,
  IonItem,
  IonList,
  IonRadioGroup,
  IonRadio,
} from "@ionic/react";
import { useState } from "react";
import type { UserPrefs, ReadingLevel } from "../models/UserPrefs";
import { setJSON } from "../services/storage";

const GENRES = [
  "Romance",
  "Misterio",
  "Fantasía",
  "Ciencia ficción",
  "No ficción",
  "Filosofía",
  "Thriller",
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [level, setLevel] = useState<ReadingLevel>("NEW");
  const [genres, setGenres] = useState<string[]>(["Misterio"]);
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState<5 | 10 | 20>(10);
  const [languageMode, setLanguageMode] = useState<"ES" | "BILINGUAL">("ES");

  const toggleGenre = (g: string) => {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  const save = async () => {
    const prefs: UserPrefs = { onboarded: true, level, genres, dailyMinutesGoal, languageMode };
    await setJSON("user_prefs_v1", prefs);
    onDone();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Bienvenido</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <h2>1) Tu nivel</h2>
        <IonSegment value={level} onIonChange={(e) => setLevel(e.detail.value as ReadingLevel)}>
          <IonSegmentButton value="NEW">
            <IonLabel>Nuevo</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="EXPERIENCED">
            <IonLabel>Experto</IonLabel>
          </IonSegmentButton>
        </IonSegment>

        <h2 style={{ marginTop: 16 }}>2) Gustos</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {GENRES.map((g) => (
            <IonChip key={g} outline={!genres.includes(g)} onClick={() => toggleGenre(g)}>
              <IonLabel>{g}</IonLabel>
            </IonChip>
          ))}
        </div>

        <h2 style={{ marginTop: 16 }}>3) Meta diaria</h2>
        <IonList>
          <IonRadioGroup value={dailyMinutesGoal} onIonChange={(e) => setDailyMinutesGoal(e.detail.value)}>
            {[5, 10, 20].map((v) => (
              <IonItem key={v}>
                <IonLabel>{v} min/día</IonLabel>
                <IonRadio slot="end" value={v} />
              </IonItem>
            ))}
          </IonRadioGroup>
        </IonList>

        <h2 style={{ marginTop: 16 }}>4) Idioma</h2>
        <IonList>
          <IonRadioGroup value={languageMode} onIonChange={(e) => setLanguageMode(e.detail.value)}>
            <IonItem>
              <IonLabel>Solo español</IonLabel>
              <IonRadio slot="end" value="ES" />
            </IonItem>
            <IonItem>
              <IonLabel>Español e inglés</IonLabel>
              <IonRadio slot="end" value="BILINGUAL" />
            </IonItem>
          </IonRadioGroup>
        </IonList>

        <IonButton expand="block" onClick={save} style={{ marginTop: 24 }}>
          Empezar
        </IonButton>
      </IonContent>
    </IonPage>
  );
}
