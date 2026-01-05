export type ReadingLevel = "NEW" | "EXPERIENCED";

export type UserPrefs = {
  onboarded: boolean;
  level: ReadingLevel;
  genres: string[];
  dailyMinutesGoal: 5 | 10 | 20;
};
