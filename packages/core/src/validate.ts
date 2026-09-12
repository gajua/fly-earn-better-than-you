export const isValidPrice = (price: number): boolean =>
  Number.isFinite(price) && price > 0;

export const isValidQuantity = (quantity: number): boolean =>
  Number.isFinite(quantity) && quantity > 0;

export const applySlippage = (
  price: number,
  side: "buy" | "sell",
  slippageBps = 0,
): number => {
  const factor = slippageBps / 10_000;
  return side === "buy" ? price * (1 + factor) : price * (1 - factor);
};

export const computeFee = (value: number, feeRate = 0): number =>
  Math.max(0, value * feeRate);
