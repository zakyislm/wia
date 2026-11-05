import { test, expect } from "@playwright/test";
import { expectApplicationFrame } from "./presentation";
test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Profil", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profil", exact: true }),
  ).toBeVisible();
});
test("edit profile persists across views and cancel keeps original", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Edit profil", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nama tampilan").fill("");
  await dialog.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  await dialog.getByLabel("Nama tampilan").fill("Alya Baru");
  await dialog
    .getByRole("textbox", { name: /^Bio/ })
    .fill("Bio baru di sesi demo");
  await dialog.getByLabel("Wilayah", { exact: true }).fill("Bandung");
  await dialog.getByRole("button", { name: "Simpan perubahan" }).click();
  await expect(
    page.getByRole("heading", { name: "Alya Baru", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profil", exact: true }).click();
  await dialog.getByLabel("Nama tampilan").fill("Draf belum disimpan");
  await page.keyboard.press("Escape");
  await dialog
    .getByRole("button", { name: "Buang perubahan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Alya Baru", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Beranda", exact: true })
    .click();
  await expect(page.locator(".sidebar-account:visible")).toContainText(
    "Alya Baru",
  );
});
test("anonymous reports are owner-only in profile and public profile can be followed", async ({
  page,
}) => {
  await expect(page.locator(".post-card:visible")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Belum ada postingan" }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Laporan", exact: true }).click();
  await expect(page.locator(".post-card:visible")).toHaveCount(4);
  await expect(page.locator(".private-report").first()).toBeVisible();
  await page.getByRole("button", { name: "Keluar demo" }).click();
  await page.getByRole("combobox").selectOption("nadia");
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Jelajah", exact: true })
    .click();
  await page.getByRole("tab", { name: "Akun", exact: true }).click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Alya Putri", exact: true })
    .click();
  await page.getByRole("link", { name: "Lihat profil lengkap" }).click();
  await expect(
    page.getByRole("heading", { name: "Alya Putri", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Laporan", exact: true }).click();
  await expect(page.getByRole("main").locator(".post-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Edit profil", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Ikuti", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Berhenti mengikuti", exact: true }),
  ).toBeVisible();
});
test("profile separates general posts from reports", async ({ page }) => {
  await page
    .getByRole("button", { name: "Buat Postingan", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Ceritamu").fill("Cerita biasa untuk tab postingan.");
  await dialog.getByRole("button", { name: "Publikasikan" }).click();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Profil", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Profil", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".post-card:visible")).toHaveCount(1);
  await expect(page.locator(".post-card:visible")).toContainText(
    "Cerita biasa untuk tab postingan.",
  );
  await page.getByRole("tab", { name: "Laporan", exact: true }).click();
  await expect(page.locator(".post-card:visible")).toHaveCount(4);
  await expect(page.locator(".feed-surface:visible")).not.toContainText(
    "Cerita biasa untuk tab postingan.",
  );
  await page.getByRole("tab", { name: "Postingan", exact: true }).click();
  await expect(page.locator(".post-card:visible")).toHaveCount(1);
});

test("profile fits every breakpoint and both themes", async ({ page }) => {
  for (const width of [1440, 834, 390, 320]) {
    await page.setViewportSize({ width, height: 1040 });
    for (const theme of ["light", "dark"]) {
      if (theme === "dark")
        await page.getByRole("button", { name: "Ganti tema" }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expectApplicationFrame(page, ".profile-tabs");
      await page.screenshot({
        path: `test-results/profile-${width}-${theme}.png`,
      });
      if (theme === "dark")
        await page.getByRole("button", { name: "Ganti tema" }).click();
    }
  }
});
