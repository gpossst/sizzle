import type {
  CSSProperties,
  FormEvent,
  ReactNode,
  TransitionEvent,
} from 'react'
import { useState } from 'react'
import {
  RiCapsuleLine,
  RiGobletLine,
  RiLeafLine,
  RiRestaurantLine,
  RiTimeLine,
  RiCloseLine,
} from '@remixicon/react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '#/lib/utils'
import type { RecipeGeneration } from '#/lib/recipe-generation-view'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import RecipeView from '../RecipeView'
import ColorRectsMotion from '../ColorRectsMotion'

type ToggleDef = { id: string; label: string }
type ToggleAccent = 'primary' | 'secondary' | 'hazard'

const recipeCountFillClass: Record<number, string> = {
  1: 'bg-[length:12.5%_100%]',
  2: 'bg-[length:25%_100%]',
  3: 'bg-[length:37.5%_100%]',
  4: 'bg-[length:50%_100%]',
  5: 'bg-[length:62.5%_100%]',
  6: 'bg-[length:75%_100%]',
  7: 'bg-[length:87.5%_100%]',
  8: 'bg-[length:100%_100%]',
}

const PREFERENCE_TOGGLES = [
  { id: 'low-calorie', label: 'Low calorie' },
  { id: 'low-cost', label: 'Low cost' },
  { id: 'high-protein', label: 'High protein' },
  { id: 'low-carb', label: 'Low carb' },
  { id: 'high-fiber', label: 'High fiber' },
  { id: 'low-sodium', label: 'Low sodium' },
] as const

const DIETARY_TOGGLES = [
  { id: 'gluten-free', label: 'Gluten free' },
  { id: 'dairy-free', label: 'Dairy free' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'nut-free', label: 'Nut free' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'egg-free', label: 'Egg free' },
  { id: 'soy-free', label: 'Soy free' },
  { id: 'pescatarian', label: 'Pescatarian' },
  { id: 'paleo', label: 'Paleo' },
] as const

const CUISINE_TOGGLES = [
  { id: 'chinese', label: 'Chinese' },
  { id: 'japanese', label: 'Japanese' },
  { id: 'mexican', label: 'Mexican' },
  { id: 'italian', label: 'Italian' },
  { id: 'indian', label: 'Indian' },
  { id: 'thai', label: 'Thai' },
  { id: 'korean', label: 'Korean' },
  { id: 'mediterranean', label: 'Mediterranean' },
  { id: 'greek', label: 'Greek' },
  { id: 'french', label: 'French' },
  { id: 'spanish', label: 'Spanish' },
] as const

const MEAL_TYPE_TOGGLES = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
  { id: 'dessert', label: 'Dessert' },
] as const

const COOK_TIME_TOGGLES = [
  { id: 'quick-under-15', label: 'Under 15 min' },
  { id: 'quick-under-30', label: 'Under 30 min' },
  { id: 'meal-prep-friendly', label: 'Meal prep friendly' },
  { id: 'one-pot', label: 'One pot' },
  { id: 'air-fryer', label: 'Air fryer' },
] as const

const TOGGLE_ACCENT_STYLES: Record<
  ToggleAccent,
  { fill: string; foreground: string }
> = {
  primary: {
    fill: 'var(--color-primary)',
    foreground: 'var(--color-primary-foreground)',
  },
  secondary: {
    fill: 'var(--color-secondary)',
    foreground: 'var(--color-secondary-foreground)',
  },
  hazard: {
    fill: 'var(--color-hazard)',
    foreground: 'var(--color-foreground)',
  },
}

function randomToggleAccent(): ToggleAccent {
  const options: ToggleAccent[] = ['primary', 'secondary', 'hazard']
  const index = Math.floor(Math.random() * options.length)
  return options[index] ?? 'primary'
}

function ToggleButton({
  item,
  selected,
  onToggle,
}: {
  item: ToggleDef
  selected: boolean
  onToggle: () => void
}) {
  const [accent] = useState<ToggleAccent>(randomToggleAccent)
  const { fill, foreground } = TOGGLE_ACCENT_STYLES[accent]
  const [hovered, setHovered] = useState(false)
  const [fillOrigin, setFillOrigin] = useState<'left' | 'right'>('left')

  const showFill = selected || hovered

  function handlePointerEnter() {
    setFillOrigin('left')
    setHovered(true)
  }

  function handlePointerLeave() {
    setFillOrigin('right')
    setHovered(false)
  }

  function handleFocus() {
    // Keep keyboard focus styling via Tailwind classes, but avoid
    // focus-driven fill state to prevent deselect refill races.
  }

  function handleBlur() {
    if (selected) return
    setFillOrigin('right')
  }

  function handleFillTransitionEnd(event: TransitionEvent<HTMLSpanElement>) {
    if (event.propertyName !== 'transform') return
    if (selected || hovered) return
    if (fillOrigin === 'right') setFillOrigin('left')
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={
        {
          '--toggle-fill': fill,
          '--toggle-fg': foreground,
        } as CSSProperties
      }
      className={cn(
        'relative box-border -ml-px overflow-hidden border-x border-y border-x-border border-y-transparent px-2 py-2 text-xs font-medium first:ml-0 sm:px-4 sm:py-2.5 sm:text-sm',
        'transition-[border-color,color] duration-200',
        selected
          ? 'z-20 border-x-foreground border-y-foreground'
          : 'text-muted-foreground hover:z-10 hover:border-x-foreground/40 hover:border-y-foreground/40 focus-visible:z-10 focus-visible:border-x-foreground/40 focus-visible:border-y-foreground/40',
        showFill && 'text-[color:var(--toggle-fg)]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 z-0 transition-transform duration-300 ease-out',
          showFill ? 'scale-x-100' : 'scale-x-0',
        )}
        style={{
          transformOrigin:
            fillOrigin === 'left' ? 'left center' : 'right center',
          backgroundColor: 'var(--toggle-fill)',
        }}
        onTransitionEnd={handleFillTransitionEnd}
      />
      <span className="relative z-10">{item.label}</span>
    </button>
  )
}

function ToggleRow({
  ariaLabel,
  icon,
  items,
  selectedIds,
  onToggleId,
}: {
  ariaLabel: string
  icon: ReactNode
  items: readonly ToggleDef[]
  selectedIds: ReadonlySet<string>
  onToggleId: (id: string) => void
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="flex items-start gap-1.5 sm:gap-2"
    >
      <span
        className="mt-2 inline-flex shrink-0 pl-2 pr-0.5 text-muted-foreground sm:mt-3 sm:pl-3 sm:pr-1"
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-0">
        {items.map((item) => (
          <ToggleButton
            key={item.id}
            item={item}
            selected={selectedIds.has(item.id)}
            onToggle={() => onToggleId(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

export function mergePreferenceWithToggles(
  rawPreference: string,
  selectedIds: ReadonlySet<string>,
): string {
  const base = rawPreference.trim()
  const labels: string[] = []
  const groups = [
    PREFERENCE_TOGGLES,
    DIETARY_TOGGLES,
    CUISINE_TOGGLES,
    MEAL_TYPE_TOGGLES,
    COOK_TIME_TOGGLES,
  ]
  for (const group of groups) {
    for (const item of group) {
      if (selectedIds.has(item.id)) labels.push(item.label)
    }
  }
  if (labels.length === 0) return base
  const extra = labels.join(', ')
  if (!base) return extra
  return `${base}. Preferences and constraints: ${extra}`
}

type GenerationPageProps = {
  isLoadingHistory: boolean
  hasNewlyGenerated: boolean
  showIdleGenerationAnimation: boolean
  activeGenerationPreviews: RecipeGeneration[]
  expandedDockGeneration: RecipeGeneration | null
  expandedDockGenerationId: string | null
  recentDockGenerations: RecipeGeneration[]
  selectedToggleIds: ReadonlySet<string>
  preference: string
  recipeCount: number
  isSubmitting: boolean
  canGenerate: boolean
  error: string | null
  pendingFavoriteIds: Record<string, boolean>
  pendingDeleteIds: Record<string, boolean>
  onToggleId: (id: string) => void
  onSetPreference: (value: string) => void
  onSetRecipeCount: (value: number) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSetExpandedDockGenerationId: (generationId: string | null) => void
  onToggleFavorite: (generationId: string, favorited: boolean) => Promise<void>
  onDeleteGeneration: (generationId: string) => Promise<void>
  formatMacro: (value: number | undefined, unit: string) => string
}

export default function GenerationPage({
  isLoadingHistory,
  hasNewlyGenerated,
  showIdleGenerationAnimation,
  activeGenerationPreviews,
  expandedDockGeneration,
  expandedDockGenerationId,
  recentDockGenerations,
  selectedToggleIds,
  preference,
  recipeCount,
  isSubmitting,
  canGenerate,
  error,
  pendingFavoriteIds,
  pendingDeleteIds,
  onToggleId,
  onSetPreference,
  onSetRecipeCount,
  onSubmit,
  onSetExpandedDockGenerationId,
  onToggleFavorite,
  onDeleteGeneration,
  formatMacro,
}: GenerationPageProps) {
  function renderGenerationPreview(
    generation: RecipeGeneration,
    options?: { historyRow?: boolean; historyIndex?: number; dock?: boolean },
  ) {
    const ingredientCount = generation.recipe.ingredientGroups.reduce(
      (total, group) => total + group.ingredients.length,
      0,
    )
    const historyRow = options?.historyRow === true
    const dock = options?.dock === true
    const isFirstInHistoryRow = historyRow && (options?.historyIndex ?? 0) === 0
    const isExpanded = dock && expandedDockGenerationId === generation.id
    const condensedDock = dock && Boolean(expandedDockGenerationId)

    return (
      <motion.button
        type="button"
        key={generation.id}
        onClick={() =>
          onSetExpandedDockGenerationId(isExpanded ? null : generation.id)
        }
        aria-expanded={isExpanded}
        className={cn(
          dock
            ? 'flex h-full min-h-0 w-full flex-col overflow-hidden border-0 bg-transparent px-1.5 py-0 text-left transition-colors hover:bg-foreground/5'
            : 'space-y-3 border border-border bg-background/60 p-4',
          historyRow && !dock && 'border-r-0',
          isFirstInHistoryRow && !dock && 'border-l-0',
          isExpanded && 'bg-secondary text-secondary-foreground',
        )}
        layout
        transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
      >
        <h3
          className={cn(
            'line-clamp-2 font-heading font-black uppercase',
            dock
              ? condensedDock
                ? 'text-[11px] leading-tight'
                : 'text-xs leading-tight'
              : 'text-sm leading-snug',
          )}
        >
          {generation.recipe.title}
        </h3>
        <AnimatePresence initial={false}>
          {!condensedDock ? (
            <motion.div
              key="details"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  'space-y-1 text-muted-foreground',
                  dock ? 'space-y-0 text-[10px] leading-tight' : 'text-xs',
                  isExpanded && 'text-foreground',
                )}
              >
                <p>
                  {formatMacro(
                    generation.recipe.macroSummary?.calories,
                    ' kcal',
                  )}{' '}
                  ·{' '}
                  {formatMacro(generation.recipe.macroSummary?.protein, 'g P')}{' '}
                  · {formatMacro(generation.recipe.macroSummary?.carbs, 'g C')}{' '}
                  · {formatMacro(generation.recipe.macroSummary?.fat, 'g F')}
                </p>
                <p>
                  {ingredientCount} ingredient{ingredientCount === 1 ? '' : 's'}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.button>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto">
        {isLoadingHistory ? (
          <p className="text-sm">Loading recipes...</p>
        ) : null}
        {showIdleGenerationAnimation ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <ColorRectsMotion />
          </div>
        ) : null}
        {!isLoadingHistory && hasNewlyGenerated ? (
          <div className="flex flex-col gap-4">
            <div className="grid md:grid-cols-3">
              {activeGenerationPreviews.map((generation, idx) => {
                // For 3-column grid, rightmost items per row have no border-r
                // In case of fewer than 3, make sure to not apply border-r on last item
                // For generality, if only 1 column: always no border. If 2 columns: even idxs have border except last. If 3+: every item in col 0,1 get border, col 2 (idx % 3 === 2) does not.
                const isRightmost =
                  (idx + 1) % 3 === 0 ||
                  idx === activeGenerationPreviews.length - 1
                return (
                  <div
                    key={generation.id}
                    className={
                      isRightmost
                        ? 'border-t-0'
                        : 'border-r border-t-0 border-border'
                    }
                  >
                    {renderGenerationPreview(generation)}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {!expandedDockGeneration ? (
          <motion.form
            key="generation-form"
            className="flex w-full shrink-0 flex-col gap-0 border-t border-border"
            onSubmit={onSubmit}
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
          >
            <div className="flex flex-col gap-0 divide-y divide-border bg-background">
              <ToggleRow
                ariaLabel="Preferences"
                icon={<RiCapsuleLine className="size-5" />}
                items={PREFERENCE_TOGGLES}
                selectedIds={selectedToggleIds}
                onToggleId={onToggleId}
              />
              <ToggleRow
                ariaLabel="Dietary"
                icon={<RiLeafLine className="size-5" />}
                items={DIETARY_TOGGLES}
                selectedIds={selectedToggleIds}
                onToggleId={onToggleId}
              />
              <ToggleRow
                ariaLabel="Cuisine"
                icon={<RiRestaurantLine className="size-5" />}
                items={CUISINE_TOGGLES}
                selectedIds={selectedToggleIds}
                onToggleId={onToggleId}
              />
              <ToggleRow
                ariaLabel="Meal type"
                icon={<RiGobletLine className="size-5" />}
                items={MEAL_TYPE_TOGGLES}
                selectedIds={selectedToggleIds}
                onToggleId={onToggleId}
              />
              <ToggleRow
                ariaLabel="Cooking style and time"
                icon={<RiTimeLine className="size-5" />}
                items={COOK_TIME_TOGGLES}
                selectedIds={selectedToggleIds}
                onToggleId={onToggleId}
              />
              <div className="relative">
                <Input
                  value={preference}
                  className="h-auto min-h-10 rounded-none border-none bg-background py-2.5 text-base! placeholder:text-transparent sm:text-lg!"
                  onChange={(event) => onSetPreference(event.target.value)}
                  placeholder="What are you hungry for?"
                />
                {!preference ? (
                  <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-base font-bold text-muted-foreground sm:text-lg">
                    What are you hungry for?
                    <span
                      aria-hidden
                      className="ml-1 inline-block h-[0.95em] w-[0.5em] animate-[prompt-caret-blink_1s_steps(1,end)_infinite] bg-muted-foreground align-middle"
                    />
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex w-full min-w-0 flex-col items-stretch sm:flex-row">
              <div className="relative h-10 min-h-10 w-full min-w-0">
                <Input
                  id="recipe-count"
                  type="range"
                  min={1}
                  max={8}
                  step={1}
                  value={recipeCount}
                  onChange={(event) =>
                    onSetRecipeCount(Number(event.target.value))
                  }
                  className={`m-0 h-full w-full appearance-none rounded-none border-none bg-foreground/10 bg-[linear-gradient(var(--color-secondary)_0_0)] bg-no-repeat px-0 py-0 ${recipeCountFillClass[recipeCount]} [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-transparent [&::-moz-range-thumb]:shadow-none [&::-moz-range-track]:h-full [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-full [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-transparent [&::-webkit-slider-thumb]:shadow-none`}
                />
                <span className="pointer-events-none absolute inset-0 z-10 flex items-center justify-start px-2 font-heading text-sm text-secondary-foreground sm:text-base">
                  {recipeCount} recipe{recipeCount === 1 ? '' : 's'}
                </span>
              </div>
              <Button
                type="submit"
                size="lg"
                className="h-10 min-h-11 w-full min-w-0 touch-manipulation shrink-0 rounded-none border-none px-4 text-lg! font-heading font-black sm:min-h-10 sm:w-auto sm:min-w-30 sm:text-xl!"
                disabled={isSubmitting || !canGenerate}
              >
                {isSubmitting ? 'GENERATING...' : 'GENERATE'}
              </Button>
            </div>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </motion.form>
        ) : null}
      </AnimatePresence>
      <motion.footer
        className="shrink-0 border-t border-border bg-background"
        aria-label="Most recent recipes"
        layout
        transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
      >
        <motion.div
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:grid sm:grid-cols-3 sm:overflow-visible sm:overscroll-auto"
          layout
          transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
        >
          {isLoadingHistory ? (
            <p className="flex min-h-10 w-full min-w-full shrink-0 basis-full snap-center items-center justify-center text-sm text-muted-foreground sm:min-w-0 sm:snap-normal">
              Loading recipes...
            </p>
          ) : recentDockGenerations.length === 0 ? (
            <p className="flex min-h-10 w-full min-w-full shrink-0 basis-full snap-center items-center justify-center px-4 text-center text-sm text-muted-foreground sm:min-w-0 sm:snap-normal">
              No recipes yet. Generate your first set above.
            </p>
          ) : (
            recentDockGenerations.map((generation, index) => (
              <motion.div
                key={generation.id}
                className={cn(
                  'min-h-0 min-w-full shrink-0 snap-center overflow-hidden sm:min-w-0 sm:snap-normal',
                  index < recentDockGenerations.length - 1 &&
                    'border-r border-border',
                )}
                layout
                transition={{ layout: { duration: 0.25, ease: 'easeInOut' } }}
              >
                {renderGenerationPreview(generation, { dock: true })}
              </motion.div>
            ))
          )}
        </motion.div>
      </motion.footer>
      <AnimatePresence initial={false}>
        {expandedDockGeneration ? (
          <motion.div
            key={expandedDockGeneration.id}
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="min-h-0 shrink-0 overflow-hidden border-t border-border"
          >
            <div className="max-h-[min(80vh,85dvh)] overflow-y-auto">
              <RecipeView
                generation={expandedDockGeneration}
                formatMacro={formatMacro}
                unstyled
                trailingActions={
                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-10 w-10 rounded-none border-r-0 border-t-0 p-0"
                    onClick={() => onSetExpandedDockGenerationId(null)}
                    aria-label="Close expanded recipe"
                    title="Close expanded recipe"
                  >
                    <RiCloseLine className="size-5" aria-hidden />
                  </Button>
                }
                onToggleFavorite={onToggleFavorite}
                onDelete={onDeleteGeneration}
                favoriteDisabled={
                  pendingFavoriteIds[expandedDockGeneration.id] ||
                  pendingDeleteIds[expandedDockGeneration.id]
                }
                deleteDisabled={pendingDeleteIds[expandedDockGeneration.id]}
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
