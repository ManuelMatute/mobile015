// components/BookCard.tsx
import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonButton,
  IonIcon,
  IonProgressBar,
  IonBadge
} from '@ionic/react';
import { bookmark, share, star, time, book } from 'ionicons/icons';
import type { Book } from '../models/Book.ts';  // importa la interfaz correcta
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onStartReading?: (bookId: string) => void;
  onSaveBook?: (bookId: string) => void;
  onShare?: (bookId: string) => void;
}

const BookCard: React.FC<BookCardProps> = ({ 
  book, 
  onStartReading, 
  onSaveBook, 
  onShare 
}) => {
  const handleStartReading = () => {
    if (onStartReading) {
      onStartReading(book.id);
    }
  };

  const handleSaveBook = () => {
    if (onSaveBook) {
      onSaveBook(book.id);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(book.id);
    }
  };

  return (
    <IonCard className="book-card">
      <div className="book-card-content">
        {/* Portada */}
        <div 
          className="book-cover" 
          style={{ backgroundColor: book.coverColor }}
          onClick={handleStartReading}
        >
          {book.thumbnail ? (
            <img 
              src={book.thumbnail} 
              alt={book.title}
              className="book-cover-image"
            />
          ) : (
            <div className="book-cover-fallback">
              <span className="book-initial">{book.title.charAt(0)}</span>
            </div>
          )}
          
          {book.isBestseller && (
            <div className="bestseller-badge">BESTSELLER</div>
          )}
        </div>
        
        {/* Información */}
        <div className="book-info">
          <div className="book-main-info">
            <h3 className="book-title">{book.title}</h3>
            <p className="book-author">{book.author}</p>  {/* singular */}
            
            <div className="book-meta">
              <span className="book-genre">{book.genre}</span>
              <span className="book-pages">
                <IonIcon icon={book} /> {book.pageCount} págs  {/* pageCount, no pages */}
              </span>
              <span className="book-rating">
                <IonIcon icon={star} /> {book.rating.toFixed(1)}
              </span>
            </div>
            
            {book.description && (
              <p className="book-description">
                {book.description.length > 100 
                  ? `${book.description.substring(0, 100)}...` 
                  : book.description}
              </p>
            )}
          </div>
          
          {/* Progreso y acciones */}
          <div className="book-actions">
            <div className="book-progress">
              <IonProgressBar 
                value={book.progress / 100} 
                className="book-progress-bar"
              />
              <span className="progress-text">{book.progress}% leído</span>
            </div>
            
            <div className="action-buttons">
              {book.progress === 0 ? (
                <IonButton 
                  size="small" 
                  onClick={handleStartReading}
                  className="start-button"
                >
                  Comenzar
                </IonButton>
              ) : book.progress === 100 ? (
                <div className="completed-badge">
                  <IonIcon icon={star} />
                  <span>Completado</span>
                </div>
              ) : (
                <IonButton 
                  size="small" 
                  onClick={handleStartReading}
                  className="continue-button"
                >
                  Continuar
                </IonButton>
              )}
              
              <div className="secondary-actions">
                <IonButton 
                  fill="clear" 
                  size="small"
                  onClick={handleSaveBook}
                  className="icon-button"
                >
                  <IonIcon icon={bookmark} />
                </IonButton>
                <IonButton 
                  fill="clear" 
                  size="small"
                  onClick={handleShare}
                  className="icon-button"
                >
                  <IonIcon icon={share} />
                </IonButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </IonCard>
  );
};

export default BookCard;