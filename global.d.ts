interface Window {
  Telegram: any;
  upsertPlayer: (score: number) => Promise<void>;
  totalScore: number;
}