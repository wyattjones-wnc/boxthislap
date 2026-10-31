// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  NotificationTestButton,
  NotificationTestSetting,
} from "./NotificationTests";
const state = vi.hoisted(() => ({
  session: { isAdmin: true },
  isOnline: true,
}));
vi.mock("../../app/providers", () => ({ useAppState: () => state }));
beforeEach(() => {
  localStorage.clear();
  state.session.isAdmin = true;
  state.isOnline = true;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("only admins can reveal test buttons using the device setting", () => {
  state.session.isAdmin = false;
  const view = render(
    <>
      <NotificationTestSetting />
      <NotificationTestButton topic="footy" label="Footy" />
    </>,
  );
  expect(screen.queryByRole("checkbox")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
  state.session.isAdmin = true;
  view.rerender(
    <>
      <NotificationTestSetting />
      <NotificationTestButton topic="footy" label="Footy" />
    </>,
  );
  expect(screen.queryByRole("button")).toBeNull();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(
    screen.getByRole("button", { name: "Test Footy notification" }),
  ).not.toBeNull();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.queryByRole("button")).toBeNull();
});
it("sends an authenticated push test for this device and topic", async () => {
  localStorage.setItem("boxThisLapNotificationTests", "true");
  vi.stubGlobal("Notification", { permission: "granted" });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistration: async () => ({
        pushManager: {
          getSubscription: async () => ({
            endpoint: "https://push.test/device",
          }),
        },
      }),
    },
  });
  window.boxThisLapGetManagerAccessToken = async () => "access-token";
  const fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ accepted: true }) });
  vi.stubGlobal("fetch", fetch);
  render(<NotificationTestButton topic="formula-one" label="Formula 1" />);
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "Test push accepted",
    ),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    endpoint: "https://push.test/device",
    topic: "formula-one",
  });
  expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
    "Bearer access-token",
  );
});
