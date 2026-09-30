import type { SecretSauceUI } from '@secretsauce/ui'
import ShoppingListPage from './ShoppingListPage.vue'

export default function activate(ss: SecretSauceUI) {
  ss.route({ path: '/shopping-list', component: ShoppingListPage,
    nav: { label: 'Shopping list', icon: 'shopping-cart', order: 30 } })
}
export { ShoppingListPage }
