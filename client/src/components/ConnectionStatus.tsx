import { CONNECTION_EVENTS, CONNECTION_RETRY_SECONDS, connectionPreviewFromSearch, connectionStatusLabel, connectionTroubleshootingSteps, initialConnectionSnapshot, transitionConnection } from "@shared/connection";
import { AlertTriangle, CheckCircle2, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

function browserIsOnline() {
  return typeof navigator === "undefined" || navigator.onLine;
}

function requestReconnect() {
  window.dispatchEvent(new Event(CONNECTION_EVENTS.retryRequested));
}

export default function ConnectionStatus() {
  const preview = connectionPreviewFromSearch(typeof window === "undefined" ? "" : window.location.search, import.meta.env.DEV);
  const [connection, setConnection] = useState(() => preview ?? initialConnectionSnapshot(browserIsOnline() ? "active" : "disconnected"));
  const attemptedRequest = useRef(0);
  const applyEvent = useCallback((event: "failed" | "offline" | "online" | "manual_retry" | "restored" | "tick") => {
    setConnection(current => transitionConnection(current, event));
  }, []);

  useEffect(() => {
    if (preview) return;
    const handleOffline = () => applyEvent("offline");
    const handleOnline = () => applyEvent("online");
    const handleFailure = () => applyEvent("failed");
    const handleRestored = () => applyEvent("restored");

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener(CONNECTION_EVENTS.failed, handleFailure);
    window.addEventListener(CONNECTION_EVENTS.restored, handleRestored);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(CONNECTION_EVENTS.failed, handleFailure);
      window.removeEventListener(CONNECTION_EVENTS.restored, handleRestored);
    };
  }, [applyEvent, preview]);

  useEffect(() => {
    if (preview || connection.state !== "reconnecting") return;
    const timer = window.setTimeout(() => applyEvent("tick"), 1000);
    return () => window.clearTimeout(timer);
  }, [applyEvent, connection, preview]);

  useEffect(() => {
    if (preview) return;
    if (connection.state !== "reconnecting" || connection.attemptsStarted === 0 || attemptedRequest.current === connection.attemptsStarted) return;
    attemptedRequest.current = connection.attemptsStarted;
    requestReconnect();
  }, [connection, preview]);

  useEffect(() => {
    if (connection.state !== "reconnecting") attemptedRequest.current = 0;
  }, [connection.state]);

  const label = connectionStatusLabel(connection);
  const retryNow = () => applyEvent(browserIsOnline() ? "manual_retry" : "offline");

  if (connection.state === "active") {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[#cfe6ac] bg-[#f4faeb]/95 px-3 py-2 text-xs font-semibold text-[#486229] shadow-lg shadow-[#23351e]/10 backdrop-blur" role="status" aria-live="polite">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </div>
    );
  }

  const reconnecting = connection.state === "reconnecting";
  return (
    <aside className="fixed bottom-4 right-4 z-50 w-[min(25rem,calc(100vw-2rem))] rounded-[1.35rem] border border-[#e7c5bb] bg-[#fffaf8]/95 p-4 text-[#2b2925] shadow-2xl shadow-[#4e211a]/15 backdrop-blur" role="alert" aria-live="assertive">
      <div className="flex items-start gap-3">
        <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${reconnecting ? "bg-[#fff0cf] text-[#875c12]" : "bg-[#ffe5df] text-[#a44332]"}`}>
          {reconnecting ? <Wifi className="h-4.5 w-4.5" aria-hidden="true" /> : <WifiOff className="h-4.5 w-4.5" aria-hidden="true" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">{reconnecting ? "Restoring your connection" : "ROOT is temporarily disconnected"}</p>
          <p className="mt-1 text-xs leading-5 text-[#665e56]">
            {reconnecting
              ? `ROOT will retry automatically. ${connectionStatusLabel(connection)}.`
              : "ROOT cannot reach the service right now. Your work is only saved after ROOT confirms it."}
          </p>
        </div>
      </div>

      {!reconnecting && (
        <div className="mt-4 rounded-xl border border-[#edd7d0] bg-white/70 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold"><AlertTriangle className="h-3.5 w-3.5 text-[#a44332]" aria-hidden="true" />Try this safely</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-[11px] leading-4 text-[#6b625c]">
            {connectionTroubleshootingSteps().map(step => <li key={step}>{step}</li>)}
          </ol>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-[#766b63]">{label}</span>
        <Button type="button" size="sm" onClick={retryNow} className="h-8 rounded-lg bg-[#18211c] px-3 text-xs text-white hover:bg-[#2a382c]">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />Retry now
        </Button>
      </div>
    </aside>
  );
}
