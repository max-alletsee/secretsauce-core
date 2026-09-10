import { ref } from 'vue'

export function createI18nRegistry() {
  const messages = ref<Record<string, Record<string, string>>>({})

  function add(lang: string, msgs: Record<string, string>) {
    if (!messages.value[lang]) messages.value[lang] = {}
    Object.assign(messages.value[lang], msgs)
  }

  function t(key: string, params?: Record<string, string | number>, lang: string = 'en'): string {
    const dict = messages.value[lang] || messages.value['en'] || {}
    let text = dict[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return text
  }

  return { messages, add, t }
}
