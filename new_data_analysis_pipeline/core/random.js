export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function randChoice(arr) {
  return arr[randInt(0, arr.length)];
}

export function weightedChoice(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;

  for (const key in weights) {
    roll -= weights[key];
    if (roll <= 0) return key;
  }
  return Object.keys(weights)[0];
}