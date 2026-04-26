import {
  RiCheckboxMultipleLine,
  RiCheckboxMultipleFill,
  RiHeartFill,
  RiHeartLine,
} from '@remixicon/react'
import type { RecipeGeneration } from '#/lib/recipe-generation-view'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import RecipeView from '../RecipeView'

type SavedPageProps = {
  searchQuery: string
  showFavoritedOnly: boolean
  isLoadingHistory: boolean
  hasHistory: boolean
  visibleSavedGenerations: RecipeGeneration[]
  expandedSavedGenerationId: string | null
  selectedGroceryGenerationIds: string[]
  pendingFavoriteIds: Record<string, boolean>
  pendingDeleteIds: Record<string, boolean>
  formatMacro: (value: number | undefined, unit: string) => string
  onSetSearchQuery: (value: string) => void
  onToggleFavoritedOnly: () => void
  onSetExpandedSavedGenerationId: (generationId: string | null) => void
  onToggleGroceryRecipe: (generationId: string) => void
  onToggleFavorite: (generationId: string, favorited: boolean) => Promise<void>
  onDeleteGeneration: (generationId: string) => Promise<void>
}

export default function SavedPage({
  searchQuery,
  showFavoritedOnly,
  isLoadingHistory,
  hasHistory,
  visibleSavedGenerations,
  expandedSavedGenerationId,
  selectedGroceryGenerationIds,
  pendingFavoriteIds,
  pendingDeleteIds,
  formatMacro,
  onSetSearchQuery,
  onToggleFavoritedOnly,
  onSetExpandedSavedGenerationId,
  onToggleGroceryRecipe,
  onToggleFavorite,
  onDeleteGeneration,
}: SavedPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex flex-wrap items-stretch sm:flex-nowrap">
        <Input
          value={searchQuery}
          onChange={(event) => onSetSearchQuery(event.target.value)}
          placeholder="Search saved recipes..."
          className="h-10 min-h-10 min-w-0 basis-full rounded-none border-none bg-background py-2.5 text-base! placeholder:font-bold sm:basis-0 sm:flex-1 sm:text-lg!"
        />
        <Button
          type="button"
          size="lg"
          className="h-10 min-h-11 min-w-0 flex-1 touch-manipulation rounded-none border-none px-4 text-lg! font-heading font-black sm:min-h-10 sm:w-auto sm:min-w-30 sm:flex-none sm:text-xl!"
          disabled={!searchQuery.trim()}
        >
          SEARCH
        </Button>
        <Button
          type="button"
          size="sm"
          variant={showFavoritedOnly ? 'default' : 'outline'}
          className="h-10 min-h-11 w-11 shrink-0 touch-manipulation rounded-none border-y-0 border-r-0 p-0 sm:min-h-10 sm:w-10"
          onClick={onToggleFavoritedOnly}
          aria-label={
            showFavoritedOnly
              ? 'Show all saved recipes'
              : 'Show favorited recipes only'
          }
          title={
            showFavoritedOnly
              ? 'Show all saved recipes'
              : 'Show favorited recipes only'
          }
        >
          {showFavoritedOnly ? (
            <RiHeartFill className="size-5" aria-hidden />
          ) : (
            <RiHeartLine className="size-5" aria-hidden />
          )}
        </Button>
      </div>
      {isLoadingHistory ? (
        <p className="text-sm">Loading saved recipes...</p>
      ) : null}
      {!isLoadingHistory && !hasHistory ? (
        <p className="text-sm text-muted-foreground">
          No saved recipes yet. Generate your first set above.
        </p>
      ) : null}
      {!isLoadingHistory &&
      hasHistory &&
      visibleSavedGenerations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No recipes match the current filters.
        </p>
      ) : null}
      {visibleSavedGenerations.length > 0 ? (
        <div className="border-r border-b border-border">
          {visibleSavedGenerations.map((generation) => (
            <RecipeView
              key={generation.id}
              generation={generation}
              formatMacro={formatMacro}
              compact={expandedSavedGenerationId !== generation.id}
              listItem
              onClick={() =>
                onSetExpandedSavedGenerationId(
                  expandedSavedGenerationId === generation.id
                    ? null
                    : generation.id,
                )
              }
              onToggleFavorite={onToggleFavorite}
              onDelete={onDeleteGeneration}
              trailingActions={
                <Button
                  type="button"
                  size="xs"
                  variant={
                    selectedGroceryGenerationIds.includes(generation.id)
                      ? 'default'
                      : 'outline'
                  }
                  className="h-10 rounded-none border-r-0 border-t-0 px-2 text-[10px] font-bold uppercase"
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleGroceryRecipe(generation.id)
                  }}
                >
                  {selectedGroceryGenerationIds.includes(generation.id) ? (
                    <RiCheckboxMultipleFill className="size-5" aria-hidden />
                  ) : (
                    <RiCheckboxMultipleLine className="size-5" aria-hidden />
                  )}
                </Button>
              }
              favoriteDisabled={
                pendingFavoriteIds[generation.id] ||
                pendingDeleteIds[generation.id]
              }
              deleteDisabled={pendingDeleteIds[generation.id]}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
