export function randFloats(n, min, max) {
  const arr = new Float64Array(n);
  const range = max - min;
  for (let i = 0; i < n; i++) arr[i] = Math.random() * range + min;
  return arr;
}

export function randInts(n, min, max) {
  const arr = new Int32Array(n);
  const range = max - min;
  for (let i = 0; i < n; i++) arr[i] = Math.floor(Math.random() * range) + min;
  return arr;
}

export function randBools(n, p) {
  const arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) arr[i] = Math.random() < p ? 1 : 0;
  return arr;
}