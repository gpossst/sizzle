import { RiCloseLine } from '@remixicon/react'
import { cn } from '#/lib/utils'
import type { RecipeGeneration } from '#/lib/recipe-generation-view'
import type { GroceryChecklistItem } from '#/lib/recipe-generation-view'
import { Button } from '../ui/button'

type GroceryPageProps = {
  selectedGroceryGenerations: RecipeGeneration[]
  groceryChecklist: GroceryChecklistItem[]
  checkedGroceryKeys: Record<string, boolean>
  onToggleGroceryRecipe: (generationId: string) => void
  onSetCheckedGroceryKey: (key: string, checked: boolean) => void
}

export default function GroceryPage({
  selectedGroceryGenerations,
  groceryChecklist,
  checkedGroceryKeys,
  onToggleGroceryRecipe,
  onSetCheckedGroceryKey,
}: GroceryPageProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-border bg-background">
        {selectedGroceryGenerations.length > 0 ? (
          <div className="flex flex-wrap">
            {selectedGroceryGenerations.map((generation, index) => (
              <Button
                key={generation.id}
                type="button"
                size="xs"
                className={`h-7 rounded-none px-2 text-[11px] uppercase ${
                  ['bg-primary', 'bg-secondary', 'bg-hazard'][index % 3]
                } ${
                  index < selectedGroceryGenerations.length - 1
                    ? 'border-r border-border'
                    : ''
                }`}
                onClick={() => onToggleGroceryRecipe(generation.id)}
              >
                {generation.recipe.title}
                <RiCloseLine className="ml-1 size-3.5" aria-hidden />
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Add recipes from the Saved Recipes tab to build a combined grocery
            checklist.
          </p>
        )}
        {groceryChecklist.length > 0 ? (
          <ul className="space-y-1.5 border-t border-border text-sm">
            {groceryChecklist.map((item) => (
              <li key={item.key} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={Boolean(checkedGroceryKeys[item.key])}
                  onChange={(event) =>
                    onSetCheckedGroceryKey(item.key, event.target.checked)
                  }
                />
                <div className="min-w-0">
                  <p
                    className={cn(
                      checkedGroceryKeys[item.key]
                        ? 'text-muted-foreground line-through'
                        : '',
                    )}
                  >
                    {item.amount} {item.name}
                    {item.note ? ` (${item.note})` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.recipeIds.length} recipe
                    {item.recipeIds.length === 1 ? '' : 's'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
