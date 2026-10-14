export interface CardRow {
  id: string;
  label: string;
  value: string;
  /** Rating explanation, shown as the row's title attribute. */
  title: string;
  meter: { filled: number; text: string } | null;
}
