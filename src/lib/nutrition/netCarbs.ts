// Net carbs = total carbs minus fiber (Tracked's "net carbs toggle").
// Pure and framework-free.

export function netCarbsG(carbs_g: number | null, fiber_g: number | null): number | null {
  if (carbs_g == null) return null;
  if (fiber_g == null) return carbs_g;
  return Math.max(0, carbs_g - fiber_g);
}
