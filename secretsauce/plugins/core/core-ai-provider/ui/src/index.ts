import AiSettings from './AiSettings.vue'

export default function activate(ss: any) {
  if (ss.settings?.section) {
    ss.settings.section({
      id: 'core-ai-provider',
      title: 'AI & Budget',
      component: AiSettings,
      order: 80,
    })
  }
}
