export type PlanTier = 'free' | 'paid'

export const FREE_PLAN_TOKENS_PER_WEEK = 5
export const PAID_PLAN_TOKENS_PER_WEEK = 100
export const FREE_PLAN_RECIPE_SAVE_LIMIT = 10

function getWeeklyAllowance(planTier: PlanTier) {
  return planTier === 'paid'
    ? PAID_PLAN_TOKENS_PER_WEEK
    : FREE_PLAN_TOKENS_PER_WEEK
}

export function getPlanTierFromSubscriptionStatus(status: string): PlanTier {
  return status === 'active' || status === 'trialing' ? 'paid' : 'free'
}

function getIsoWeekYearAndNumber(date: Date) {
  const utcDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  )
  const day = utcDate.getUTCDay() || 7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(
    ((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return {
    year: utcDate.getUTCFullYear(),
    week: weekNo,
  }
}

export function getCurrentWeekKey(now: Date = new Date()) {
  const { year, week } = getIsoWeekYearAndNumber(now)
  return `${year}-W${String(week).padStart(2, '0')}`
}

export function applyWeeklyReset(input: {
  planTier: PlanTier
  tokensRemaining: number
  tokensWeekKey?: string | null
  now?: Date
}) {
  const now = input.now ?? new Date()
  const currentWeekKey = getCurrentWeekKey(now)
  const needsReset = input.tokensWeekKey !== currentWeekKey
  return {
    tokensWeekKey: currentWeekKey,
    tokensRemaining: needsReset
      ? getWeeklyAllowance(input.planTier)
      : input.tokensRemaining,
    didReset: needsReset,
  }
}

export function applyPlanTransition(input: {
  currentPlanTier: PlanTier
  nextPlanTier: PlanTier
  tokensRemaining: number
  tokensWeekKey?: string | null
  now?: Date
}) {
  const currentWeekKey = getCurrentWeekKey(input.now)
  if (input.currentPlanTier !== 'paid' && input.nextPlanTier === 'paid') {
    return {
      tokensRemaining: PAID_PLAN_TOKENS_PER_WEEK,
      tokensWeekKey: currentWeekKey,
    }
  }

  if (input.currentPlanTier === 'paid' && input.nextPlanTier === 'free') {
    return {
      tokensRemaining: FREE_PLAN_TOKENS_PER_WEEK,
      tokensWeekKey: currentWeekKey,
    }
  }

  return applyWeeklyReset({
    planTier: input.nextPlanTier,
    tokensRemaining: input.tokensRemaining,
    tokensWeekKey: input.tokensWeekKey,
    now: input.now,
  })
}

export function consumeTokens(input: {
  tokensRemaining: number
  amount: number
}) {
  const amount = Math.max(0, Math.floor(input.amount))
  if (input.tokensRemaining < amount) {
    return {
      ok: false as const,
      error: `Not enough tokens. You need ${amount}, but only have ${input.tokensRemaining}.`,
    }
  }
  return {
    ok: true as const,
    tokensRemaining: input.tokensRemaining - amount,
  }
}

export function canSaveRecipes(input: {
  planTier: PlanTier
  existingSavedCount: number
  incomingCount: number
}) {
  if (input.planTier === 'paid') {
    return { ok: true as const }
  }

  const nextCount = input.existingSavedCount + input.incomingCount
  if (nextCount > FREE_PLAN_RECIPE_SAVE_LIMIT) {
    return {
      ok: false as const,
      error: `Free plans can save up to ${FREE_PLAN_RECIPE_SAVE_LIMIT} recipes. Upgrade to Premium for unlimited saves or delete some recipes.`,
    }
  }
  return { ok: true as const }
}
