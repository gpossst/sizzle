import { ConvexProvider } from 'convex/react'
import { ConvexQueryClient } from '@convex-dev/react-query'

function resolveConvexUrl(): string {
  const fromVite = import.meta.env.VITE_CONVEX_URL
  const fromProcess =
    typeof process !== 'undefined' ? process.env.VITE_CONVEX_URL : undefined
  const url =
    (typeof fromVite === 'string' && fromVite.trim() !== ''
      ? fromVite
      : undefined) ??
    (typeof fromProcess === 'string' && fromProcess.trim() !== ''
      ? fromProcess
      : undefined)
  if (!url) {
    throw new Error(
      'Missing VITE_CONVEX_URL. Set it in the runtime environment for SSR, and at build time (or Docker --build-arg) so the browser bundle can connect to Convex.',
    )
  }
  return url
}

const convexQueryClient = new ConvexQueryClient(resolveConvexUrl())

export default function AppConvexProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ConvexProvider client={convexQueryClient.convexClient}>
      {children}
    </ConvexProvider>
  )
}
