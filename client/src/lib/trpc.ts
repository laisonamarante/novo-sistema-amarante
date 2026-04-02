import { createTRPCReact } from "@trpc/react-query"
import { httpLink } from "@trpc/client"
import superjson from "superjson"
import type { AppRouter } from "../../../server/routers"

export const trpc = createTRPCReact<AppRouter>()

export function getTrpcClient() {
  return trpc.createClient({
    links: [
      httpLink({
        url: import.meta.env.BASE_URL + "trpc",
        transformer: superjson,
        headers() {
          const token = localStorage.getItem("token")
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
      }),
    ],
  })
}
