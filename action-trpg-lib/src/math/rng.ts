import Prando from "prando";

export class RNG extends Prando {
  sample<T>(
    items: readonly T[],
    lowerBound: number = 0,
    upperBound: number = items.length
  ): T {
    const i = this.nextInt(lowerBound, upperBound - 1);
    return items[i];
  }
}
