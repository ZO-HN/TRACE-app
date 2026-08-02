export interface BodyweightLogInsert {
  id: string;
  user_id: string;
  recorded_date: string; // YYYY-MM-DD
  weight_kg: number;
  note?: string | null;
}
