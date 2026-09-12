import RecipeListPage from './pages/RecipeListPage.vue'
import RecipeDetailPage from './pages/RecipeDetailPage.vue'
import RecipeEditPage from './pages/RecipeEditPage.vue'

export default function activate(ss: any) {
  // Routes
  ss.route({ path: '/recipes', component: RecipeListPage, nav: { label: 'Recipes', icon: 'book', order: 10 } })
  ss.route({ path: '/recipes/new', component: RecipeEditPage })
  ss.route({ path: '/recipes/:id', component: RecipeDetailPage })
  ss.route({ path: '/recipes/:id/edit', component: RecipeEditPage })

  // Hubs
  ss.intent.hub({ id: 'recipe:create', title: 'Add or Import Recipe' })
  ss.intent.provider({
    hub: 'recipe:create',
    id: 'manual',
    title: 'Manual Recipe',
    order: 100,
    kind: 'headless',
    execute: () => {
      window.location.hash = '#/recipes/new'
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
        window.location.hash = `#/recipes/${ctx.recipe.id}/edit`
      }
    },
  })
}
