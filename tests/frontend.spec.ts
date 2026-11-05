import { test, expect } from "@playwright/test";
import { resolutionResult, photoError } from "../lib/validation";
import type { Resolution } from "../types/models";
import { people, seedPosts } from "../mocks/data";

test("validation boundary and media limits", () => {
  const base: Resolution = {
    id: "",
    localKey: "test",
    agencyKey: "pupr",
    content: "Evidence",
    images: [],
    deadline: 1000,
    agree: 8,
    disagree: 2,
    choice: null,
  };
  expect(resolutionResult(base, 999)).toBe("active");
  expect(resolutionResult(base, 1000)).toBe("success");
  expect(resolutionResult({ ...base, agree: 7, disagree: 3 }, 1000)).toBe(
    "failed",
  );
  expect(resolutionResult({ ...base, agree: 0, disagree: 0 }, 1000)).toBe(
    "automatic",
  );
  expect(
    photoError([new File(["x"], "x.txt", { type: "text/plain" })], 0),
  ).toContain("JPG");
  expect(photoError([], 7)).toContain("6");
});

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Beranda", exact: true }),
  ).toBeVisible();
});

test("composer draft, required fields, anonymity and refresh reset", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Post", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Laporan", exact: true }).click();
  await dialog
    .getByLabel("Deskripsi masalah")
    .fill("Jalan lingkungan perlu perbaikan.");
  await dialog.getByRole("button", { name: "Publikasikan" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "minimal satu instansi",
  );
  await page.keyboard.press("Escape");
  await dialog.getByRole("button", { name: "Lanjut menulis" }).click();
  await expect(dialog.getByLabel("Deskripsi masalah")).toHaveValue(
    "Jalan lingkungan perlu perbaikan.",
  );
  await dialog.getByRole("checkbox", { name: /Dinas PUPR Bandung/ }).check();
  await dialog
    .getByLabel("Wilayah", { exact: false })
    .fill("Bandung, Jawa Barat");
  await dialog.getByLabel("Kategori").selectOption("Infrastruktur");
  await dialog.getByLabel("Sembunyikan identitas saya").check();
  await dialog.getByRole("button", { name: "Publikasikan" }).click();
  const card = page.locator(".post-card").first();
  await expect(card).toContainText("Jalan lingkungan perlu perbaikan.");
  await expect(card).toContainText("Anonim");
  await expect(card).not.toContainText("alyaputri");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Masuk ke demo" }),
  ).toBeVisible();
});

test("change votes, nested replies and discussion after closure", async ({
  page,
}) => {
  await page.locator('a[href="/posts/trotoar-merdeka#evidence"]').click();
  await expect(page.locator("#evidence")).not.toContainText("85% setuju");
  await page.getByRole("button", { name: "Setuju", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Setuju", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Belum selesai", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Belum selesai", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByLabel("Tambahkan komentar")
    .fill("Terima kasih, aksesnya akan saya cek.");
  await page.getByRole("button", { name: "Kirim", exact: true }).click();
  await expect(page.locator(".comments")).toContainText(
    "Terima kasih, aksesnya akan saya cek.",
  );
  for (let level = 0; level < 4; level++) {
    await page
      .getByRole("button", { name: "Balas", exact: true })
      .last()
      .click();
    await page
      .getByRole("textbox", { name: "Tulis balasan" })
      .fill(`Balasan tingkat ${level}`);
    await page.getByRole("button", { name: "Kirim", exact: true }).click();
  }
  await page.getByRole("link", { name: "Lanjutkan percakapan" }).click();
  await expect(
    page.getByRole("heading", { name: "Cabang percakapan", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Kembali ke postingan" }).click();
  await page.getByRole("link", { name: "Kembali ke beranda" }).click();
  await page.locator('a[href="/posts/contoh-success"]').first().click();
  await expect(
    page.getByRole("textbox", { name: "Tambahkan komentar" }),
  ).toBeEnabled();
});

test("agency resubmission keeps history and one active submission", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Keluar demo" }).click();
  await page.getByRole("combobox").selectOption("pupr");
  await page.getByRole("button", { name: "Masuk ke demo" }).click();
  await page.locator('a[href="/posts/contoh-failed"]').first().click();
  await page
    .getByLabel("Argumen penyelesaian")
    .fill(
      "Perbaikan lanjutan dilaksanakan unit jalan hari ini; akses telah diratakan.",
    );
  await page.getByRole("button", { name: "Ajukan penyelesaian" }).click();
  await expect(page.locator(".resolution-card")).toHaveCount(2);
  await expect(
    page.getByRole("button", { name: "Ajukan penyelesaian" }),
  ).toHaveCount(0);
  await expect(page.locator(".resolution-card").last()).toContainText(
    "Validasi sedang berlangsung",
  );
});

test("responsive themes and screenshot review", async ({ page }) => {
  for (const width of [1920, 1440, 1251, 834, 390, 320]) {
    await page.setViewportSize({ width, height: 1040 });
    if (width >= 1251) {
      const sidebar = await page.locator(".sidebar").boundingBox();
      const support = await page.locator(".support-column").boundingBox();
      const feed = await page.locator(".reading-column").boundingBox();
      expect(sidebar!.x).toBe(24);
      expect(width - support!.x - support!.width).toBeCloseTo(24);
      expect(feed!.width).toBe(656);
      expect(feed!.x + feed!.width / 2).toBeCloseTo(width / 2);
      expect(sidebar!.x + sidebar!.width).toBeLessThan(feed!.x);
      expect(support!.x).toBeGreaterThan(feed!.x + feed!.width);
    }
    for (const theme of ["light", "dark"]) {
      if (theme === "dark")
        await page.getByRole("button", { name: "Ganti tema" }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const presentation = await page.locator(".home-feed").evaluate((feed) => {
        const card = feed.querySelector(".post-card")!;
        const name = card
          .querySelector(".post-meta > div")!
          .getBoundingClientRect();
        const content = card
          .querySelector(".post-content")!
          .getBoundingClientRect();
        const actions = card
          .querySelector(".post-actions")!
          .getBoundingClientRect();
        const frame = getComputedStyle(
          feed.closest(".reading-column")!,
          "::before",
        );
        const composer = getComputedStyle(
          feed.querySelector(".compact-composer")!,
        );
        return {
          nameX: name.x,
          contentX: content.x,
          actionsX: actions.x,
          background: getComputedStyle(feed).backgroundColor,
          canvas: getComputedStyle(feed.closest(".product")!).backgroundColor,
          framePosition: frame.position,
          frameLeft: parseFloat(frame.left),
          frameWidth: parseFloat(frame.width),
          feedLeft: feed.getBoundingClientRect().left,
          feedWidth: feed.getBoundingClientRect().width,
          composerDivider: composer.borderBottomWidth,
        };
      });
      expect(presentation.contentX).toBeCloseTo(presentation.nameX);
      expect(presentation.actionsX).toBeCloseTo(presentation.contentX);
      expect(presentation.background).toBe(presentation.canvas);
      expect(presentation.framePosition).toBe("fixed");
      expect(presentation.frameLeft).toBeCloseTo(presentation.feedLeft);
      expect(presentation.frameWidth).toBeCloseTo(presentation.feedWidth);
      expect(presentation.composerDivider).toBe("1px");
      await page.screenshot({
        path: `test-results/home-${width}-${theme}.png`,
      });
      if (theme === "dark")
        await page.getByRole("button", { name: "Ganti tema" }).click();
    }
  }
});

test("home frame stays fixed while posts scroll", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Ganti tema" }).click();
  const card = page.locator(".post-card").first();
  const before = await card.boundingBox();
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 360);
  });
  await expect
    .poll(async () => (await card.boundingBox())!.y)
    .toBeLessThan(before!.y - 300);
  expect((await page.locator(".page-header").boundingBox())!.y).toBe(0);
  expect(
    await page
      .locator(".home-feed")
      .evaluate(
        (feed) =>
          getComputedStyle(feed.closest(".reading-column")!, "::before").top,
      ),
  ).toBe("80px");
  await page.screenshot({ path: "test-results/home-frame-scrolled.png" });
});

test("comment connectors join avatars and stop at the last sibling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1040 });
  await page.locator('a[href="/posts/trotoar-merdeka"]').first().click();
  const root = page.locator(".comments > .comment").first();
  const sendReply = async (
    comment: import("@playwright/test").Locator,
    text: string,
  ) => {
    await comment
      .locator("> .comment-body")
      .getByRole("button", { name: "Balas", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Tulis balasan" }).fill(text);
    await page.getByRole("button", { name: "Kirim", exact: true }).click();
  };
  await sendReply(root, "Balasan pertama.");
  const first = root.locator("> .comment-children > .comment").first();
  await sendReply(
    first,
    "Balasan bertingkat dengan uraian panjang. ".repeat(8),
  );
  await sendReply(root, "Balasan kedua pada induk yang sama.");
  const children = root.locator("> .comment-children > .comment");
  await expect(children).toHaveCount(2);
  const geometry = await root.evaluate((element) => {
    const body = element.querySelector(":scope > .comment-body")!;
    const avatar = body.querySelector(".avatar")!.getBoundingClientRect();
    const child = element.querySelector(
      ":scope > .comment-children > .comment:last-child",
    )!;
    const childBox = child.getBoundingClientRect();
    const childAvatar = child.querySelector(".avatar")!.getBoundingClientRect();
    const rail = getComputedStyle(child, "::before");
    const elbow = getComputedStyle(child, "::after");
    const outgoing = getComputedStyle(body, "::before");
    return {
      outgoingTop: body.getBoundingClientRect().top + parseFloat(outgoing.top),
      avatarBottom: avatar.bottom,
      railX: childBox.left + parseFloat(rail.left),
      parentCenterX: avatar.left + avatar.width / 2,
      elbowBottom:
        childBox.top + parseFloat(elbow.top) + parseFloat(elbow.height),
      childCenterY: childAvatar.top + childAvatar.height / 2,
    };
  });
  expect(geometry.outgoingTop).toBeCloseTo(geometry.avatarBottom);
  expect(geometry.railX).toBeCloseTo(geometry.parentCenterX);
  expect(geometry.elbowBottom).toBeCloseTo(geometry.childCenterY);
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
      await page
        .locator(".comments")
        .screenshot({ path: `test-results/thread-${width}-${theme}.png` });
      if (theme === "dark")
        await page.getByRole("button", { name: "Ganti tema" }).click();
    }
  }
  await root
    .locator("> .comment-body")
    .getByRole("button", { name: "Lipat balasan" })
    .click();
  await expect(root).not.toHaveClass(/comment--connected/);
  await expect(children).toHaveCount(0);
  await root
    .locator("> .comment-body")
    .getByRole("button", { name: "Buka balasan" })
    .click();
  await expect(children).toHaveCount(2);
});

test("frontend fixtures leave all backend IDs empty", () => {
  function check(value: unknown) {
    if (Array.isArray(value)) {
      value.forEach(check);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, field] of Object.entries(value)) {
        if (key === "id" || key.endsWith("Id")) expect(field, key).toBe("");
        else check(field);
      }
    }
  }
  check(people);
  check(seedPosts());
});
