// pages/tabs/HomeTab.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonSkeletonText,
  IonRefresher,
  IonRefresherContent,
  IonGrid,
  IonRow,
  IonCol
} from '@ionic/react';
import {
  flame,
  book,
  time,
  star,
  arrowForward,
  bookmark,
  barbell,
  trophy,
  checkmarkCircle,
  refresh
} from 'ionicons/icons';
import './HomeTab.css';
import BookCard from '../../components/BookCard';
import { getRecommendedBooks } from '../../services/books';
import { getJSON } from '../../services/storage';
import type { Book } from '../../models/Book.tsx';

const HomeTab: React.FC = () => {
  const [streak, setStreak] = useState<number>(0);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [dailyGoal, setDailyGoal] = useState<number>(30);
  const [currentMinutes, setCurrentMinutes] = useState<number>(0);
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    loadUserStats();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const recommendedBooks = await getRecommendedBooks();
      setBooks(recommendedBooks);
      
      // Calcular estadísticas basadas en libros
      const totalPages = recommendedBooks.reduce((sum: number, book: Book) => 
        sum + (book.pageCount || 0), 0);
      
      const avgProgress = recommendedBooks.length > 0 
        ? recommendedBooks.reduce((sum: number, book: Book) => sum + book.progress, 0) / recommendedBooks.length
        : 0;
      
      setTotalBooks(recommendedBooks.length);
      setCurrentMinutes(Math.floor((totalPages * avgProgress / 100) * 2)); // 2 min por página
      
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const userPrefs = await getJSON('user_prefs_v1');
      if (userPrefs && userPrefs.dailyMinutesGoal && userPrefs.level) {
        setDailyGoal(userPrefs.dailyMinutesGoal);
        
        // Simular racha basada en preferencias
        const baseStreak = userPrefs.level === 'EXPERIENCED' ? 7 : 3;
        setStreak(baseStreak + Math.floor(Math.random() * 5));
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const handleRefresh = async (event: CustomEvent) => {
    setRefreshing(true);
    
    try {
      // Recargar libros
      const newBooks = await getRecommendedBooks();
      setBooks(newBooks);
      
      // Actualizar estadísticas
      await loadUserStats();
      
      // Simular actualización de minutos
      setCurrentMinutes(prev => {
        const increment = Math.floor(Math.random() * 10) + 5;
        return Math.min(prev + increment, dailyGoal);
      });
      
    } catch (error) {
      console.error('Error actualizando:', error);
    } finally {
      setRefreshing(false);
      if (event.detail && event.detail.complete) {
        event.detail.complete();
      }
    }
  };

  const startReading = useCallback((bookId: string) => {
    setBooks(prev =>
      prev.map(book =>
        book.id === bookId 
          ? { 
              ...book, 
              progress: book.progress === 0 ? 5 : Math.min(book.progress + 15, 100),
              minutes: book.minutes + 5
            } 
          : book
      )
    );
    
    // Actualizar minutos actuales
    setCurrentMinutes(prev => Math.min(prev + 5, dailyGoal));
    
    // Aumentar racha si se llega a la meta
    if (currentMinutes + 5 >= dailyGoal) {
      setStreak(prev => prev + 1);
    }
    
    console.log('Comenzar a leer libro:', bookId);
  }, [currentMinutes, dailyGoal]);

  const saveBook = useCallback((bookId: string) => {
    console.log('Guardar libro:', bookId);
    // Aquí iría la lógica para guardar en favoritos
  }, []);

  const shareBook = useCallback((bookId: string) => {
    console.log('Compartir libro:', bookId);
    // Aquí iría la lógica para compartir
  }, []);

  const progressPercentage = (currentMinutes / dailyGoal) * 100;

  // Renderizar skeletons mientras carga
  if (loading && books.length === 0) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <div className="home-header">
              <IonTitle>Inicio</IonTitle>
              <div className="streak-display">
                {[1, 2, 3].map(i => (
                  <div key={i} className="streak-item">
                    <IonSkeletonText animated style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                    <IonSkeletonText animated style={{ width: '40px', height: '10px' }} />
                    <IonSkeletonText animated style={{ width: '30px', height: '14px' }} />
                  </div>
                ))}
              </div>
            </div>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <div className="daily-progress-container">
            <IonCard className="daily-progress-card">
              <IonCardContent>
                <IonSkeletonText animated style={{ width: '60%', height: '20px' }} />
                <IonSkeletonText animated style={{ width: '100%', height: '8px', margin: '12px 0' }} />
                <IonSkeletonText animated style={{ width: '40%', height: '16px' }} />
              </IonCardContent>
            </IonCard>
          </div>
          
          <div className="recommended-section">
            <div className="section-header">
              <IonSkeletonText animated style={{ width: '150px', height: '24px' }} />
              <IonSkeletonText animated style={{ width: '60px', height: '20px' }} />
            </div>
            
            <IonGrid>
              <IonRow>
                {[1, 2, 3].map(i => (
                  <IonCol size="12" key={i}>
                    <div className="book-card-skeleton">
                      <IonSkeletonText animated style={{ width: '100%', height: '160px', borderRadius: '16px' }} />
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <div className="home-header">
            <IonTitle>Inicio</IonTitle>
            <div className="streak-display">
              <div className="streak-item">
                <div className="streak-icon active">
                  <IonIcon icon={flame} />
                </div>
                <span className="streak-label">Racha</span>
                <span className="streak-value">{streak} días</span>
              </div>
              
              <div className="streak-divider"></div>
              
              <div className="streak-item">
                <div className="streak-icon">
                  <IonIcon icon={book} />
                </div>
                <span className="streak-label">Libros</span>
                <span className="streak-value">{totalBooks}</span>
              </div>
              
              <div className="streak-divider"></div>
              
              <div className="streak-item">
                <div className="streak-icon">
                  <IonIcon icon={time} />
                </div>
                <span className="streak-label">Minutos</span>
                <span className="streak-value">{currentMinutes}</span>
              </div>
            </div>
          </div>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="home-content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent
            pullingIcon={refresh}
            refreshingSpinner="crescent"
          />
        </IonRefresher>
        
        {/* Progreso diario */}
        <div className="daily-progress-container">
          <IonCard className="daily-progress-card">
            <IonCardContent>
              <div className="progress-header">
                <h3 className="progress-title">Progreso diario</h3>
                <span className="progress-time">
                  {refreshing ? (
                    <IonIcon icon={refresh} className="spinning" />
                  ) : (
                    `${currentMinutes}/${dailyGoal} min`
                  )}
                </span>
              </div>
              <IonProgressBar 
                value={progressPercentage / 100} 
                className="daily-progress-bar" 
              />
              <div className="progress-message">
                {progressPercentage >= 100 ? (
                  <span className="goal-achieved">🎉 ¡Meta alcanzada hoy!</span>
                ) : progressPercentage >= 75 ? (
                  <span className="goal-close">✅ Casi lo logras, ¡sigue así!</span>
                ) : (
                  <span className="goal-in-progress">📚 Sigue leyendo para completar tu meta</span>
                )}
              </div>
            </IonCardContent>
          </IonCard>
        </div>

        {/* Recomendado para hoy */}
        <div className="recommended-section">
          <div className="section-header">
            <h2 className="section-title">Recomendado para hoy</h2>
            <IonButton 
              fill="clear" 
              className="see-all-button"
              onClick={loadInitialData}
              disabled={refreshing}
            >
              {refreshing ? (
                <IonIcon icon={refresh} className="spinning" />
              ) : (
                <>
                  Actualizar <IonIcon icon={arrowForward} slot="end" />
                </>
              )}
            </IonButton>
          </div>

          <IonGrid>
            <IonRow>
              {books.map((book) => (
                <IonCol size="12" key={book.id}>
                  <BookCard 
                    book={book}
                    onStartReading={startReading}
                    onSaveBook={saveBook}
                    onShare={shareBook}
                  />
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </div>

        {/* Estadísticas rápidas */}
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <IonIcon icon={trophy} />
            </div>
            <div className="stat-value">{Math.round(progressPercentage)}%</div>
            <div className="stat-label">Meta diaria</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #FF9A3D 100%)' }}>
              <IonIcon icon={barbell} />
            </div>
            <div className="stat-value">{streak}</div>
            <div className="stat-label">Días seguidos</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' }}>
              <IonIcon icon={star} />
            </div>
            <div className="stat-value">
              {books.length > 0 
                ? (books.reduce((sum: number, book: Book) => sum + book.rating, 0) / books.length).toFixed(1)
                : '4.5'
              }
            </div>
            <div className="stat-label">Rating promedio</div>
          </div>
        </div>

      </IonContent>
    </IonPage>
  );
};

export default HomeTab;