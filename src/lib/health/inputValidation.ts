export function isValidSteps(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 200_000;
}

export function isValidCardioDuration(value: number): boolean {
  return Number.isInteger(value) && value > 0 && value <= 86_400;
}
