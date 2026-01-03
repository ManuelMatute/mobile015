import React, { useState } from 'react';
import {
  IonButton,
  IonContent,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonChip,
  IonIcon,
  IonRadioGroup,
  IonRadio,
  IonList,
  IonItem,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonToggle,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import { 
  sparklesOutline, 
  trophyOutline, 
  heartOutline, 
  searchOutline,
  rocketOutline,
  documentTextOutline,
  bulbOutline,
  flashOutline,
  timeOutline,
  languageOutline,
  checkmarkCircleOutline,
  flameOutline
} from 'ionicons/icons';
import type { UserPrefs, ReadingLevel } from "../models/UserPrefs";
import { setJSON } from "../services/storage";
import './Onboarding.css';

const GENRES = [
  { name: "Romance", icon: heartOutline, color: "#e11d48" },
  { name: "Misterio", icon: searchOutline, color: "#0ea5e9" },
  { name: "Fantasía", icon: sparklesOutline, color: "#8b5cf6" },
  { name: "Ciencia ficción", icon: rocketOutline, color: "#3b82f6" },
  { name: "No ficción", icon: documentTextOutline, color: "#10b981" },
  { name: "Filosofía", icon: bulbOutline, color: "#f59e0b" },
  { name: "Thriller", icon: flashOutline, color: "#ef4444" },
];

type DailyMinutes = 5 | 10 | 20;

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [level, setLevel] = useState<ReadingLevel>("NEW");
  const [genres, setGenres] = useState<string[]>(["Misterio", "Romance"]);
  const [dailyMinutesGoal, setDailyMinutesGoal] = useState<DailyMinutes>(10);
  const [languageMode, setLanguageMode] = useState<"ES" | "BILINGUAL">("ES");
  const [enableStreak, setEnableStreak] = useState<boolean>(true);

  const toggleGenre = (g: string) => {
    setGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleGoalChange = (value: string | number | null) => {
    if (value === null) return;
    
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    
    if (numValue === 5 || numValue === 10 || numValue === 20) {
      setDailyMinutesGoal(numValue as DailyMinutes);
    }
  };

  const save = async () => {
    const prefs: UserPrefs = {
      onboarded: true,
      level,
      genres,
      dailyMinutesGoal,
      languageMode,
      streakEnabled: enableStreak,  // ← ESTA ES LA LÍNEA QUE CAUSA EL ERROR
      createdAt: new Date()
    };
    await setJSON("user_prefs_v1", prefs);
    onDone();
  };

  return (
    <IonPage>
      <IonContent className="onboarding-content">
        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">Personaliza tu experiencia</h1>
          <p className="subtitle">Configura tus preferencias</p>
        </div>

        {/* Racha */}
        <IonCard className="preference-card compact">
          <div className="card-header">
            <div className="step-indicator">🔥</div>
            <IonCardHeader>
              <IonCardTitle className="card-title">Sistema de Racha</IonCardTitle>
            </IonCardHeader>
          </div>
          <IonCardContent>
            <div className="streak-toggle-row">
              <div className="streak-info">
                <IonIcon icon={flameOutline} className="streak-icon-small" />
                <span>Activar seguimiento de días consecutivos</span>
              </div>
              <IonToggle 
                checked={enableStreak}
                onIonChange={(e) => setEnableStreak(e.detail.checked)}
                className="small-toggle"
              />
            </div>
          </IonCardContent>
        </IonCard>

        {/* Nivel */}
        <IonCard className="preference-card">
          <div className="card-header">
            <div className="step-indicator">1</div>
            <IonCardHeader>
              <IonCardTitle className="card-title">Tu nivel</IonCardTitle>
            </IonCardHeader>
          </div>
          <IonCardContent>
            <IonSegment
              value={level}
              onIonChange={(e) => setLevel(e.detail.value as ReadingLevel)}
              className="compact-segment"
            >
              <IonSegmentButton value="NEW">
                <div className="segment-content-compact">
                  <IonIcon icon={sparklesOutline} />
                  <IonLabel>Principiante</IonLabel>
                </div>
              </IonSegmentButton>
              <IonSegmentButton value="EXPERIENCED">
                <div className="segment-content-compact">
                  <IonIcon icon={trophyOutline} />
                  <IonLabel>Experto</IonLabel>
                </div>
              </IonSegmentButton>
            </IonSegment>
          </IonCardContent>
        </IonCard>

        {/* Géneros */}
        <IonCard className="preference-card">
          <div className="card-header">
            <div className="step-indicator">2</div>
            <IonCardHeader>
              <IonCardTitle className="card-title">Géneros favoritos</IonCardTitle>
            </IonCardHeader>
          </div>
          <IonCardContent>
            <div className="genres-grid">
              <IonGrid>
                <IonRow>
                  {GENRES.map((genre) => {
                    const isSelected = genres.includes(genre.name);
                    return (
                      <IonCol size="6" key={genre.name}>
                        <IonChip
                          className={`genre-chip-compact ${isSelected ? "selected" : ""}`}
                          onClick={() => toggleGenre(genre.name)}
                          style={{ '--genre-color': genre.color } as any}
                        >
                          <IonIcon icon={genre.icon} />
                          <IonLabel>{genre.name}</IonLabel>
                        </IonChip>
                      </IonCol>
                    );
                  })}
                </IonRow>
              </IonGrid>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Meta diaria */}
        <IonCard className="preference-card">
          <div className="card-header">
            <div className="step-indicator">3</div>
            <IonCardHeader>
              <IonCardTitle className="card-title">Meta diaria</IonCardTitle>
            </IonCardHeader>
          </div>
          <IonCardContent>
            <div className="goal-options-compact">
              {([5, 10, 20] as DailyMinutes[]).map((minutes) => (
                <div
                  key={minutes}
                  className={`goal-option-compact ${dailyMinutesGoal === minutes ? "selected" : ""}`}
                  onClick={() => setDailyMinutesGoal(minutes)}
                >
                  <div className="goal-circle">
                    <span>{minutes}</span>
                    <small>min</small>
                  </div>
                  <IonRadio value={minutes} />
                </div>
              ))}
            </div>
          </IonCardContent>
        </IonCard>

        {/* Idioma */}
        <IonCard className="preference-card">
          <div className="card-header">
            <div className="step-indicator">4</div>
            <IonCardHeader>
              <IonCardTitle className="card-title">Idioma</IonCardTitle>
            </IonCardHeader>
          </div>
          <IonCardContent>
            <div className="language-options-compact">
              <div
                className={`language-option-compact ${languageMode === "ES" ? "selected" : ""}`}
                onClick={() => setLanguageMode("ES")}
              >
                <span className="language-flag">🇪🇸</span>
                <span className="language-text">Español</span>
                <IonRadio value="ES" />
              </div>
              <div
                className={`language-option-compact ${languageMode === "BILINGUAL" ? "selected" : ""}`}
                onClick={() => setLanguageMode("BILINGUAL")}
              >
                <span className="language-flag">🌍</span>
                <span className="language-text">Bilingüe</span>
                <IonRadio value="BILINGUAL" />
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Botón */}
        <div className="action-section">
          <IonButton
            expand="block"
            onClick={save}
            className="start-button"
            size="large"
          >
            <IonIcon icon={checkmarkCircleOutline} slot="start" />
            Comenzar
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
}