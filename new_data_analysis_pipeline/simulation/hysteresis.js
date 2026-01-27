export function applyHysteresis(current, target, threshold = 0.1) {
  // only update if change is large enough
  if (Math.abs(target - current) < threshold) return current;
  return target;
}