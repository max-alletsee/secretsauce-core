<template>
  <div class="translator-widget inline-flex items-center gap-2">
    <div v-if="!showDialog">
      <button
        type="button"
        class="btn-open-translate text-xs px-2.5 py-1.5 rounded border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 flex items-center gap-1.5 shadow-sm transition"
        :title="'Translate ' + (recipe?.title || 'recipe')"
        @click="showDialog = true"
      >
        <span>🌐</span>
        <span class="font-medium">Translate</span>
      </button>
    </div>

    <!-- Modal Dialog -->
    <div v-if="showDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-sm p-4 space-y-3">
        <div class="flex items-center justify-between border-b pb-2">
          <h4 class="font-semibold text-stone-900 text-sm">Translate Recipe</h4>
          <button class="text-stone-400 hover:text-stone-600 font-bold" @click="close">✕</button>
        </div>

        <p class="text-xs text-stone-600">
          Translate <strong>{{ recipe?.title }}</strong> to another language using AI.
        </p>

        <div class="space-y-1">
          <label class="block text-xs font-medium text-stone-700">Target Language</label>
          <select
            v-model="targetLang"
            class="select-target-lang w-full border border-stone-300 rounded px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-emerald-500"
            :disabled="translating"
          >
            <option value="es">Spanish (Español)</option>
            <option value="fr">French (Français)</option>
            <option value="de">German (Deutsch)</option>
            <option value="it">Italian (Italiano)</option>
            <option value="pt">Portuguese (Português)</option>
            <option value="ja">Japanese (日本語)</option>
            <option value="zh">Chinese (中文)</option>
            <option value="en">English</option>
          </select>
        </div>

        <div v-if="errorMessage" class="text-xs text-red-600 bg-red-50 p-2 rounded">
          {{ errorMessage }}
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            class="px-3 py-1.5 text-xs border border-stone-300 rounded text-stone-600 hover:bg-stone-50"
            :disabled="translating"
            @click="close"
          >
            Cancel
          </button>
          <button
            type="button"
            class="btn-do-translate px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded transition flex items-center gap-1"
            :disabled="translating || !targetLang"
            @click="doTranslate"
          >
            <span v-if="translating" class="animate-spin">⏳</span>
            <span>{{ translating ? 'Translating...' : 'Translate' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'

const props = defineProps<{
  context?: { recipe?: any }
  recipe?: any
  ss?: any
}>()

const emit = defineEmits<{
  translated: [newRecipe: any]
}>()

const recipe = computed(() => props.recipe || props.context?.recipe)
const api = props.ss?.api || inject<any>('__SS_API__', null)
const notify = props.ss?.notify || inject<any>('__SS_NOTIFY__', null)

const showDialog = ref(false)
const targetLang = ref('es')
const translating = ref(false)
const errorMessage = ref('')

function close() {
  showDialog.value = false
  errorMessage.value = ''
}

async function doTranslate() {
  if (!api || !recipe.value?.id) return
  translating.value = true
  errorMessage.value = ''

  try {
    const res = await api.post('/api/x/core-translator/translate', {
      recipe_id: recipe.value.id,
      target_language: targetLang.value,
    })

    if (notify) {
      notify({ level: 'success', message: `Recipe translated to ${targetLang.value.toUpperCase()}!` })
    }
    emit('translated', res)
    close()
  } catch (err: any) {
    errorMessage.value = err?.message || 'Translation failed'
  } finally {
    translating.value = false
  }
}
</script>
