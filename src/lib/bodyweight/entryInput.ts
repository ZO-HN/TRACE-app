import { localDate } from '../localDate';
import { parseWeightToKg, type WeightDisplayUnit } from '../units';

export function validateWeighInDate(value: string, today = localDate()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) throw new Error('Enter a date as YYYY-MM-DD.');
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new Error('Enter a valid calendar date.');
  if (value > today) throw new Error('A weigh-in cannot be recorded in the future.');
  return value;
}

export function parseBodyweightNumber(input: string): number {
  const text = input.trim();
  if (!/^\d+(?:[.,]\d+)?$/.test(text)) throw new Error('Enter a positive weight.');
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a positive weight.');
  return value;
}

export function weighInWeightKg(input: string, unit: WeightDisplayUnit): number {
  const kg = parseWeightToKg(parseBodyweightNumber(input), unit);
  if (!Number.isFinite(kg) || kg <= 0 || kg >= 700)
    throw new Error('Weight must be greater than 0 and less than 700 kg.');
  return kg;
}
