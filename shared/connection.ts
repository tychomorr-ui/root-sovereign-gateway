export const CONNECTION_MAX_RETRIES = 3;
export const CONNECTION_RETRY_SECONDS = 5;

export const CONNECTION_EVENTS = {
  failed: "root:connection-failed",
  restored: "root:connection-restored",
  retryRequested: "root:connection-retry-request",
} as const;

export type ConnectionState = "active" | "reconnecting" | "disconnected";

export type ConnectionSnapshot = {
  state: ConnectionState;
  attemptsStarted: number;
  secondsRemaining: number;
};

export type ConnectionEvent = "failed" | "offline" | "online" | "manual_retry" | "restored" | "tick";

export function initialConnectionSnapshot(state: ConnectionState = "active"): ConnectionSnapshot {
  return { state, attemptsStarted: 0, secondsRemaining: CONNECTION_RETRY_SECONDS };
}

export function transitionConnection(snapshot: ConnectionSnapshot, event: ConnectionEvent): ConnectionSnapshot {
  if (event === "restored") return initialConnectionSnapshot("active");
  if (event === "offline") return initialConnectionSnapshot("disconnected");
  if (event === "online" || event === "manual_retry") {
    return { state: "reconnecting", attemptsStarted: 1, secondsRemaining: CONNECTION_RETRY_SECONDS };
  }
  if (event === "failed") {
    return snapshot.state === "reconnecting"
      ? snapshot
      : { state: "reconnecting", attemptsStarted: 0, secondsRemaining: CONNECTION_RETRY_SECONDS };
  }
  if (snapshot.state !== "reconnecting") return snapshot;
  if (snapshot.secondsRemaining > 1) return { ...snapshot, secondsRemaining: snapshot.secondsRemaining - 1 };
  if (!hasReconnectAttemptsRemaining(snapshot.attemptsStarted)) return initialConnectionSnapshot("disconnected");
  return { state: "reconnecting", attemptsStarted: snapshot.attemptsStarted + 1, secondsRemaining: CONNECTION_RETRY_SECONDS };
}

export function connectionPreviewFromSearch(search: string, enabled: boolean) {
  if (!enabled) return undefined;
  const requested = new URLSearchParams(search).get("connection");
  if (requested === "reconnecting") return { state: "reconnecting" as const, attemptsStarted: 1, secondsRemaining: 3 };
  if (requested === "disconnected") return initialConnectionSnapshot("disconnected");
  return undefined;
}

export function connectionStatusLabel(snapshot: ConnectionSnapshot) {
  if (snapshot.state === "active") return "Connection active";
  if (snapshot.state === "reconnecting") {
    const nextAttempt = Math.min(snapshot.attemptsStarted + 1, CONNECTION_MAX_RETRIES);
    return `Reconnecting · attempt ${nextAttempt} of ${CONNECTION_MAX_RETRIES} in ${Math.max(snapshot.secondsRemaining, 0)}s`;
  }
  return "Connection disconnected";
}

export function hasReconnectAttemptsRemaining(attempt: number) {
  return attempt < CONNECTION_MAX_RETRIES;
}

export function connectionTroubleshootingSteps() {
  return [
    "Check that this device has an internet connection.",
    "Keep this page open until the status returns to active before leaving a form.",
    "Try again, then refresh the page if the connection does not return.",
    "If a sign-in screen appears, complete sign-in again to restore the session.",
  ] as const;
}
