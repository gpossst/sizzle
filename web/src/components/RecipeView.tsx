import { Button } from './ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip'
import { RiDeleteBinLine, RiHeartFill, RiHeartLine } from '@remixicon/react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { RecipeGeneration } from '#/lib/recipe-generation-view'

type RecipeViewProps = {
  generation: RecipeGeneration
  formatMacro: (value: number | undefined, unit: string) => string
  unstyled?: boolean
  compact?: boolean
  listItem?: boolean
  onClick?: () => void
  trailingActions?: ReactNode
  onToggleFavorite?: (generationId: string, favorited: boolean) => void
  onDelete?: (generationId: string) => void
  favoriteDisabled?: boolean
  deleteDisabled?: boolean
}

export default function RecipeView({
  generation,
  formatMacro,
  unstyled = false,
  compact = false,
  listItem = false,
  onClick,
  trailingActions,
  onToggleFavorite,
  onDelete,
  favoriteDisabled = false,
  deleteDisabled = false,
}: RecipeViewProps) {
  const titleClassName = compact
    ? 'font-heading text-2xl leading-tight font-black uppercase px-4 pt-3 pb-1'
    : 'font-heading text-2xl leading-tight font-black uppercase px-4 pt-4 pb-2'

  const metaClassName = compact
    ? 'flex flex-col items-start gap-x-3 gap-y-1 px-4 pb-3 text-xs tracking-wide text-foreground'
    : 'flex flex-col items-start gap-x-3 gap-y-1 px-4 text-xs tracking-wide text-foreground'

  return (
    <motion.article
      layout
      transition={{ layout: { duration: 0.28, ease: 'easeInOut' } }}
      onClick={onClick}
      className={
        unstyled
          ? `space-y-2 ${onClick ? 'cursor-pointer' : ''}`
          : listItem
            ? `space-y-2 border-b border-border bg-background/70 first:border-t last:border-b-0 ${onClick ? 'cursor-pointer' : ''}`
            : `space-y-2 border border-border bg-background/70 ${onClick ? 'cursor-pointer' : ''}`
      }
    >
      <header className="">
        <div className="flex items-start justify-between">
          <h3 className={titleClassName}>
            {generation.recipe.title}
          </h3>

          {onToggleFavorite || onDelete || trailingActions ? (
            <div className="flex items-center">
              {onToggleFavorite ? (
                <Button
                  type="button"
                  size="xs"
                  variant={generation.favorited ? 'default' : 'outline'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleFavorite(generation.id, !generation.favorited)
                  }}
                  disabled={favoriteDisabled || deleteDisabled}
                  className="h-10 w-10 rounded-none rounded-bl-xs border-r-0 border-t-0 p-0"
                  aria-label={
                    generation.favorited
                      ? 'Unfavorite recipe'
                      : 'Favorite recipe'
                  }
                  title={
                    generation.favorited
                      ? 'Unfavorite recipe'
                      : 'Favorite recipe'
                  }
                >
                  {generation.favorited ? (
                    <RiHeartFill className="size-5" aria-hidden />
                  ) : (
                    <RiHeartLine className="size-5" aria-hidden />
                  )}
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(generation.id)
                  }}
                  disabled={deleteDisabled}
                  className="h-10 w-10 rounded-none border-r-0 border-t-0 bg-destructive/10 p-0 hover:bg-destructive hover:text-background"
                  aria-label="Delete recipe"
                  title="Delete recipe"
                >
                  <RiDeleteBinLine className="size-5" aria-hidden />
                </Button>
              ) : null}
              {trailingActions}
            </div>
          ) : null}
        </div>
        <div className={metaClassName}>
          {!compact && generation.recipe.summary ? (
            <p className="text-sm leading-relaxed">
              {generation.recipe.summary}
            </p>
          ) : null}
          {generation.recipe.macroSummary ? (
            <p>
              {formatMacro(generation.recipe.macroSummary.calories, ' kcal')}
              {generation.recipe.macroSummaryPerServing
                ? ` (${formatMacro(generation.recipe.macroSummaryPerServing.calories, ' kcal')})`
                : ''}{' '}
              ·{' '}
              {formatMacro(generation.recipe.macroSummary.protein, 'g protein')}
              {generation.recipe.macroSummaryPerServing
                ? ` (${formatMacro(generation.recipe.macroSummaryPerServing.protein, 'g protein')})`
                : ''}{' '}
              · {formatMacro(generation.recipe.macroSummary.carbs, 'g carbs')}
              {generation.recipe.macroSummaryPerServing
                ? ` (${formatMacro(generation.recipe.macroSummaryPerServing.carbs, 'g carbs')})`
                : ''}{' '}
              · {formatMacro(generation.recipe.macroSummary.fat, 'g fat')}
              {generation.recipe.macroSummaryPerServing
                ? ` (${formatMacro(generation.recipe.macroSummaryPerServing.fat, 'g fat')})`
                : ''}
            </p>
          ) : null}
        </div>
      </header>

      <AnimatePresence initial={false}>
        {!compact ? (
          <motion.div
            key="expanded-content"
            layout
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-4 px-4">
              <section className="space-y-2 pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <p className="font-heading text-[11px] font-bold tracking-wide  uppercase">
                  Ingredients
                </p>
                {generation.recipe.ingredientGroups.map((group) => (
                  <div key={group.title} className="mt-2">
                    {generation.recipe.ingredientGroups.length > 1 ? (
                      <p className="text-xs font-medium uppercase">
                        {group.title}
                      </p>
                    ) : null}
                    <TooltipProvider>
                      <ul className="list-disc space-y-0.5 pl-5 text-sm">
                        {group.ingredients.map((ingredient, index) => (
                          <li
                            key={`${group.title}-${ingredient.name}-${index}`}
                          >
                            {ingredient.macroSummary ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-help decoration-dotted underline-offset-2 hover:underline">
                                    {ingredient.amount} {ingredient.name}
                                    {ingredient.note
                                      ? ` (${ingredient.note})`
                                      : ''}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" sideOffset={8}>
                                  <div className="space-y-0.5">
                                    <p>
                                      Calories:{' '}
                                      {formatMacro(
                                        ingredient.macroSummary.calories,
                                        ' kcal',
                                      )}
                                    </p>
                                    <p>
                                      Protein:{' '}
                                      {formatMacro(
                                        ingredient.macroSummary.protein,
                                        'g',
                                      )}
                                    </p>
                                    <p>
                                      Carbs:{' '}
                                      {formatMacro(
                                        ingredient.macroSummary.carbs,
                                        'g',
                                      )}
                                    </p>
                                    <p>
                                      Fat:{' '}
                                      {formatMacro(
                                        ingredient.macroSummary.fat,
                                        'g',
                                      )}
                                    </p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <>
                                {ingredient.amount} {ingredient.name}
                                {ingredient.note ? ` (${ingredient.note})` : ''}
                              </>
                            )}
                          </li>
                        ))}
                      </ul>
                    </TooltipProvider>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <p className="font-heading text-[11px] font-bold tracking-wide uppercase">
                  Steps
                </p>
                <ol className="list-decimal space-y-1 pl-5 text-sm">
                  {generation.recipe.steps.map((step, index) => (
                    <li key={`${generation.recipe.title}-step-${index}`}>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
              </section>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  )
}
