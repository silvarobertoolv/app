import { test, expect } from "@playwright/test";
test("joga, come, pausa, encerra e mantém o recorde", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Oi, vamos brincar?" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await page.getByRole("button", { name: "Desligar som" }).click();
  await expect(page.getByRole("button", { name: "Ligar som" })).toBeVisible();
  await page.getByRole("button", { name: "Vamos jogar!" }).click();
  await expect(page.getByLabel("Jardim do jogo. 1 frutinhas.")).toBeVisible();
  await page.getByRole("button", { name: "Pausar jogo" }).click();
  await expect(
    page.getByRole("heading", { name: "Uma pausinha!" }),
  ).toBeVisible();
  await page.waitForTimeout(500);
  await expect(
    page.getByRole("heading", { name: "Uma pausinha!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "▶ Continuar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Boa aventura!" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Ligar som" })).toBeVisible();
  await expect(page.getByText("01", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("controles por toque, ajuda e layout de iPhone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("radio", { name: /Aventureiro/ }).click();
  await page.getByRole("button", { name: "Vamos jogar!" }).click();
  await page.getByRole("button", { name: "Ir para cima" }).click();
  await page.getByRole("button", { name: "Pausar jogo" }).click();
  await page.getByRole("button", { name: /Como jogar/ }).click();
  await expect(page.getByText("Vamos conhecer a Lili?")).toBeVisible();
  await page.getByRole("button", { name: "Entendi, vamos lá!" }).click();
  await expect(page.getByText("Vamos conhecer a Lili?")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "Uma pausinha!" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: "/tmp/cobrinha-iphone.png", fullPage: true });
});
