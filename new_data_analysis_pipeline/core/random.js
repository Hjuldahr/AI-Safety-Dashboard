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

export function randChoice(arr) {
  return arr[randInts(1, 0, arr.length)]
}

export function weightedChoice(weightsObj) {
  const totalWeight = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (const key in weightsObj) {
    if (roll < weightsObj[key]) return key;
    roll -= weightsObj[key];
  }
  return Object.keys(weightsObj)[0];
}