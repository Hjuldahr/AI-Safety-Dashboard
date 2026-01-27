export function createStats() {
  return {
    count: 0,
    sum: 0,
    min: Infinity,
    max: -Infinity,
    add(value) {
      this.count++;
      this.sum += value;
      this.min = Math.min(this.min, value);
      this.max = Math.max(this.max, value);
    },
    finalize() {
      if (this.count === 0) {
        return { min: 0, max: 0, mean: 0 };
      }
      return {
        min: this.min,
        max: this.max,
        mean: this.sum / this.count
      };
    }
  };
}