let counter = 0;

export const getNextTick = (): number => ++counter;
export const currentTick = (): number => counter;
export const tickLamport = getNextTick;
