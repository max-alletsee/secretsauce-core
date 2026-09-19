import ImportRecipeModal from './ImportRecipeModal.vue'

export default function activate(ss: any) {
  if (ss.intent?.provider) {
    ss.intent.provider({
      hub: 'recipe:create',
      id: 'ai-import',
      title: 'Import with AI (URL, Photo, Text)',
      order: 15,
      execute: (ctx: any) => {
        if (ctx?.openImportModal) {
          ctx.openImportModal()
        }
      },
    })
  }

  if (ss.slot) {
    ss.slot('recipe.list.actions', ImportRecipeModal, { order: 20 })
  }
}

export { ImportRecipeModal }
