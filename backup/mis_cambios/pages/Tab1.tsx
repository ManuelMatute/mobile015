import React from 'react';
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar, 
  IonGrid, 
  IonRow, 
  IonCol,
  IonSpinner
} from '@ionic/react';
import { useState, useEffect, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import BookCard from '../components/BookCard';
import StreakBadge from '../components/StreakBadge';
import { getBooks } from '../services/books';
import { getStreak, markReadToday } from '../services/streak';
import type { Book } from '../models/Book';

const Tab1: React.FC = () => {
  const history = useHistory();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState<number>(0);

  // Cargar la racha
  useEffect(() => {
    const loadStreak = async () => {
      try {
        const streakState = await getStreak();
        setStreakCount(streakState.streakCount);
      } catch (err) {
        console.error('Error loading streak:', err);
      }
    };
    loadStreak();
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = getBooks();
      setBooks(data);
    } catch (err) {
      setError('Error al cargar los libros');
      console.error('Error loading books:', err);
      const mockData = getBooks();
      setBooks(mockData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const handleBookClickAsync = async (book: Book) => {
    history.push(`/book/${book.id}`);
    try {
      const newStreakState = await markReadToday();
      setStreakCount(newStreakState.streakCount);
    } catch (err) {
      console.error('Error updating streak:', err);
    }
  };

  const handleBookCardClick = (book: Book) => {
    handleBookClickAsync(book);
  };

  const renderContent = () => {
    if (loading && books.length === 0) {
      return (
        <div style={styles.loadingContainer}>
          <IonSpinner name="crescent" />
          <p style={styles.loadingText}>Cargando libros recomendados...</p>
        </div>
      );
    }

    if (error && books.length === 0) {
      return (
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{error}</p>
          <button 
            style={styles.retryButton}
            onClick={loadBooks}
          >
            Reintentar
          </button>
        </div>
      );
    }

    if (books.length === 0) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>No hay libros disponibles</p>
        </div>
      );
    }

    return (
      <>
        <div style={styles.header}>
          <h1 style={styles.title}>Recomendado para hoy</h1>
          <p style={styles.subtitle}>Basado en tu actividad de lectura</p>
        </div>

        <IonGrid style={styles.grid}>
          <IonRow>
            {books.map((book) => (
              <IonCol 
                size="6" 
                key={book.id}
                style={styles.bookCol}
              >
                <BookCard 
                  book={book} 
                  onClick={() => handleBookCardClick(book)}
                />
              </IonCol>
            ))}
          </IonRow>
        </IonGrid>
      </>
    );
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary" style={styles.toolbar}>
          <IonTitle style={styles.toolbarTitle}>Inicio</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen style={styles.content}>
        <div style={styles.container}>
          {/* StreakBadge centrado con fondo */}
          <div style={styles.streakContainer}>
            <StreakBadge count={streakCount} />
          </div>
          
          <div style={styles.contentSection}>
            {renderContent()}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

// ESTILOS INLINE QUE SÍ FUNCIONAN
const styles = {
  container: {
    padding: '16px',
    maxWidth: '1200px',
    margin: '0 auto' as const,
  },
  contentSection: {
    marginTop: '24px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  title: {
    fontWeight: '700' as const,
    fontSize: '24px',
    margin: '0 0 8px 0',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: '16px',
    color: '#7f8c8d',
    margin: '0 0 24px 0',
  },
  grid: {
    padding: '0',
  },
  bookCol: {
    padding: '8px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center' as const,
  },
  loadingText: {
    marginTop: '16px',
    color: '#7f8c8d',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center' as const,
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: '16px',
  },
  retryButton: {
    background: '#3880ff',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600' as const,
    cursor: 'pointer',
    transition: 'background 0.3s ease',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    textAlign: 'center' as const,
    color: '#95a5a6',
  },
  emptyText: {
    fontSize: '16px',
  },
  streakContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '20px',
    padding: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
  },
  toolbar: {
    '--background': '#3880ff',
    '--color': 'white',
  },
  toolbarTitle: {
    fontWeight: '600' as const,
  },
  content: {
    '--background': '#f8f9fa',
  },
};

export default Tab1;