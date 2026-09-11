import { expect, test, type Locator } from "@playwright/test";

const distanceTo = async (fly: Locator, target: Locator) => {
  const [flyX, flyY, targetBox] = await Promise.all([
    fly.getAttribute("data-fly-x"),
    fly.getAttribute("data-fly-y"),
    target.boundingBox(),
  ]);
  if (!flyX || !flyY || !targetBox) return Number.POSITIVE_INFINITY;

  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;
  return Math.hypot(Number(flyX) - targetX, Number(flyY) - targetY);
};

test("fly reacts without triggering order actions", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  const fly = page.getByTestId("fly");
  await expect(fly).toBeAttached();
  await expect(fly).toHaveAttribute("data-fly-x", /.+/);

  await page.getByRole("button", { name: "Bullish", exact: true }).click();
  await expect(fly).toHaveAttribute("data-fly-state", "approach_buy");
  await expect
    .poll(() => distanceTo(fly, page.getByRole("button", { name: "BUY" })))
    .toBeLessThan(90);

  await page.getByRole("button", { name: "Bearish", exact: true }).click();
  await expect(fly).toHaveAttribute("data-fly-state", "approach_sell");
  await expect
    .poll(() => distanceTo(fly, page.getByRole("button", { name: "SELL" })))
    .toBeLessThan(90);

  await page.getByRole("button", { name: "Volatile", exact: true }).click();
  await expect(fly).toHaveAttribute("data-fly-state", "panic");

  await expect(page.getByTestId("order-click-count")).toContainText(
    "BUY 0 / SELL 0",
  );
  expect(consoleErrors).toEqual([]);
});
