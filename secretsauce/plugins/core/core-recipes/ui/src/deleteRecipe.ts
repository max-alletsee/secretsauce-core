import type { SecretSauceUI } from '@secretsauce/ui'

export interface DeletableRecipe {
  id?: string | null
  group_id?: string | null
  title?: string | null
  languages?: string[] | null
}

export function formatDeleteRecipeMessage(recipe: DeletableRecipe): string {
  const title = (recipe.title || '').trim() || 'this recipe'
  const langs = Array.isArray(recipe.languages) ? recipe.languages.filter(Boolean) : []
  const prefix =
    langs.length > 1
      ? `Delete '${title}' and all ${langs.length} language versions (${langs.map((l) => l.toUpperCase()).join(', ')})?`
      : `Delete '${title}'?`
  return `${prefix} This will unlink it from Timeline history and remove it from Shortlist and Recurring meals.`
}

export function recipeGroupId(recipe: DeletableRecipe): string {
  if (recipe.group_id) return recipe.group_id
  if (recipe.id) {
    const idx = recipe.id.indexOf('_')
    return idx === -1 ? recipe.id : recipe.id.slice(0, idx)
  }
  return ''
}

export function matchesDeletedRecipe(
  event: { entity_id?: string | null } | undefined,
  current: { id?: string | null; group_id?: string | null } | null | undefined,
): boolean {
  const deletedId = event?.entity_id
  if (!deletedId || !current) return false
  if (current.id && deletedId === current.id) return true
  if (current.group_id) {
    return deletedId === current.group_id || deletedId.startsWith(`${current.group_id}_`)
  }
  return false
}

export async function confirmAndDeleteRecipe(
  ss: SecretSauceUI,
  recipe: DeletableRecipe,
): Promise<boolean> {
  const groupId = recipeGroupId(recipe)
  if (!groupId) return false
  const confirmed = await ss.confirm({
    header: 'Delete recipe',
    message: formatDeleteRecipeMessage(recipe),
    acceptLabel: 'Delete',
    rejectLabel: 'Cancel',
    severity: 'danger',
  })
  if (!confirmed) return false
  await ss.api.delete(`/api/recipes/${groupId}`)
  ss.notify({ level: 'success', message: 'Recipe deleted' })
  ss.navigate?.('/recipes')
  return true
}
