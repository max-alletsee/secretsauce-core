import RecipeListPage from './pages/RecipeListPage.vue'
import RecipeDetailPage from './pages/RecipeDetailPage.vue'
import RecipeEditPage from './pages/RecipeEditPage.vue'
import RecipeTagSettings from './pages/RecipeTagSettings.vue'
import { confirmAndDeleteRecipe, recipeGroupId } from './deleteRecipe'

export default function activate(ss: any) {
  // Routes
  ss.route({ path: '/recipes', component: RecipeListPage, nav: { label: 'Recipes', icon: 'book', order: 10 } })
  ss.route({ path: '/recipes/new', component: RecipeEditPage })
  ss.route({ path: '/recipes/:id', component: RecipeDetailPage })
  ss.route({ path: '/recipes/:id/edit', component: RecipeEditPage })

  if (ss.settings?.section) {
    ss.settings.section({
      id: 'recipe-tags',
      title: 'Recipe Tags',
      order: 30,
      component: RecipeTagSettings,
    })
  }

  // Hubs
  ss.intent.hub({ id: 'recipe:create', title: 'Add or Import Recipe' })
  ss.intent.provider({
    hub: 'recipe:create',
    id: 'manual',
    title: 'Blank recipe',
    icon: 'plus',
    order: 100,
    kind: 'headless',
    execute: () => {
      if (ss.navigate) ss.navigate('/recipes/new')
      else window.location.href = ss.url ? ss.url('/recipes/new') : '/recipes/new'
    },
  })

  ss.intent.hub({ id: 'recipe:actions', title: 'Recipe Actions' })
  ss.intent.provider({
    hub: 'recipe:actions',
    id: 'edit',
    title: 'Edit',
    order: 10,
    kind: 'headless',
    execute: (ctx: any) => {
      if (ctx?.recipe?.id) {
        if (ss.navigate) ss.navigate(`/recipes/${ctx.recipe.id}/edit`)
        else window.location.href = ss.url ? ss.url(`/recipes/${ctx.recipe.id}/edit`) : `/recipes/${ctx.recipe.id}/edit`
      }
    },
  })
  ss.intent.provider({
    hub: 'recipe:actions',
    id: 'delete',
    title: 'Delete',
    icon: 'trash',
    order: 999,
    kind: 'headless',
    isAvailable: (ctx: any) => !!recipeGroupId(ctx?.recipe || {}),
    execute: async (ctx: any) => {
      if (!ctx?.recipe) return false
      ctx.onBeforeDelete?.()
      try {
        const deleted = await confirmAndDeleteRecipe(ss, ctx.recipe)
        if (!deleted) ctx.onDeleteAborted?.()
        return deleted
      } catch (err) {
        ctx.onDeleteAborted?.()
        throw err
      }
    },
  })
}
