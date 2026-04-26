import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { RecipeGeneration } from '#/lib/recipe-generation-view'
import {
  filterGenerationsByQuery,
  getGroceryChecklist,
  getRecentGenerations,
} from '#/lib/recipe-generation-view'
import type { Recipe } from '#/lib/types/recipe'
import GenerationPage, {
  mergePreferenceWithToggles,
} from './recipe-gen-pages/GenerationPage'
import GroceryPage from './recipe-gen-pages/GroceryPage'
import PricingPage from './recipe-gen-pages/PricingPage'
import SavedPage from './recipe-gen-pages/SavedPage'
import { Button } from '#/components/ui/button'

type PageView = 'generation' | 'saved' | 'grocery' | 'pricing'

type RecipeGenFormProps = {
  pageView: PageView
  onTokensRemainingChange?: (tokensRemaining: number) => void
  onClosePricing?: () => void
  isPaid?: boolean
  isGuest?: boolean
  billingBusy?: 'monthly' | 'yearly' | 'portal' | null
  onStartCheckout?: (plan: 'monthly' | 'yearly') => void
  onOpenBillingPortal?: () => void
}

function formatMacro(value: number | undefined, unit: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--'
  return `${value.toFixed(1)}${unit}`
}

export function canGenerateRecipes(
  rawPreference: string,
  selectedIds: ReadonlySet<string>,
): boolean {
  return rawPreference.trim().length > 0 || selectedIds.size > 0
}

export default function RecipeGenForm({
  pageView,
  onTokensRemainingChange,
  onClosePricing,
  isPaid = false,
  isGuest = false,
  billingBusy = null,
  onStartCheckout,
  onOpenBillingPortal,
}: RecipeGenFormProps) {
  const [preference, setPreference] = useState('')
  const [selectedToggleIds, setSelectedToggleIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [recipeCount, setRecipeCount] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generations, setGenerations] = useState<RecipeGeneration[]>([])
  const [activeGenerationIds, setActiveGenerationIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showFavoritedOnly, setShowFavoritedOnly] = useState(false)
  const [pendingFavoriteIds, setPendingFavoriteIds] = useState<
    Record<string, boolean>
  >({})
  const [pendingDeleteIds, setPendingDeleteIds] = useState<
    Record<string, boolean>
  >({})
  const [expandedDockGenerationId, setExpandedDockGenerationId] = useState<
    string | null
  >(null)
  const [expandedSavedGenerationId, setExpandedSavedGenerationId] = useState<
    string | null
  >(null)
  const [selectedGroceryGenerationIds, setSelectedGroceryGenerationIds] =
    useState<string[]>([])
  const [checkedGroceryKeys, setCheckedGroceryKeys] = useState<
    Record<string, boolean>
  >({})
  const [generationLimitMessage, setGenerationLimitMessage] = useState<
    string | null
  >(null)
  const [showGenerationLimitMessage, setShowGenerationLimitMessage] =
    useState(false)
  const [showSignInModal, setShowSignInModal] = useState(false)
  const signInModalPrimaryRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    if (pageView !== 'generation') {
      setShowSignInModal(false)
    }
  }, [pageView])

  useEffect(() => {
    if (!showSignInModal) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSignInModal(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showSignInModal])

  useEffect(() => {
    if (!showSignInModal) return
    signInModalPrimaryRef.current?.focus()
  }, [showSignInModal])

  useEffect(() => {
    ;(async () => {
      try {
        const response = await fetch('/api/recipes/history')
        if (response.status === 401) {
          setGenerations([])
          return
        }
        if (!response.ok) {
          throw new Error('Could not load saved generations')
        }
        const payload = (await response.json()) as {
          generations: RecipeGeneration[]
        }
        setGenerations(payload.generations)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history')
      } finally {
        setIsLoadingHistory(false)
      }
    })()
  }, [])

  const hasHistory = useMemo(() => generations.length > 0, [generations])
  const hasNewlyGenerated = activeGenerationIds.length > 0
  const canGenerate = canGenerateRecipes(preference, selectedToggleIds)
  const showIdleGenerationAnimation = !hasNewlyGenerated
  const { activeGenerations } = useMemo(() => {
    if (!hasNewlyGenerated) return { activeGenerations: [] }
    const activeIdSet = new Set(activeGenerationIds)
    return {
      activeGenerations: generations.filter((generation) =>
        activeIdSet.has(generation.id),
      ),
    }
  }, [generations, activeGenerationIds, hasNewlyGenerated])
  const activeGenerationPreviews = useMemo(
    () => getRecentGenerations(activeGenerations, 3),
    [activeGenerations],
  )
  const recentDockGenerations = useMemo(
    () => getRecentGenerations(generations, 3),
    [generations],
  )
  const expandedDockGeneration = useMemo(
    () =>
      expandedDockGenerationId
        ? (recentDockGenerations.find(
            (generation) => generation.id === expandedDockGenerationId,
          ) ?? null)
        : null,
    [recentDockGenerations, expandedDockGenerationId],
  )
  useEffect(() => {
    if (!expandedDockGenerationId) return
    const stillVisible = recentDockGenerations.some(
      (generation) => generation.id === expandedDockGenerationId,
    )
    if (!stillVisible) setExpandedDockGenerationId(null)
  }, [recentDockGenerations, expandedDockGenerationId])
  const visibleSavedGenerations = useMemo(
    () =>
      filterGenerationsByQuery(
        generations.filter(
          (generation) => !showFavoritedOnly || generation.favorited,
        ),
        searchQuery,
      ),
    [generations, showFavoritedOnly, searchQuery],
  )
  const groceryChecklist = useMemo(
    () => getGroceryChecklist(generations, selectedGroceryGenerationIds),
    [generations, selectedGroceryGenerationIds],
  )
  const selectedGroceryGenerations = useMemo(() => {
    if (selectedGroceryGenerationIds.length === 0) return []
    const selectedIdSet = new Set(selectedGroceryGenerationIds)
    return generations.filter((generation) => selectedIdSet.has(generation.id))
  }, [generations, selectedGroceryGenerationIds])
  useEffect(() => {
    if (!expandedSavedGenerationId) return
    const stillVisible = visibleSavedGenerations.some(
      (generation) => generation.id === expandedSavedGenerationId,
    )
    if (!stillVisible) setExpandedSavedGenerationId(null)
  }, [visibleSavedGenerations, expandedSavedGenerationId])
  useEffect(() => {
    const checklistKeySet = new Set(groceryChecklist.map((item) => item.key))
    setCheckedGroceryKeys((current) => {
      let changed = false
      const next: Record<string, boolean> = {}
      for (const [key, checked] of Object.entries(current)) {
        if (checklistKeySet.has(key)) next[key] = checked
        else changed = true
      }
      return changed ? next : current
    })
  }, [groceryChecklist])
  useEffect(() => {
    if (!generationLimitMessage) return
    setShowGenerationLimitMessage(true)

    const hideTimer = window.setTimeout(() => {
      setShowGenerationLimitMessage(false)
    }, 5000)

    return () => {
      window.clearTimeout(hideTimer)
    }
  }, [generationLimitMessage])
  useEffect(() => {
    if (!generationLimitMessage || showGenerationLimitMessage) return

    const removeTimer = window.setTimeout(() => {
      setGenerationLimitMessage(null)
    }, 300)

    return () => {
      window.clearTimeout(removeTimer)
    }
  }, [generationLimitMessage, showGenerationLimitMessage])

  async function toggleFavorite(generationId: string, favorited: boolean) {
    setError(null)
    setPendingFavoriteIds((current) => ({ ...current, [generationId]: true }))
    try {
      const response = await fetch(`/api/recipes/${generationId}/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorited }),
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update favorite')
      }
      setGenerations((current) =>
        current.map((generation) =>
          generation.id === generationId
            ? { ...generation, favorited }
            : generation,
        ),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update favorite')
    } finally {
      setPendingFavoriteIds((current) => ({
        ...current,
        [generationId]: false,
      }))
    }
  }

  async function deleteGeneration(generationId: string) {
    setError(null)
    setPendingDeleteIds((current) => ({ ...current, [generationId]: true }))
    try {
      const response = await fetch(`/api/recipes/${generationId}`, {
        method: 'DELETE',
      })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
      }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to delete generation')
      }
      setGenerations((current) =>
        current.filter((generation) => generation.id !== generationId),
      )
      setSelectedGroceryGenerationIds((current) =>
        current.filter((id) => id !== generationId),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to delete generation',
      )
    } finally {
      setPendingDeleteIds((current) => ({ ...current, [generationId]: false }))
    }
  }

  function toggleId(id: string) {
    setSelectedToggleIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroceryRecipe(generationId: string) {
    setSelectedGroceryGenerationIds((current) =>
      current.includes(generationId)
        ? current.filter((id) => id !== generationId)
        : [...current, generationId],
    )
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setGenerationLimitMessage(null)

    const preferenceForApi = mergePreferenceWithToggles(
      preference,
      selectedToggleIds,
    )
    if (preferenceForApi.trim().length < 3) {
      setError(
        'Enter at least a few characters or pick at least one option below.',
      )
      return
    }

    if (isGuest) {
      setShowSignInModal(true)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/recipes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preference: preferenceForApi,
          recipeCount,
        }),
      })

      const payload = (await response.json()) as {
        error?: string
        code?: 'insufficient_tokens' | 'recipe_save_limit'
        recipes?: Recipe[]
        tokensRemaining?: number
      }

      if (!response.ok) {
        if (
          payload.code === 'insufficient_tokens' ||
          payload.code === 'recipe_save_limit'
        ) {
          setGenerationLimitMessage(payload.error ?? 'Generation failed')
          return
        }
        throw new Error(payload.error ?? 'Generation failed')
      }

      const newRows: RecipeGeneration[] = (payload.recipes ?? []).map(
        (recipe) => ({
          id: crypto.randomUUID(),
          recipe,
          favorited: false,
          createdAt: Date.now(),
        }),
      )
      setGenerations((current) => [...newRows, ...current])
      setActiveGenerationIds(newRows.map((row) => row.id))
      setPreference('')
      if (typeof payload.tokensRemaining === 'number') {
        onTokensRemainingChange?.(payload.tokensRemaining)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isGuest && showSignInModal && pageView === 'generation' ? (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center bg-background/75 p-4 pb-6 backdrop-blur-[2px] sm:pb-10"
          role="presentation"
          onClick={() => setShowSignInModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-in-modal-title"
            className="w-full max-w-md border border-border bg-background p-5 shadow-lg sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2
              id="sign-in-modal-title"
              className="font-heading text-xl font-black sm:text-2xl"
            >
              Sign in to generate recipes
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Sign in to create recipes with Sizzle. Sizzle is owned by Alder,
              and all Alder apps use one account—sign in once to use your Alder
              profile across apps.
            </p>
            <div className="mt-5">
              <Button
                className="w-full rounded-none font-heading font-black"
                asChild
              >
                <a
                  ref={signInModalPrimaryRef}
                  href="/auth/login"
                  className="inline-flex"
                >
                  Sign In
                </a>
              </Button>
            </div>
          </div>
        </div>
      ) : null}
      {generationLimitMessage ? (
        <div className="overflow-hidden border-b border-border">
          <div
            className={`bg-hazard px-3 py-2 text-sm text-foreground transition-[max-height] duration-300 ${
              showGenerationLimitMessage ? 'max-h-16' : 'max-h-0'
            }`}
          >
            {generationLimitMessage}
          </div>
        </div>
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pageView}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {pageView === 'generation' ? (
            <GenerationPage
              isLoadingHistory={isLoadingHistory}
              hasNewlyGenerated={hasNewlyGenerated}
              showIdleGenerationAnimation={showIdleGenerationAnimation}
              activeGenerationPreviews={activeGenerationPreviews}
              expandedDockGeneration={expandedDockGeneration}
              expandedDockGenerationId={expandedDockGenerationId}
              recentDockGenerations={recentDockGenerations}
              selectedToggleIds={selectedToggleIds}
              preference={preference}
              recipeCount={recipeCount}
              isSubmitting={isSubmitting}
              canGenerate={canGenerate}
              error={error}
              pendingFavoriteIds={pendingFavoriteIds}
              pendingDeleteIds={pendingDeleteIds}
              onToggleId={toggleId}
              onSetPreference={setPreference}
              onSetRecipeCount={setRecipeCount}
              onSubmit={onSubmit}
              onSetExpandedDockGenerationId={setExpandedDockGenerationId}
              onToggleFavorite={toggleFavorite}
              onDeleteGeneration={deleteGeneration}
              formatMacro={formatMacro}
            />
          ) : pageView === 'saved' ? (
            <SavedPage
              searchQuery={searchQuery}
              showFavoritedOnly={showFavoritedOnly}
              isLoadingHistory={isLoadingHistory}
              hasHistory={hasHistory}
              visibleSavedGenerations={visibleSavedGenerations}
              expandedSavedGenerationId={expandedSavedGenerationId}
              selectedGroceryGenerationIds={selectedGroceryGenerationIds}
              pendingFavoriteIds={pendingFavoriteIds}
              pendingDeleteIds={pendingDeleteIds}
              formatMacro={formatMacro}
              onSetSearchQuery={setSearchQuery}
              onToggleFavoritedOnly={() =>
                setShowFavoritedOnly((current) => !current)
              }
              onSetExpandedSavedGenerationId={setExpandedSavedGenerationId}
              onToggleGroceryRecipe={toggleGroceryRecipe}
              onToggleFavorite={toggleFavorite}
              onDeleteGeneration={deleteGeneration}
            />
          ) : pageView === 'grocery' ? (
            <GroceryPage
              selectedGroceryGenerations={selectedGroceryGenerations}
              groceryChecklist={groceryChecklist}
              checkedGroceryKeys={checkedGroceryKeys}
              onToggleGroceryRecipe={toggleGroceryRecipe}
              onSetCheckedGroceryKey={(key, checked) =>
                setCheckedGroceryKeys((current) => ({
                  ...current,
                  [key]: checked,
                }))
              }
            />
          ) : (
            <PricingPage
              onClosePricing={onClosePricing}
              isPaid={isPaid}
              billingBusy={billingBusy}
              onStartCheckout={onStartCheckout}
              onOpenBillingPortal={onOpenBillingPortal}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
