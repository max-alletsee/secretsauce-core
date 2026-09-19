import ShortlistAction from './ShortlistAction.vue'
import ShortlistFilter from './ShortlistFilter.vue'
import ShortlistSidebar from './ShortlistSidebar.vue'

export default function activate(ss: any) {
  ss.slot('recipe.card.actions', ShortlistAction, { order: 10 })
  ss.slot('recipe.list.filters', ShortlistFilter, { order: 10 })
  ss.slot('timeline.sidebar', ShortlistSidebar, { order: 20 })
}
