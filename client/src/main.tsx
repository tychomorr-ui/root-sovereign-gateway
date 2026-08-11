import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { CONNECTION_EVENTS } from '@shared/connection';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: attempt => Math.min(1000 * (attempt + 1), 5000),
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

const dispatchConnectionEvent = (eventName: string) => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(eventName));
};

const looksLikeConnectionError = (error: unknown) => {
  if (error instanceof TypeError) return true;
  return error instanceof TRPCClientError && !error.data?.httpStatus;
};

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    if (looksLikeConnectionError(error)) dispatchConnectionEvent(CONNECTION_EVENTS.failed);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    if (looksLikeConnectionError(error)) dispatchConnectionEvent(CONNECTION_EVENTS.failed);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        }).then(response => {
          dispatchConnectionEvent(response.status >= 500 ? CONNECTION_EVENTS.failed : CONNECTION_EVENTS.restored);
          return response;
        }).catch(error => {
          dispatchConnectionEvent(CONNECTION_EVENTS.failed);
          throw error;
        });
      },
    }),
  ],
});

if (typeof window !== "undefined") {
  window.addEventListener(CONNECTION_EVENTS.retryRequested, () => {
    void globalThis.fetch("/api/trpc/auth.me?batch=1&input=%7B%7D", { credentials: "include" })
      .then(response => dispatchConnectionEvent(response.status >= 500 ? CONNECTION_EVENTS.failed : CONNECTION_EVENTS.restored))
      .catch(() => dispatchConnectionEvent(CONNECTION_EVENTS.failed));
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
