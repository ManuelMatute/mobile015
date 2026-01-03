import React, { useState } from 'react';
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
} from '@ionic/react';
import { bookOutline, chevronForward, checkmarkCircle } from 'ionicons/icons';
import './Onboarding.css';

const Onboarding: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [userLevel, setUserLevel] = useState<'Nuevo' | 'Experto' | null>(null);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [dailyGoal, setDailyGoal] = useState<number | null>(null);
  const [languagePref, setLanguagePref] = useState<string | null>(null);

  const genres = [
    'Romance', 'Misterio', 'Fantasía', 'Ciencia Ficción', 
    'No Ficción', 'Filosofía', 'Thriller'
  ];

  const dailyGoals = [
    { minutes: 5, label: '5 min/día' },
    { minutes: 10, label: '10 min/día' },
    { minutes: 20, label: '20 min/día' }
  ];

  const languages = [
    { id: 'es', label: 'Solo español', icon: '🇪🇸' },
    { id: 'both', label: 'Español e inglés', icon: '🌍' }
  ];

  const handleGenreToggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre));
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Finalizar onboarding
      console.log('Onboarding completado');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isStepValid = () => {
    switch(currentStep) {
      case 1: return userLevel !== null;
      case 2: return selectedGenres.length > 0;
      case 3: return dailyGoal !== null;
      case 4: return languagePref !== null;
      default: return false;
    }
  };

  const renderStep = () => {
    switch(currentStep) {
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
                className={`level-card ${userLevel === 'Nuevo' ? 'selected' : ''}`}
                onClick={() => setUserLevel('Nuevo')}
              >
                <IonCardContent>
                  <h3>Nuevo</h3>
                  <p>Estoy empezando mi hábito de lectura</p>
                  {userLevel === 'Nuevo' && (
                    <IonIcon icon={checkmarkCircle} className="check-icon" />
                  )}
                </IonCardContent>
              </IonCard>
              
              <IonCard 
                className={`level-card ${userLevel === 'Experto' ? 'selected' : ''}`}
                onClick={() => setUserLevel('Experto')}
              >
                <IonCardContent>
                  <h3>Experto</h3>
                  <p>Ya tengo un hábito de lectura establecido</p>
                  {userLevel === 'Experto' && (
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
                      className={`genre-chip ${selectedGenres.includes(genre) ? 'selected' : ''}`}
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
                : 'Selecciona al menos 1'}
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
                  className={`goal-card ${dailyGoal === goal.minutes ? 'selected' : ''}`}
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
              <p>Con {dailyGoal || 'X'} minutos diarios, podrás construir un hábito sólido</p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h2 className="step-title">Idioma</h2>
            <p className="step-description">Selecciona tu preferencia de idioma</p>
            
            <div className="language-options">
              {languages.map((lang) => (
                <IonCard 
                  key={lang.id}
                  className={`language-card ${languagePref === lang.id ? 'selected' : ''}`}
                  onClick={() => setLanguagePref(lang.id)}
                >
                  <IonCardContent>
                    <div className="language-header">
                      <span className="language-icon">{lang.icon}</span>
                      <h3>{lang.label}</h3>
                    </div>
                    <p className="language-description">
                      {lang.id === 'es' 
                        ? 'Libros solo en español' 
                        : 'Libros en ambos idiomas'}
                    </p>
                    {languagePref === lang.id && (
                      <IonIcon icon={checkmarkCircle} className="language-check" />
                    )}
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <IonPage>
      <IonContent className="onboarding-content">
        {/* Indicadores de progreso */}
        <div className="step-indicators">
          {[1, 2, 3, 4].map((step) => (
            <div 
              key={step} 
              className={`step-indicator ${currentStep === step ? 'active' : ''} ${currentStep > step ? 'completed' : ''}`}
              onClick={() => setCurrentStep(step)}
            >
              {currentStep > step ? '✓' : step}
            </div>
          ))}
        </div>

        {/* Contenido del paso actual */}
        <div className="step-container">
          {renderStep()}
        </div>

        {/* Botones de navegación */}
        <div className="navigation-buttons">
          {currentStep > 1 && (
            <IonButton 
              fill="clear" 
              className="back-button"
              onClick={prevStep}
            >
              Atrás
            </IonButton>
          )}
          
          <div className="step-counter">
            Paso {currentStep} de 4
          </div>
          
          <IonButton 
            className="next-button"
            onClick={nextStep}
            disabled={!isStepValid()}
          >
            {currentStep === 4 ? 'Comenzar' : 'Siguiente'}
            {currentStep < 4 && <IonIcon icon={chevronForward} slot="end" />}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Onboarding;