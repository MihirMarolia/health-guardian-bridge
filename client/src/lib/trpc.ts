import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

/** React-Query–integrated tRPC client – use inside React components. */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Vanilla (non-React) tRPC client – use outside React components,
 * e.g. in Zustand store actions that need to reach the backend.
 */
export const trpcVanilla = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});
