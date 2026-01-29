// randomization  helpers

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function getRandomArrayElement(array) {
  return array[getRandomInt(0, array.length)];
}

function getRandomBool(threshold = 0.5) {
    return Math.random() < threshold;
}

function getWeightedRandomKey(weightsObj) {
  const totalWeight = Object.values(weightsObj).reduce((a, b) => a + b, 0);
  let roll = Math.random() * totalWeight;

  for (const key in weightsObj) {
    if (roll < weightsObj[key]) return key;
    roll -= weightsObj[key];
  }
  return Object.keys(weightsObj)[0];
}

export default {
    getRandomFloat,
    getRandomInt,
    getRandomBool,
    getRandomArrayElement,
    getWeightedRandomKey
}