import { test, expect } from "@playwright/test";
test.skip(
  !process.env.LFG_E2E_DATABASE_URL,
  "Set a disposable local LFG_E2E_DATABASE_URL to run authenticated realtime browser tests.",
);
async function player(browser, request, index, mobile = false) {
  const fixture = await (
    await request.get(`http://127.0.0.1:3219/__fixture/${index}`)
  ).json();
  const context = await browser.newContext({
    permissions: ["microphone"],
    ...(mobile
      ? {
          viewport: { width: 390, height: 844 },
          isMobile: true,
          hasTouch: true,
        }
      : {}),
  });
  await context.addCookies([
    {
      name: "session",
      value: fixture.cookie,
      url: "http://127.0.0.1:5179",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    window.micCalls = 0;
    const original = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices,
    );
    navigator.mediaDevices.getUserMedia = (...args) => {
      window.micCalls++;
      return original(...args);
    };
  });
  await page.goto(`/lobby/${fixture.lobbyId}`);
  await expect(
    page.getByRole("heading", { name: "Browser test squad" }),
  ).toBeVisible();
  return { page, context, errors };
}
test("same-origin sessions work with third-party cookies blocked; mobile chat, ready, credentials, and opt-in voice work", async ({
  browser,
  request,
}, info) => {
  const host = await player(browser, request, 0),
    member = await player(browser, request, 1, true);
  try {
    expect(await host.page.evaluate(() => window.micCalls)).toBe(0);
    expect(await member.page.evaluate(() => window.micCalls)).toBe(0);
    await host.page.getByLabel("Game credentials").fill("room-123");
    await host.page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(member.page.getByLabel("Game credentials")).toHaveValue(
      "room-123",
    );
    await member.page.getByLabel("Lobby message").fill("Hello from mobile");
    await member.page.getByLabel("Send message").click();
    await expect(
      host.page.getByText("Hello from mobile", { exact: true }),
    ).toBeVisible();
    await member.page
      .getByRole("button", { name: "Ready up", exact: true })
      .click();
    await expect(
      member.page.getByRole("button", { name: "Cancel ready" }),
    ).toBeVisible();
    expect(
      await member.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await host.page
      .getByRole("button", { name: "Join voice", exact: true })
      .click();
    await member.page
      .getByRole("button", { name: "Join voice", exact: true })
      .click();
    await expect(
      host.page.getByRole("button", { name: "Leave voice" }),
    ).toBeVisible();
    await expect(
      member.page.getByRole("button", { name: "Leave voice" }),
    ).toBeVisible();
    await expect.poll(() => host.page.locator("audio").count()).toBe(1);
    await expect.poll(() => member.page.locator("audio").count()).toBe(1);
    await host.page.getByRole("button", { name: "Mute microphone" }).click();
    await expect(
      host.page.getByRole("button", { name: "Unmute microphone" }),
    ).toBeVisible();
    await member.page.screenshot({
      path: info.outputPath("lobby-mobile.png"),
      fullPage: true,
    });
    await member.page.getByRole("button", { name: "Leave voice" }).click();
    await expect(
      member.page.getByRole("button", { name: "Join voice", exact: true }),
    ).toBeVisible();
    await member.context.setOffline(true);
    await expect(
      member.page
        .getByRole("status")
        .filter({ hasText: "Connection interrupted" }),
    ).toBeVisible();
    await member.context.setOffline(false);
    await expect(member.page.getByLabel("Lobby message")).toBeEnabled();
    expect(host.errors).toEqual([]);
    expect(member.errors).toEqual([]);
  } finally {
    await member.context.close();
    await host.context.close();
  }
});
test("denied microphone leaves text usable and hosting retains its selected IGDB game", async ({
  browser,
  request,
}) => {
  const member = await player(browser, request, 2);
  try {
    await member.page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("Denied", "NotAllowedError"));
    });
    await member.page
      .getByRole("button", { name: "Join voice", exact: true })
      .click();
    await expect(member.page.getByRole("status")).toContainText(
      "Microphone permission was denied",
    );
    await expect(member.page.getByLabel("Lobby message")).toBeEnabled();
    await member.page.goto("/host-new-lobby?igdbId=126459");
    await expect(member.page.getByLabel("Choose an online game")).toHaveValue(
      "VALORANT",
    );
    await expect(
      member.page
        .getByLabel("Lobby platform")
        .getByRole("option", { name: "PC", exact: true }),
    ).toHaveCount(1);
    await expect(member.page.getByLabel("Server region")).toBeVisible();
    expect(member.errors).toEqual([]);
  } finally {
    await member.context.close();
  }
});
