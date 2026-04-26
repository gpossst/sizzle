import { useEffect, useState } from 'react'

type SessionData = {
  user: {
    id: string
    email?: string
    name?: string
    image?: string
  }
  entitlement: {
    planTier: 'free' | 'paid'
    tokensRemaining: number
  }
}

export function useSession() {
  const [data, setData] = useState<SessionData | null>(null)
  const [isPending, setIsPending] = useState(true)

  useEffect(() => {
    let isMounted = true
    const run = async () => {
      try {
        const response = await fetch('/api/session', { credentials: 'include' })
        const json = (await response.json()) as { session: SessionData | null }
        if (isMounted) {
          setData(json.session)
        }
      } catch {
        if (isMounted) {
          setData(null)
        }
      } finally {
        if (isMounted) {
          setIsPending(false)
        }
      }
    }
    void run()
    return () => {
      isMounted = false
    }
  }, [])

  return { data, isPending }
}
