import {
  IonApp,
  IonRouterOutlet,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel,
} from "@ionic/react";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import { homeOutline, searchOutline, libraryOutline, personOutline } from "ionicons/icons";

import HomeTab from "./pages/tabs/HomeTab";
import ExploreTab from "./pages/tabs/ExploreTab";
import LibraryTab from "./pages/tabs/LibraryTab";
import ProfileTab from "./pages/tabs/ProfileTab";
import Onboarding from "./pages/Onboarding";
import BookDetail from "./pages/BookDetail";

import { getJSON } from "./services/storage";
import type { UserPrefs } from "./models/UserPrefs";

import "./theme/appTheme.css";

const PREFS_KEY = "user_prefs_v1";

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    (async () => {
      const prefs = await getJSON<UserPrefs | null>(PREFS_KEY, null);
      setOnboarded(!!prefs?.onboarded);
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route path="/onboarding" exact>
            <Onboarding onDone={() => setOnboarded(true)} />
          </Route>

          <Route path="/book/:id" exact>
            <BookDetail />
          </Route>

          <Route path="/tabs">
            {!onboarded ? (
              <Redirect to="/onboarding" />
            ) : (
              <IonTabs>
                <IonRouterOutlet>
                  <Route path="/tabs/home" exact component={HomeTab} />
                  <Route path="/tabs/explore" exact component={ExploreTab} />
                  <Route path="/tabs/library" exact component={LibraryTab} />
                  <Route path="/tabs/profile" exact component={ProfileTab} />
                  <Route exact path="/tabs">
                    <Redirect to="/tabs/home" />
                  </Route>
                </IonRouterOutlet>

                <IonTabBar slot="bottom" className="tab-bar">
                  <IonTabButton tab="home" href="/tabs/home" className="tab-button">
                    <span className="tab-icon">
                      <IonIcon icon={homeOutline} />
                    </span>
                    <IonLabel className="tab-label">Inicio</IonLabel>
                  </IonTabButton>

                  <IonTabButton tab="explore" href="/tabs/explore" className="tab-button">
                    <span className="tab-icon">
                      <IonIcon icon={searchOutline} />
                    </span>
                    <IonLabel className="tab-label">Explorar</IonLabel>
                  </IonTabButton>

                  <IonTabButton tab="library" href="/tabs/library" className="tab-button">
                    <span className="tab-icon">
                      <IonIcon icon={libraryOutline} />
                    </span>
                    <IonLabel className="tab-label">Mi lectura</IonLabel>
                  </IonTabButton>

                  <IonTabButton tab="profile" href="/tabs/profile" className="tab-button">
                    <span className="tab-icon">
                      <IonIcon icon={personOutline} />
                    </span>
                    <IonLabel className="tab-label">Perfil</IonLabel>
                  </IonTabButton>
                </IonTabBar>
              </IonTabs>
            )}
          </Route>

          <Route exact path="/">
            <Redirect to="/tabs" />
          </Route>
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
