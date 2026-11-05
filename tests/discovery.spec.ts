import { test, expect } from "@playwright/test";
import { expectApplicationFrame } from "./presentation";
import { seedPosts, people } from "../mocks/data";
import {
  closureDate,
  emptyFilters,
  filterPosts,
  jakartaDay,
} from "../features/discovery/filters";

test("closed-only directory, every tagged agency, anonymous search and WIB dates", () => {
  const posts = seedPosts();
  const now = Date.now();
  const closed = filterPosts(posts, people, emptyFilters, true, now);
  expect(closed.map((post) => post.localKey)).toEqual([
    "contoh-success",
    "contoh-zero",
  ]);
  expect(
    filterPosts(
      posts,
      people,
      { ...emptyFilters, agency: ["dishub"] },
      true,
      now,
    ),
  ).toEqual(closed);
  expect(
    filterPosts(
      posts,
      people,
      { ...emptyFilters, query: "Dinas Perhubungan" },
      true,
      now,
    ),
  ).toEqual(closed);
  expect(
    filterPosts(
      posts,
      people,
      { ...emptyFilters, query: "alyaputri" },
      false,
      now,
    ),
  ).toHaveLength(0);
  const date = jakartaDay(closureDate(closed[0], now)!);
  expect(
    filterPosts(
      posts,
      people,
      { ...emptyFilters, from: date, to: date },
      true,
      now,
    ).map((post) => post.localKey),
  ).toEqual(["contoh-success"]);
  expect(jakartaDay(Date.parse("2026-11-05T18:00:00Z"))).toBe("2026-11-06");
  const lowVote = { ...posts[1], upvotesCount: 0 };
  expect(
    filterPosts(
      [lowVote],
      people,
      { ...emptyFilters, query: "trotoar" },
      false,
      now,
    ),
  ).toHaveLength(1);
});

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
});

test("explore applies filters, resets empty results and opens account preview", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Jelajah" })
    .click();
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "Jelajah", exact: true }),
  ).toBeVisible();
  await main.getByRole("searchbox").fill("trotoar");
  await main.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(main.locator(".post-card")).toHaveCount(1);
  await main.locator(".filter-dropdown > summary").click();
  await main
    .getByRole("checkbox", { name: "Dinas Perhubungan", exact: true })
    .check();
  await main.getByRole("button", { name: "Terapkan" }).click();
  await expect(main.locator(".post-card")).toHaveCount(1);
  await main.getByRole("searchbox").fill("tidak-ada-999");
  await main.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(
    main.getByRole("heading", { name: "Tidak ada hasil" }),
  ).toBeVisible();
  await main.getByRole("button", { name: "Reset pencarian" }).click();
  await expect(main.locator(".post-card")).toHaveCount(5);
  await main.getByRole("tab", { name: "Akun", exact: true }).click();
  await main.getByRole("searchbox").fill("PUPR");
  await main.getByRole("button", { name: "Cari", exact: true }).click();
  await expect(main.locator(".account-result")).toHaveCount(1);
  await main
    .getByRole("button", { name: "Dinas PUPR Bandung", exact: false })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("@DinasPUPR");
  await dialog.getByRole("button", { name: "Ikuti akun" }).click();
  await expect(
    dialog.getByRole("button", { name: "Berhenti mengikuti" }),
  ).toBeVisible();
});

test("timeline excludes active and failed reports and preserves original URL", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Timeline Kinerja" })
    .click();
  const main = page.getByRole("main");
  await expect(main.locator(".post-card")).toHaveCount(2);
  await expect(main).toContainText("Tidak ada suara");
  await expect(main).not.toContainText("Laporan tetap terbuka");
  await main.locator(".filter-dropdown > summary").click();
  await main
    .getByRole("checkbox", { name: "Dinas Perhubungan", exact: true })
    .check();
  await main.getByRole("button", { name: "Terapkan" }).click();
  await expect(main.locator(".post-card")).toHaveCount(2);
  await main.locator(".filter-dropdown > summary").click();
  await main.getByLabel("Dari tanggal").fill("2026-11-06");
  await main.getByLabel("Sampai tanggal").fill("2026-11-05");
  await main.getByRole("button", { name: "Terapkan" }).click();
  await expect(main.getByRole("alert")).toContainText("Tanggal awal");
  await main.getByRole("button", { name: "Reset filter", exact: true }).click();
  await main.locator(".post-link").first().click();
  await expect(page).toHaveURL(/\/posts\/contoh-success$/);
});

test("discovery pages fit desktop/tablet/mobile in both themes", async ({
  page,
}) => {
  for (const route of ["/explore", "/timeline"]) {
    await page
      .getByRole("navigation", { name: "Navigasi utama" })
      .getByRole("link", {
        name: route === "/explore" ? "Jelajah" : "Timeline Kinerja",
      })
      .click();
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(
      page.getByRole("heading", {
        name: route === "/explore" ? "Jelajah" : "Timeline Kinerja",
        exact: true,
      }),
    ).toBeVisible();
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
        await expectApplicationFrame(page, ".directory-controls");
        await page.screenshot({
          path: `test-results/${route.slice(1)}-${width}-${theme}.png`,
        });
        if (theme === "dark")
          await page.getByRole("button", { name: "Ganti tema" }).click();
      }
    }
    await page.setViewportSize({ width: 1440, height: 1040 });
  }
});

test("compact filter dropdown supports multiple selections, tokens and dismissal", async ({
  page,
}) => {
  await page
    .getByRole("navigation", { name: "Navigasi utama" })
    .getByRole("link", { name: "Jelajah" })
    .click();
  const main = page.getByRole("main");
  await expect(
    main.getByRole("heading", { name: "Jelajah", exact: true }),
  ).toBeVisible();
  const controls = main.locator(".directory-controls");
  const before = (await controls.boundingBox())!.height;
  expect(before).toBeLessThan(250);
  await main.locator(".filter-dropdown > summary").click();
  const panel = main.getByRole("region", { name: "Filter pencarian" });
  await expect(panel).toBeVisible();
  expect((await controls.boundingBox())!.height).toBeCloseTo(before);
  await panel
    .getByRole("checkbox", { name: "Dinas PUPR Bandung", exact: true })
    .check();
  await panel
    .getByRole("checkbox", { name: "Dinas Perhubungan", exact: true })
    .check();
  await panel.getByRole("button", { name: "Terapkan" }).click();
  await expect(panel).toBeHidden();
  await expect(main.locator(".post-card")).toHaveCount(4);
  await expect(
    main.getByRole("button", { name: "Hapus filter @DinasPUPR", exact: true }),
  ).toBeVisible();
  await expect(
    main.getByRole("button", {
      name: "Hapus filter @DishubBandung",
      exact: true,
    }),
  ).toBeVisible();
  await main
    .getByRole("button", { name: "Hapus filter @DinasPUPR", exact: true })
    .click();
  await expect(main.locator(".post-card")).toHaveCount(4);
  await main.locator(".filter-dropdown > summary").click();
  await panel
    .getByRole("checkbox", { name: "Jawa Barat", exact: true })
    .check();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await main.locator(".filter-dropdown > summary").click();
  await expect(
    panel.getByRole("checkbox", { name: "Jawa Barat", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("heading", { name: "Jelajah", exact: true }).click();
  await expect(panel).toBeHidden();
  await main.getByRole("button", { name: "Hapus semua" }).click();
  await expect(main.locator(".post-card")).toHaveCount(5);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await main.locator(".filter-dropdown > summary").click();
    await expect(panel).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = (await panel.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/filter-open-${width}.png` });
    await page.keyboard.press("Escape");
  }
});
