import React, { useState } from "react";
import {
  IonContent,
  IonPage,
  IonButton,
  IonCard,
  IonCardContent,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import { bookOutline, chevronForward, checkmarkCircle } from "ionicons/icons";
import "./Onboarding.css";

import { useHistory } from "react-router-dom";
import { setJSON } from "../services/storage";
import type { UserPrefs } from "../models/UserPrefs";

type Props = {
  onDone: () => void;
};

const Onboarding: React.FC<Props> = ({ onDone }) => {
  const history = useHistory();

  const TOTAL_STEPS = 3;

  const [currentStep, setCurrentStep] = useState(1);
  const [userLevel, setUserLevel] = useState<"Nuevo" | "Experto" | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState<5 | 10 | 20 | null>(null);

  const genres = [
    "Romance",
    "Misterio",
    "Fantasía",
    "Ciencia Ficción",
    "Thriller",
    "Terror",
    "Aventura",
    "Juvenil",
    "Historia",
    "Biografía",
    "No Ficción",
    "Filosofía",
    "Autoayuda",
    "Psicología",
    "Negocios",
    "Tecnología",
    "Poesía",
    "Cómics",
  ];

  const dailyGoals: { minutes: 5 | 10 | 20; label: string }[] = [
    { minutes: 5, label: "5 min/día" },
    { minutes: 10, label: "10 min/día" },
    { minutes: 20, label: "20 min/día" },
  ];

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const nextStep = async () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
      return;
    }

    const prefs: UserPrefs = {
      onboarded: true,
      level: userLevel === "Nuevo" ? "NEW" : "EXPERIENCED",
      genres: selectedGenres,
      dailyMinutesGoal: (dailyGoal ?? 10) as 5 | 10 | 20,
    };

    await setJSON("user_prefs_v1", prefs);

    onDone();
    history.replace("/tabs/home");
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return userLevel !== null;
      case 2:
        return selectedGenres.length > 0;
      case 3:
        return dailyGoal !== null;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="step-content">
            <div className="step-icon">
              <IonIcon icon={bookOutline} className="step-icon-img" />
            </div>
            <h2 className="step-title">¿Cuál es tu nivel?</h2>
            <p className="step-description">Selecciona tu experiencia en lectura</p>

            <div className="options-grid">
              <IonCard
                className={`level-card ${userLevel === "Nuevo" ? "selected" : ""}`}
                onClick={() => setUserLevel("Nuevo")}
              >
                <IonCardContent>
                  <h3>Nuevo</h3>
                  <p>Estoy empezando mi hábito de lectura</p>
                  {userLevel === "Nuevo" && (
                    <IonIcon icon={checkmarkCircle} className="check-icon" />
                  )}
                </IonCardContent>
              </IonCard>

              <IonCard
                className={`level-card ${userLevel === "Experto" ? "selected" : ""}`}
                onClick={() => setUserLevel("Experto")}
              >
                <IonCardContent>
                  <h3>Experto</h3>
                  <p>Ya tengo un hábito de lectura establecido</p>
                  {userLevel === "Experto" && (
                    <IonIcon icon={checkmarkCircle} className="check-icon" />
                  )}
                </IonCardContent>
              </IonCard>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h2 className="step-title">Tus gustos</h2>
            <p className="step-description">Selecciona tus géneros favoritos</p>

            <IonGrid className="genres-grid">
              <IonRow>
                {genres.map((genre) => (
                  <IonCol size="6" key={genre}>
                    <div
                      className={`genre-chip ${selectedGenres.includes(genre) ? "selected" : ""}`}
                      onClick={() => handleGenreToggle(genre)}
                    >
                      {genre}
                      {selectedGenres.includes(genre) && (
                        <IonIcon icon={checkmarkCircle} className="chip-check" />
                      )}
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>

            <div className="selected-count">
              {selectedGenres.length > 0
                ? `${selectedGenres.length} seleccionados`
                : "Selecciona al menos 1"}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h2 className="step-title">Meta diaria</h2>
            <p className="step-description">Establece tu objetivo de lectura diaria</p>

            <div className="goals-container">
              {dailyGoals.map((goal) => (
                <IonCard
                  key={goal.minutes}
                  className={`goal-card ${dailyGoal === goal.minutes ? "selected" : ""}`}
                  onClick={() => setDailyGoal(goal.minutes)}
                >
                  <IonCardContent>
                    <div className="goal-time">{goal.minutes} min</div>
                    <p className="goal-label">por día</p>
                    {dailyGoal === goal.minutes && (
                      <IonIcon icon={checkmarkCircle} className="goal-check" />
                    )}
                  </IonCardContent>
                </IonCard>
              ))}
            </div>

            <div className="streak-motivation">
              <p>Con {dailyGoal || "X"} minutos diarios, podrás construir un hábito sólido</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <IonPage>
      <IonContent className="onboarding-content">
        <div className="step-indicators">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`step-indicator ${currentStep === step ? "active" : ""} ${
                currentStep > step ? "completed" : ""
              }`}
              onClick={() => setCurrentStep(step)}
            >
              {currentStep > step ? "✓" : step}
            </div>
          ))}
        </div>

        <div className="step-container">{renderStep()}</div>

        <div className="navigation-buttons">
          {currentStep > 1 && (
            <IonButton fill="clear" className="back-button" onClick={prevStep}>
              Atrás
            </IonButton>
          )}

          <div className="step-counter">
            Paso {currentStep} de {TOTAL_STEPS}
          </div>

          <IonButton className="next-button" onClick={nextStep} disabled={!isStepValid()}>
            {currentStep === TOTAL_STEPS ? "Comenzar" : "Siguiente"}
            {currentStep < TOTAL_STEPS && <IonIcon icon={chevronForward} slot="end" />}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;
