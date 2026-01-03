// src/pages/tabs/LibraryTab.tsx - CREA ESTE ARCHIVO NUEVO
import { 
  IonContent, 
  IonHeader, 
  IonPage, 
  IonTitle, 
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonProgressBar,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonCard,
  IonCardContent
} from '@ionic/react';
import { bookOutline, timeOutline, checkmarkCircle, trophyOutline } from 'ionicons/icons';
import { useState } from 'react';
import './LibraryTab.css';

const LibraryTab: React.FC = () => {
  const [activeSegment, setActiveSegment] = useState<'reading' | 'completed'>('reading');

  // Datos de ejemplo
  const readingBooks = [
    { id: 1, title: "Cien años de soledad", progress: 65, author: "Gabriel García Márquez", pagesRead: 280, totalPages: 432 },
    { id: 2, title: "El Quijote", progress: 30, author: "Miguel de Cervantes", pagesRead: 307, totalPages: 1023 },
  ];

  const completedBooks = [
    { id: 3, title: "Ficciones", author: "Jorge Luis Borges", completedDate: "2024-01-15", readingTime: "8 horas" },
  ];

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>Mi lectura</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="library-container">
          <div style={{ marginBottom: '24px' }}>
            <IonSegment value={activeSegment} onIonChange={e => setActiveSegment(e.detail.value as any)}>
              <IonSegmentButton value="reading">
                <IonLabel>En progreso</IonLabel>
              </IonSegmentButton>
              <IonSegmentButton value="completed">
                <IonLabel>Completados</IonLabel>
              </IonSegmentButton>
            </IonSegment>
          </div>

          {activeSegment === 'reading' ? (
            <>
              {readingBooks.length > 0 ? (
                <IonList>
                  {readingBooks.map(book => (
                    <IonItem key={book.id} style={{ '--padding-start': '0', '--inner-padding-end': '0', marginBottom: '12px' }}>
                      <div style={{ 
                        background: 'linear-gradient(135deg, #667eea20 0%, #764ba220 100%)', 
                        borderRadius: '12px',
                        padding: '12px',
                        width: '100%'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                          <IonIcon icon={bookOutline} style={{ fontSize: '24px', color: '#3880ff', marginRight: '12px' }} />
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '16px' }}>{book.title}</h3>
                            <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>{book.author}</p>
                          </div>
                          <span style={{ 
                            background: '#3880ff', 
                            color: 'white', 
                            padding: '4px 8px', 
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {book.progress}%
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: '8px' }}>
                          <IonProgressBar value={book.progress / 100} color="primary" />
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#666' }}>
                          <span>{book.pagesRead} de {book.totalPages} páginas</span>
                          <span>
                            <IonIcon icon={timeOutline} style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '4px' }} />
                            {Math.round((book.totalPages - book.pagesRead) / 35)}h restantes
                          </span>
                        </div>
                      </div>
                    </IonItem>
                  ))}
                </IonList>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <IonIcon icon={bookOutline} style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
                  <h3 style={{ color: '#666', marginBottom: '8px' }}>No tienes libros en progreso</h3>
                  <p style={{ color: '#888' }}>Empieza a leer un libro desde la pestaña Inicio o Explorar</p>
                </div>
              )}
            </>
          ) : (
            <>
              {completedBooks.length > 0 ? (
                <IonList>
                  {completedBooks.map(book => (
                    <IonCard key={book.id} style={{ margin: '0 0 12px 0' }}>
                      <IonCardContent>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <IonIcon icon={checkmarkCircle} style={{ fontSize: '24px', color: '#2dd36f', marginRight: '12px' }} />
                          <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 4px 0', fontWeight: '600' }}>{book.title}</h3>
                            <p style={{ margin: '0 0 4px 0', color: '#666' }}>{book.author}</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#888' }}>
                              <span>
                                <IonIcon icon={trophyOutline} style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '4px' }} />
                                Completado
                              </span>
                              <span>
                                <IonIcon icon={timeOutline} style={{ fontSize: '12px', verticalAlign: 'middle', marginRight: '4px' }} />
                                {book.readingTime}
                              </span>
                              <span>{book.completedDate}</span>
                            </div>
                          </div>
                        </div>
                      </IonCardContent>
                    </IonCard>
                  ))}
                </IonList>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <IonIcon icon={trophyOutline} style={{ fontSize: '48px', color: '#ccc', marginBottom: '16px' }} />
                  <h3 style={{ color: '#666', marginBottom: '8px' }}>No has completado libros aún</h3>
                  <p style={{ color: '#888' }}>¡Sigue leyendo para completar tu primer libro!</p>
                </div>
              )}
            </>
          )}
        </div>
      </IonContent>
    </IonPage>
  );
};

export default LibraryTab;