import { describe, expect, it } from 'vitest'
import {
  FREE_PLAN_TOKENS_PER_WEEK,
  PAID_PLAN_TOKENS_PER_WEEK,
  applyPlanTransition,
  applyWeeklyReset,
  canSaveRecipes,
  consumeTokens,
  getCurrentWeekKey,
  getPlanTierFromSubscriptionStatus,
} from './entitlements'
import type { PlanTier } from './entitlements'

describe('entitlements', () => {
  it('computes a stable UTC week key', () => {
    const key = getCurrentWeekKey(new Date('2026-04-26T12:00:00Z'))
    expect(key).toBe('2026-W17')
  })

  it('resets free user tokens to free weekly allowance', () => {
    const result = applyWeeklyReset({
      planTier: 'free',
      tokensRemaining: 0,
      tokensWeekKey: '2026-W16',
      now: new Date('2026-04-26T12:00:00Z'),
    })
    expect(result.tokensRemaining).toBe(FREE_PLAN_TOKENS_PER_WEEK)
    expect(result.tokensWeekKey).toBe('2026-W17')
    expect(result.didReset).toBe(true)
  })

  it('resets paid user tokens to paid weekly allowance', () => {
    const result = applyWeeklyReset({
      planTier: 'paid',
      tokensRemaining: 4,
      tokensWeekKey: '2026-W16',
      now: new Date('2026-04-26T12:00:00Z'),
    })
    expect(result.tokensRemaining).toBe(PAID_PLAN_TOKENS_PER_WEEK)
    expect(result.tokensWeekKey).toBe('2026-W17')
    expect(result.didReset).toBe(true)
  })

  it('resets paid users to the free allowance when they downgrade', () => {
    const result = applyPlanTransition({
      currentPlanTier: 'paid',
      nextPlanTier: 'free',
      tokensRemaining: 87,
      tokensWeekKey: '2026-W17',
      now: new Date('2026-04-26T18:00:00Z'),
    })

    expect(result.tokensRemaining).toBe(FREE_PLAN_TOKENS_PER_WEEK)
    expect(result.tokensWeekKey).toBe('2026-W17')
  })

  it('resets users to the paid allowance when they upgrade', () => {
    const result = applyPlanTransition({
      currentPlanTier: 'free',
      nextPlanTier: 'paid',
      tokensRemaining: 2,
      tokensWeekKey: '2026-W17',
      now: new Date('2026-04-26T18:00:00Z'),
    })

    expect(result.tokensRemaining).toBe(PAID_PLAN_TOKENS_PER_WEEK)
    expect(result.tokensWeekKey).toBe('2026-W17')
  })

  it('downgrades failed-payment subscription states immediately', () => {
    expect(getPlanTierFromSubscriptionStatus('active')).toBe('paid')
    expect(getPlanTierFromSubscriptionStatus('trialing')).toBe('paid')
    expect(getPlanTierFromSubscriptionStatus('past_due')).toBe('free')
    expect(getPlanTierFromSubscriptionStatus('unpaid')).toBe('free')
    expect(getPlanTierFromSubscriptionStatus('canceled')).toBe('free')
  })

  it('does not reset tokens within the same week', () => {
    const result = applyWeeklyReset({
      planTier: 'free',
      tokensRemaining: 3,
      tokensWeekKey: '2026-W17',
      now: new Date('2026-04-26T18:00:00Z'),
    })
    expect(result.tokensRemaining).toBe(3)
    expect(result.tokensWeekKey).toBe('2026-W17')
    expect(result.didReset).toBe(false)
  })

  it('consumes tokens when sufficient', () => {
    const result = consumeTokens({
      tokensRemaining: 7,
      amount: 3,
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.tokensRemaining).toBe(4)
    }
  })

  it('blocks token consumption when insufficient', () => {
    const result = consumeTokens({
      tokensRemaining: 2,
      amount: 3,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain('Not enough tokens')
    }
  })

  it('enforces free save cap at 10 recipes', () => {
    expect(
      canSaveRecipes({
        planTier: 'free',
        existingSavedCount: 9,
        incomingCount: 1,
      }).ok,
    ).toBe(true)
    const blocked = canSaveRecipes({
      planTier: 'free',
      existingSavedCount: 9,
      incomingCount: 2,
    })
    expect(blocked.ok).toBe(false)
  })

  it('allows unlimited saves for paid users', () => {
    const plans: PlanTier[] = ['paid']
    for (const plan of plans) {
      const result = canSaveRecipes({
        planTier: plan,
        existingSavedCount: 10_000,
        incomingCount: 500,
      })
      expect(result.ok).toBe(true)
    }
  })
})
