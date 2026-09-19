import ShoppingListPage from './ShoppingListPage.vue'

export default function activate(ss: any) {
  if (ss.route) {
    ss.route({
      path: '/shopping-list',
      name: 'shopping-list',
      component: ShoppingListPage,
      meta: {
        title: 'Shopping List',
        nav: {
          label: 'Shopping List',
          icon: '🛒',
          order: 35,
        },
      },
    })
  }

  if (ss.intent?.provider) {
    ss.intent.provider({
      hub: 'shopping:view',
      id: 'core-shopping-list',
      title: 'View Shopping List',
      order: 10,
      execute: (ctx: any) => {
        if (ctx?.router) {
          ctx.router.push('/shopping-list')
        }
      },
    })
  }
}

export { ShoppingListPage }
