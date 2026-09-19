import TranslateAction from './TranslateAction.vue'

export default function activate(ss: any) {
  if (ss.slot) {
    ss.slot('recipe.card.actions', TranslateAction, { order: 30 })
    ss.slot('recipe.detail.sidebar', TranslateAction, { order: 30 })
  }

  if (ss.intent?.provider) {
    ss.intent.provider({
      hub: 'recipe:actions',
      id: 'ai-translate',
      title: 'Translate Recipe (AI)',
      order: 30,
      execute: (ctx: any) => {
        // Can open translation dialog
      },
    })
  }
}

export { TranslateAction }
