import MealPlannerWidget from './MealPlannerWidget.vue'

export default function activate(ss: any) {
  if (ss.slot) {
    ss.slot('schedule.sidebar', MealPlannerWidget, { order: 10 })
  }

  if (ss.intent?.provider) {
    ss.intent.provider({
      hub: 'meal:plan',
      id: 'ai-planner',
      title: 'Generate Meal Plan (AI)',
      order: 10,
      execute: (ctx: any) => {
        // Can open meal planner modal/view
      },
    })
  }
}

export { MealPlannerWidget }
