import { createFileRoute } from '@tanstack/react-router'
import { useSession } from '#/lib/auth-client'
import BetterAuthHeader from '#/integrations/better-auth/header-user'
import RecipeGenForm from '#/components/RecipeGenForm'
import { useEffect, useState } from 'react'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/')({ component: Home })
type PageView = 'generation' | 'saved' | 'grocery' | 'pricing'

function Home() {
  const { data: session, isPending } = useSession()
  const [pageView, setPageView] = useState<PageView>('generation')
  const [lastContentView, setLastContentView] =
    useState<Exclude<PageView, 'pricing'>>('generation')
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null)
  const [billingBusy, setBillingBusy] = useState<
    'monthly' | 'yearly' | 'portal' | null
  >(null)
  const [groceryAccessMessage, setGroceryAccessMessage] = useState<
    string | null
  >(null)
  const [showGroceryAccessMessage, setShowGroceryAccessMessage] =
    useState(false)

  useEffect(() => {
    if (!groceryAccessMessage) return
    setShowGroceryAccessMessage(true)

    const hideTimer = window.setTimeout(() => {
      setShowGroceryAccessMessage(false)
    }, 5000)

    return () => {
      window.clearTimeout(hideTimer)
    }
  }, [groceryAccessMessage])

  useEffect(() => {
    if (!groceryAccessMessage || showGroceryAccessMessage) return

    const removeTimer = window.setTimeout(() => {
      setGroceryAccessMessage(null)
    }, 300)

    return () => {
      window.clearTimeout(removeTimer)
    }
  }, [groceryAccessMessage, showGroceryAccessMessage])

  if (isPending) {
    return <div className="p-8">Loading session...</div>
  }

  const isGuest = !session?.user
  const isPaid = session?.entitlement.planTier === 'paid'
  const displayedTokens =
    tokensRemaining ?? session?.entitlement.tokensRemaining ?? null
  const pricingHoverLabel = isPaid ? 'PURCHASE' : 'UPGRADE'

  async function startCheckout(plan: 'monthly' | 'yearly') {
    setBillingBusy(plan)
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const payload = (await response.json()) as {
        url?: string
        error?: string
      }
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? 'Could not start checkout')
      }
      window.location.assign(payload.url)
    } catch (error) {
      console.error(error)
      alert(error instanceof Error ? error.message : 'Could not start checkout')
      setBillingBusy(null)
    }
  }

  async function openBillingPortal() {
    setBillingBusy('portal')
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
      })
      const payload = (await response.json()) as {
        url?: string
        error?: string
      }
      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? 'Could not open billing portal')
      }
      window.location.assign(payload.url)
    } catch (error) {
      console.error(error)
      alert(
        error instanceof Error
          ? error.message
          : 'Could not open billing portal',
      )
      setBillingBusy(null)
    }
  }

  function selectPageView(view: Exclude<PageView, 'pricing'>) {
    if (view === 'grocery' && !isPaid) {
      setGroceryAccessMessage('Grocery Lists are for subscribed users only.')
      setShowGroceryAccessMessage(true)
      return
    }
    setGroceryAccessMessage(null)
    setShowGroceryAccessMessage(false)
    setLastContentView(view)
    setPageView(view)
  }

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden">
      <div className="relative z-30 w-10 shrink-0 overflow-visible">
        <BetterAuthHeader
          pageView={pageView === 'pricing' ? lastContentView : pageView}
          onSelectPageView={selectPageView}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex h-10 items-stretch justify-between gap-1 border-b border-border sm:items-center sm:gap-2">
          <div className="flex min-w-0 items-center">
            <h1 className="shrink-0 pl-1.5 text-lg font-heading font-black sm:p-2 sm:text-2xl">
              SIZZLE
            </h1>
          </div>
          <div className="flex min-w-0 flex-1 items-stretch justify-end sm:flex-none sm:gap-2">
            <span className="hidden max-w-[10rem] truncate self-center text-xs font-medium uppercase tracking-wide text-muted-foreground sm:inline-block md:max-w-none">
              {pageView === 'generation'
                ? 'Recipe Generator'
                : pageView === 'saved'
                  ? 'Saved Recipes'
                  : pageView === 'grocery'
                    ? 'Grocery List'
                    : 'Premium'}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="group relative h-full min-h-10 min-w-0 touch-manipulation overflow-hidden rounded-none border-none bg-secondary px-2.5 text-sm! font-heading font-bold text-secondary-foreground sm:px-4 sm:text-xl!"
              onClick={() => setPageView('pricing')}
            >
              <span
                aria-hidden
                className="absolute inset-0 z-0 origin-left scale-x-0 bg-primary transition-transform duration-300 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100"
              />
              <span className="relative z-10 flex items-center justify-center overflow-hidden whitespace-nowrap">
                <span className="transition-all duration-200 group-hover:-translate-y-full group-hover:opacity-0 group-focus-visible:-translate-y-full group-focus-visible:opacity-0">
                  {displayedTokens ?? '—'} Tokens
                </span>
                <span className="absolute inset-0 flex items-center justify-center gap-[0.02em] text-secondary-foreground">
                  {pricingHoverLabel.split('').map((char, index) => (
                    <span
                      key={`${char}-${index}`}
                      className="translate-y-full opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                      style={{ transitionDelay: `${index * 25}ms` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
              </span>
            </Button>
          </div>
        </div>
        {groceryAccessMessage ? (
          <div className="overflow-hidden border-b border-border">
            <div
              className={`bg-hazard px-3 py-2 text-sm text-foreground transition-[max-height] duration-300 ${
                showGroceryAccessMessage ? 'max-h-16' : 'max-h-0'
              }`}
            >
              {groceryAccessMessage}
            </div>
          </div>
        ) : null}
        <RecipeGenForm
          pageView={pageView}
          onTokensRemainingChange={(next) => setTokensRemaining(next)}
          onClosePricing={() => setPageView(lastContentView)}
          isPaid={isPaid}
          isGuest={isGuest}
          billingBusy={billingBusy}
          onStartCheckout={startCheckout}
          onOpenBillingPortal={openBillingPortal}
        />
      </div>
    </div>
  )
}
