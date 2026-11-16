/**
 * Deterministic placeholder artwork for titles without an image.
 *
 * Slices 01–02 ship no image assets (see docs/slices/), and TMDB
 * titles can also lack a backdrop, so this stays useful after slice 03.
 * Lives in lib/ because both catalog and auth (login backdrop) use it.
 * Same id → same gradient, so cards do not change colour between renders.
 */
export function placeholderGradient(id: number): string {
  // 137° (≈ golden angle) spreads neighbouring ids across the colour wheel.
  const hue = (id * 137) % 360;
  return `linear-gradient(135deg, hsl(${hue} 55% 32%), hsl(${(hue + 40) % 360} 60% 14%))`;
}
