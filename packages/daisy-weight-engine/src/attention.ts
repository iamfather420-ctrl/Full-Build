/** Tiny CPU attention. This is not a language model and has no tokenizer. */
export function attention(query: number[], keys: number[][], values: number[][]): number[] {
  if (keys.length !== values.length || keys.length === 0) throw new Error('Attention keys and values must align.');
  const scores = keys.map((key) => query.reduce((sum, value, index) => sum + value * key[index], 0) / Math.sqrt(query.length));
  const peak = Math.max(...scores);
  const weights = scores.map((score) => Math.exp(score - peak));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const width = values[0].length;
  return Array.from({ length: width }, (_, column) => weights.reduce((sum, weight, row) => sum + (weight / total) * values[row][column], 0));
}

export function trainAttention(query: number[], keys: number[][], values: number[][], target: number[], steps: number, rate: number): { loss: number; query: number[] } {
  const current = query.slice();
  const lossOf = (point: number[]) => {
    const output = attention(point, keys, values);
    return output.reduce((sum, value, index) => sum + (value - target[index]) ** 2, 0) / output.length;
  };
  let loss = lossOf(current);
  for (let step = 0; step < steps; step += 1) {
    const gradients = current.map((_, index) => {
      const shifted = current.slice();
      shifted[index] += 1e-4;
      return (lossOf(shifted) - loss) / 1e-4;
    });
    for (let index = 0; index < current.length; index += 1) current[index] -= rate * gradients[index];
    loss = lossOf(current);
  }
  return { loss, query: current };
}
