import { describe, expect, it } from "vitest";
import { CONNECTION_MAX_RETRIES, CONNECTION_RETRY_SECONDS, connectionPreviewFromSearch, connectionStatusLabel, connectionTroubleshootingSteps, hasReconnectAttemptsRemaining, initialConnectionSnapshot, transitionConnection } from "../shared/connection";

describe("ROOT connection recovery policy", () => {
  it("limits automated reconnect attempts and exposes their countdown", () => {
    expect(CONNECTION_MAX_RETRIES).toBe(3);
    expect(CONNECTION_RETRY_SECONDS).toBe(5);
    expect(hasReconnectAttemptsRemaining(0)).toBe(true);
    expect(hasReconnectAttemptsRemaining(2)).toBe(true);
    expect(hasReconnectAttemptsRemaining(3)).toBe(false);
    expect(connectionStatusLabel({ state: "reconnecting", attemptsStarted: 1, secondsRemaining: 4 })).toBe("Reconnecting · attempt 2 of 3 in 4s");
  });

  it("uses user-safe connection labels and troubleshooting rather than diagnostics", () => {
    expect(connectionStatusLabel(initialConnectionSnapshot("active"))).toBe("Connection active");
    expect(connectionStatusLabel(initialConnectionSnapshot("disconnected"))).toBe("Connection disconnected");
    expect(connectionTroubleshootingSteps()).toEqual([
      "Check that this device has an internet connection.",
      "Keep this page open until the status returns to active before leaving a form.",
      "Try again, then refresh the page if the connection does not return.",
      "If a sign-in screen appears, complete sign-in again to restore the session.",
    ]);
  });

  it("advances from failure through a countdown into exactly three bounded reconnect requests", () => {
    let snapshot = transitionConnection(initialConnectionSnapshot("active"), "failed");
    expect(snapshot).toEqual({ state: "reconnecting", attemptsStarted: 0, secondsRemaining: 5 });

    for (let second = 0; second < CONNECTION_RETRY_SECONDS; second += 1) snapshot = transitionConnection(snapshot, "tick");
    expect(snapshot).toEqual({ state: "reconnecting", attemptsStarted: 1, secondsRemaining: 5 });

    for (let attempt = 2; attempt <= CONNECTION_MAX_RETRIES; attempt += 1) {
      for (let second = 0; second < CONNECTION_RETRY_SECONDS; second += 1) snapshot = transitionConnection(snapshot, "tick");
      expect(snapshot).toEqual({ state: "reconnecting", attemptsStarted: attempt, secondsRemaining: 5 });
      expect(transitionConnection(snapshot, "failed")).toEqual(snapshot);
    }

    for (let second = 0; second < CONNECTION_RETRY_SECONDS; second += 1) snapshot = transitionConnection(snapshot, "tick");
    expect(snapshot).toEqual(initialConnectionSnapshot("disconnected"));
  });

  it("allows manual retry and restoration while keeping developer-only recovery previews deterministic", () => {
    expect(transitionConnection(initialConnectionSnapshot("disconnected"), "manual_retry")).toEqual({ state: "reconnecting", attemptsStarted: 1, secondsRemaining: 5 });
    expect(transitionConnection(initialConnectionSnapshot("reconnecting"), "restored")).toEqual(initialConnectionSnapshot("active"));
    expect(connectionPreviewFromSearch("?connection=reconnecting", true)).toEqual({ state: "reconnecting", attemptsStarted: 1, secondsRemaining: 3 });
    expect(connectionPreviewFromSearch("?connection=disconnected", true)).toEqual(initialConnectionSnapshot("disconnected"));
    expect(connectionPreviewFromSearch("?connection=disconnected", false)).toBeUndefined();
  });
});
