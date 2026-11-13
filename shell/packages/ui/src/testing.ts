import { ref } from 'vue'
import type { SecretSauceUI, Member, Household, Outbox, ApiClient } from './types'

export function createFakeSecretSauceUI(pluginId: string = 'test-plugin'): SecretSauceUI {
  const currentMember = ref<Member | null>({
    id: 'm1',
    revision: 1,
    name: 'Alice',
    avatar_color: null,
    serving_ratio: 1.0,
    dietary_restrictions: [],
    allergies: [],
    disliked_ingredients: [],
    favorite_cuisines: [],
    preferred_language: 'en',
  })
  const members = ref<Member[]>([currentMember.value!])
  const household = ref<Household>({
    household_name: 'Test House',
    meal_types: [{ id: 'dinner', label: 'Dinner' }],
    languages: { primary: 'en' },
    units: 'metric',
    event_retention_days: 60,
  })
  const online = ref(true)

  const fakeApi: ApiClient = {
    get: async () => ({} as any),
    post: async () => ({} as any),
    patch: async () => ({} as any),
    put: async () => ({} as any),
    delete: async () => {},
    upload: async () => ({} as any),
  }

  const fakeOutbox: Outbox = {
    pending: ref(0),
    failed: ref([]),
    enqueue: async () => 'outbox-id-1',
    discard: async () => {},
    on: () => {},
  }

  return {
    pluginId,
    route: () => {},
    slot: () => {},
    intent: { hub: () => {}, provider: () => {} },
    settings: { section: () => {} },
    on: () => {},
    api: fakeApi,
    url: (path: string) => path,
    store: { currentMember, members, household, online },
    outbox: fakeOutbox,
    i18n: { add: () => {} },
    t: (key: string) => key,
    theme: { register: () => {} },
    notify: () => {},
    confirm: async () => false,
  }
}
