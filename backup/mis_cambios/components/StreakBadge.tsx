import { IonChip, IonIcon, IonLabel } from "@ionic/react";
import { flameOutline } from "ionicons/icons";

export default function StreakBadge({ count }: { count: number }) {
  return (
    <IonChip>
      <IonIcon icon={flameOutline} />
      <IonLabel>Racha: {count} día(s)</IonLabel>
    </IonChip>
  );
}