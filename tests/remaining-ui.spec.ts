import { test, expect } from "@playwright/test";
import { expectApplicationFrame } from "./presentation";
import { seedWorkspace } from "../features/workspace/state";

test("all new demo state keeps backend IDs empty", () => {
  function check(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(check);
      return;
    }
    if (value && typeof value === "object")
      for (const [key, field] of Object.entries(value)) {
        if (key === "id" || key.endsWith("Id")) expect(field, key).toBe("");
        else check(field);
      }
  }
  check(seedWorkspace());
});

async function login(page: import("@playwright/test").Page, account = "alya") {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption(account);
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
}

test("notifications can be read and preferences save without granting roles", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Notifikasi", exact: true })
    .click();
  await page.getByRole("tab", { name: "Belum dibaca", exact: true }).click();
  await page.getByRole("button", { name: "Tandai semua dibaca" }).click();
  await expect(
    page.getByRole("heading", { name: "Semua sudah terbaca" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Pengaturan", exact: true })
    .click();
  await page
    .locator(".settings-section > summary")
    .filter({ hasText: "Notifikasi" })
    .click();
  await page.getByRole("checkbox", { name: "Interaksi sosial" }).uncheck();
  await page.getByRole("button", { name: "Simpan preferensi" }).click();
  await expect(page.getByRole("status")).toContainText("Preferensi notifikasi");
  await page
    .getByRole("link", { name: "Verifikasi instansi", exact: false })
    .click();
  await page.getByLabel("Nama instansi").fill("Instansi Contoh");
  await page.getByLabel("Wilayah layanan").fill("Jawa Barat");
  await page.getByLabel("Tanggung jawab").fill("Layanan lingkungan");
  await page.getByLabel("Email / kanal resmi").fill("https://example.com");
  await page.getByRole("button", { name: "Kirim pengajuan demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Pengajuan tersimpan di demo" }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", { name: "Laporan Instansi" }),
  ).toHaveCount(0);
});

test("messaging sends only local text and mobile back restores conversation list", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Obrolan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Obrolan", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pesan baru", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Cari penerima").fill("PUPR");
  await dialog.getByRole("button", { name: /Dinas PUPR Bandung/ }).click();
  await page
    .getByRole("textbox", { name: "Tulis pesan" })
    .fill("Pesan contoh dari pengujian.");
  await page.getByRole("button", { name: "Kirim pesan" }).click();
  await expect(page.locator(".message-history")).toContainText(
    "Pesan contoh dari pengujian.",
  );
  await page.screenshot({ path: "test-results/conversation-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/conversation-mobile.png" });
  await page
    .getByRole("link", { name: "Kembali ke daftar percakapan" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Obrolan", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".conversation-list:visible")).toContainText(
    "Pesan contoh dari pengujian.",
  );
});

test("agency inbox is restricted to tagged reports and takedown is not closure", async ({
  page,
}) => {
  await login(page, "pupr");
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Laporan Instansi", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Laporan Instansi", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main").locator(".post-card")).toHaveCount(2);
  await page.getByRole("tab", { name: "Closed", exact: true }).click();
  await expect(page.getByRole("main").locator(".post-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Keluar demo" }).click();
  await expect(
    page.getByRole("button", { name: "Masuk ke demo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  const own = page.locator(".post-card").nth(1);
  await own.locator(".post-menu > summary").click();
  await own.getByRole("button", { name: "Turunkan postingan" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Turunkan postingan", exact: true })
    .click();
  await expect(page.getByRole("main").locator(".post-card")).toHaveCount(4);
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Timeline Kinerja", exact: true })
    .click();
  await expect(page.getByRole("main").locator(".post-card")).toHaveCount(2);
});

test("signup and recovery are standalone demos without API requests", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      requests.push(request.url());
  });
  await page.goto("/signup");
  await page.getByLabel("Nama tampilan").fill("Warga Contoh");
  await page.getByLabel("Username", { exact: true }).fill("wargacontoh");
  await page.getByLabel("Email", { exact: true }).fill("contoh@example.com");
  await page
    .getByLabel("Kata sandi", { exact: false })
    .first()
    .fill("demo-password-123");
  await page.getByRole("button", { name: "Daftar akun demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
  await page.goto("/recovery");
  await page.getByLabel("Email", { exact: true }).fill("contoh@example.com");
  await page.getByRole("button", { name: "Lanjutkan", exact: true }).click();
  await page.getByRole("button", { name: "Pratinjau kata sandi baru" }).click();
  await page.getByLabel("Kata sandi baru").fill("demo-password-123");
  await page.getByLabel("Ulangi kata sandi").fill("demo-password-123");
  await page.getByRole("button", { name: "Simpan pada simulasi" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Kata sandi akun sebenarnya tidak diubah",
  );
  expect(requests).toEqual([]);
});

for (const item of [
  { route: "notifications", name: "Notifikasi", account: "alya" },
  { route: "settings", name: "Pengaturan", account: "alya" },
  { route: "messages", name: "Obrolan", account: "alya" },
  { route: "agency", name: "Laporan Instansi", account: "pupr" },
  { route: "verification", name: "Verifikasi instansi", account: "alya" },
  { route: "activity", name: "Riwayat aktivitas pribadi", account: "alya" },
])
  test(`${item.route} fits all breakpoints and themes`, async ({ page }) => {
    await login(page, item.account);
    if (item.route === "verification" || item.route === "activity") {
      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: "Pengaturan", exact: true })
        .click();
      await page.getByRole("link", { name: item.name, exact: false }).click();
    } else
      await page
        .getByRole("navigation", { name: "Navigasi utama" })
        .getByRole("link", { name: item.name, exact: true })
        .click();
    await expect(page).toHaveURL(new RegExp(`/${item.route}$`));
    await expect(page.getByRole("heading").first()).toBeVisible();
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
        await expectApplicationFrame(
          page,
          item.route === "notifications"
            ? ".list-toolbar"
            : item.route === "activity" || item.route === "agency"
              ? ".content-toolbar"
              : undefined,
        );
        await page.screenshot({
          path: `test-results/${item.route}-${width}-${theme}.png`,
        });
        if (theme === "dark")
          await page.getByRole("button", { name: "Ganti tema" }).click();
      }
    }
  });

for (const route of ["login", "signup", "recovery", "help"])
  test(`public ${route} fits responsive themes`, async ({ page }) => {
    await page.goto(`/${route}`);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1040 });
      for (const theme of ["light", "dark"]) {
        if (theme === "dark")
          await page.getByRole("button", { name: "Ganti tema" }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await page.screenshot({
          path: `test-results/public-${route}-${width}-${theme}.png`,
        });
        if (theme === "dark")
          await page.getByRole("button", { name: "Ganti tema" }).click();
      }
    }
  });

test("photo evidence can start a validation without a text argument", async ({
  page,
}) => {
  await login(page, "pupr");
  await page.locator('a[href="/posts/contoh-failed"]').first().click();
  await page.getByLabel("Foto bukti penyelesaian").setInputFiles({
    name: "bukti.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEq0AAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Ajukan penyelesaian" }).click();
  await expect(
    page
      .locator(".resolution-card")
      .last()
      .getByRole("img", { name: "Bukti penyelesaian 1" }),
  ).toBeVisible();
  await expect(page.locator(".resolution-card").last()).toContainText(
    "Validasi sedang berlangsung",
  );
});
