import { expect, type Page } from "@playwright/test";

export async function expectApplicationFrame(page: Page, divider?: string) {
  const presentation = await page
    .locator(".reading-column:visible")
    .evaluate((column) => {
      const frame = getComputedStyle(column, "::before");
      const header = getComputedStyle(column.querySelector(".page-header")!);
      const surface = column.querySelector(
        ":scope > .feed-surface, .conversation-list",
      )!;
      return {
        position: frame.position,
        left: parseFloat(frame.left),
        width: parseFloat(frame.width),
        columnLeft: column.getBoundingClientRect().left,
        columnWidth: column.getBoundingClientRect().width,
        radius: frame.borderTopLeftRadius,
        expectedRadius:
          innerWidth <= (header.display === "none" ? 700 : 600)
            ? "0px"
            : "24px",
        background: getComputedStyle(surface).backgroundColor,
        canvas: getComputedStyle(column.closest(".product")!).backgroundColor,
        headerBorder: header.borderBottomWidth,
      };
    });
  expect(presentation.position).toBe("fixed");
  expect(presentation.left).toBeCloseTo(presentation.columnLeft);
  expect(presentation.width).toBeCloseTo(presentation.columnWidth);
  expect(presentation.radius).toBe(presentation.expectedRadius);
  expect(presentation.background).toBe(presentation.canvas);
  expect(presentation.headerBorder).toBe("0px");
  if (divider) {
    await expect(page.locator(`${divider}:visible`)).toHaveCSS(
      "border-bottom-width",
      "1px",
    );
  }
}
