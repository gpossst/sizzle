import { RiCloseLine } from '@remixicon/react'
import { Button } from '../ui/button'

type PricingPageProps = {
  onClosePricing?: () => void
  isPaid: boolean
  billingBusy: 'monthly' | 'yearly' | 'portal' | null
  onStartCheckout?: (plan: 'monthly' | 'yearly') => void
  onOpenBillingPortal?: () => void
}

export default function PricingPage({
  onClosePricing,
  isPaid,
  billingBusy,
  onStartCheckout,
  onOpenBillingPortal,
}: PricingPageProps) {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col border-t border-border bg-background pb-[env(safe-area-inset-bottom,0px)]">
      <div className="absolute right-0 top-0 z-50 pt-[env(safe-area-inset-top,0px)]">
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="h-11 w-11 touch-manipulation rounded-none border-r-0 border-t-0 p-0 sm:h-10 sm:w-10"
          onClick={onClosePricing}
          aria-label="Close premium pricing"
          title="Close premium pricing"
        >
          <RiCloseLine className="size-5" aria-hidden />
        </Button>
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-0 overflow-y-auto md:grid-cols-2">
        <div className="flex min-h-0 min-w-0 flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="space-y-3 p-3 sm:p-4">
            <h3 className="font-heading text-lg font-black uppercase">Free</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>5 tokens per week</li>
              <li>Save up to 10 recipes</li>
            </ul>
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="mt-auto h-11 min-h-11 w-full shrink-0 touch-manipulation rounded-none border-x-0 border-foreground/30 border-b-0 px-2 text-sm! font-heading font-black uppercase sm:h-10 sm:min-h-10 sm:px-3 sm:text-base!"
            onClick={onClosePricing}
          >
            Stay on Free
          </Button>
        </div>
        <div className="flex min-h-0 min-w-0 flex-col">
          <div className="space-y-3 p-3 sm:p-4">
            <h3 className="font-heading text-lg font-black uppercase">Premium</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>100 tokens per week</li>
              <li>Unlimited saved recipes</li>
            </ul>
          </div>
          {isPaid ? (
            <div className="mt-auto flex min-w-0 flex-col gap-0">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="h-11 min-h-11 w-full shrink-0 touch-manipulation rounded-none border-x-0 border-b-0 px-2 text-sm! font-heading font-black uppercase sm:h-10 sm:min-h-10 sm:px-3 sm:text-base!"
                disabled={billingBusy !== null}
                onClick={onOpenBillingPortal}
              >
                {billingBusy === 'portal'
                  ? 'Opening...'
                  : 'Open billing & subscription'}
              </Button>
              <p className="border-t border-border px-3 py-2 text-center text-xs leading-snug text-muted-foreground sm:px-4">
                Update payment method or cancel your plan.
              </p>
            </div>
          ) : (
            <div className="mt-auto flex min-w-0 flex-col gap-0">
              <Button
                type="button"
                variant="default"
                size="lg"
                className="h-11 min-h-11 w-full shrink-0 touch-manipulation rounded-none border-x-0 border-b-0 px-2 text-sm! font-heading font-black uppercase sm:h-10 sm:min-h-10 sm:px-3 sm:text-base!"
                disabled={billingBusy !== null}
                onClick={() => onStartCheckout?.('monthly')}
              >
                {billingBusy === 'monthly'
                  ? 'Redirecting...'
                  : 'Go Premium — $3 / month'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-11 min-h-11 w-full shrink-0 touch-manipulation rounded-none border-x-0 border-b-0 border-t border-border px-2 text-sm! font-heading font-black uppercase sm:h-10 sm:min-h-10 sm:px-3 sm:text-base!"
                disabled={billingBusy !== null}
                onClick={() => onStartCheckout?.('yearly')}
              >
                {billingBusy === 'yearly'
                  ? 'Redirecting...'
                  : 'Best value — $30 / year'}
              </Button>
              <p className="border-t border-border px-3 py-2 text-center text-xs leading-snug text-muted-foreground sm:px-4">
                Secure checkout with Stripe. Cancel anytime from billing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
