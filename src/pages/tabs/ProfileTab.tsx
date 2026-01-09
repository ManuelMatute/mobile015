import { IonButton } from "@ionic/react";
import { useEffect, useMemo, useState } from "react";
import PageShell from "../../components/ui/PageShell";
import { getJSON, removeKey } from "../../services/storage";
import { getStreak, resetStreak } from "../../services/streak";
import { getFinished, getReadingNow, getToRead } from "../../services/library";
import type { UserPrefs } from "../../models/UserPrefs";
import "./ProfileTab.css";

export default function ProfileTab() {
  const [msg, setMsg] = useState("");

  const [prefs, setPrefs] = useState<UserPrefs | null>(null);
  const [counts, setCounts] = useState({ now: 0, toRead: 0, done: 0 });
  const [streakCount, setStreakCount] = useState(0);

  const redoOnboarding = async () => {
    await removeKey("user_prefs_v1");
    setMsg("Onboarding reiniciado. Recarga la app o entra a /onboarding.");
    setPrefs(null);
  };

  const reset = async () => {
    await resetStreak();
    setStreakCount(0);
    setMsg("Racha reseteada ✅");
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [p, s, now, toRead, done] = await Promise.all([
        getJSON<UserPrefs | null>("user_prefs_v1", null),
        getStreak(),
        getReadingNow(),
        getToRead(),
        getFinished(),
      ]);

      if (cancelled) return;

      setPrefs(p);
      setStreakCount(s.streakCount ?? 0);
      setCounts({
        now: Array.isArray(now) ? now.length : 0,
        toRead: Array.isArray(toRead) ? toRead.length : 0,
        done: Array.isArray(done) ? done.length : 0,
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  const levelLabel = useMemo(() => {
    if (!prefs) return "—";
    return prefs.level === "NEW" ? "Nuevo" : "Experto";
  }, [prefs]);

  const dailyGoalLabel = useMemo(() => {
    if (!prefs) return "—";
    return `${prefs.dailyMinutesGoal} min/día`;
  }, [prefs]);

  const genresLabel = useMemo(() => {
    if (!prefs) return [];
    return Array.isArray(prefs.genres) ? prefs.genres : [];
  }, [prefs]);

  return (
    <PageShell title="Perfil">
      <div className="profile-container">
        <div className="resumen-section">
          <h2 className="profile-title">Resumen</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Racha actual</div>
              <p className="stat-value">{streakCount}</p>
            </div>

            <div className="stat-card">
              <div className="stat-label">Terminados</div>
              <p className="stat-value">{counts.done}</p>
            </div>

            <div className="stat-card">
              <div className="stat-label">Leyendo</div>
              <p className="stat-value">{counts.now}</p>
            </div>

            <div className="stat-card">
              <div className="stat-label">Por leer</div>
              <p className="stat-value">{counts.toRead}</p>
            </div>
          </div>
        </div>

        <div className="preferencias-section">
          <h2 className="profile-title">Tus preferencias</h2>

          <div className="preference-item">
            <span className="preference-label">Nivel</span>
            <div className="preference-value">{levelLabel}</div>
          </div>

          <div className="preference-item">
            <span className="preference-label">Meta diaria</span>
            <div className="preference-value">{dailyGoalLabel}</div>
          </div>

          <div className="preference-item">
            <span className="preference-label">Géneros</span>

            {genresLabel.length === 0 ? (
              <div className="preference-value">—</div>
            ) : (
              <div className="genres-wrap">
                {genresLabel.map((g) => (
                  <span key={g} className="genre-tag">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ajustes-section">
          <h2 className="profile-title">Ajustes rápidos</h2>

          <div className="action-buttons">
            <IonButton expand="block" className="app-primary-button" onClick={reset}>
              Resetear racha
            </IonButton>

            <IonButton expand="block" className="app-secondary-button" onClick={redoOnboarding}>
              Rehacer onboarding
            </IonButton>
          </div>

          {msg && <p className="profile-msg">{msg}</p>}
        </div>
      </div>
    </PageShell>
  );
}
