<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-stone-200">
        <h3 class="font-semibold text-stone-900 text-lg">Import Recipe with AI</h3>
        <button class="text-stone-400 hover:text-stone-600 font-bold text-lg" @click="close">×</button>
      </div>

      <!-- Mode Tabs -->
      <div class="flex border-b border-stone-200 bg-stone-50 text-sm">
        <button
          class="flex-1 py-2.5 font-medium border-b-2 transition"
          :class="mode === 'url' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-stone-600 hover:text-stone-900'"
          @click="mode = 'url'"
        >
          🌐 From URL
        </button>
        <button
          class="flex-1 py-2.5 font-medium border-b-2 transition"
          :class="mode === 'text' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-stone-600 hover:text-stone-900'"
          @click="mode = 'text'"
        >
          📝 Raw Text / Paste
        </button>
        <button
          class="flex-1 py-2.5 font-medium border-b-2 transition"
          :class="mode === 'image' ? 'border-emerald-600 text-emerald-700 bg-white' : 'border-transparent text-stone-600 hover:text-stone-900'"
          @click="mode = 'image'"
        >
          📷 Photo / OCR
        </button>
      </div>

      <!-- Body / Form Area -->
      <div class="p-4 flex-1 overflow-y-auto space-y-4">
        <!-- URL Input -->
        <div v-if="mode === 'url'" class="space-y-2">
          <label class="block text-xs font-semibold uppercase text-stone-600">Recipe Webpage URL</label>
          <input
            v-model="urlInput"
            type="url"
            placeholder="https://www.seriouseats.com/..."
            class="input-url w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <!-- Text Input -->
        <div v-if="mode === 'text'" class="space-y-2">
          <label class="block text-xs font-semibold uppercase text-stone-600">Paste Recipe or Ingredients</label>
          <textarea
            v-model="textInput"
            rows="6"
            placeholder="Grandma's secret sauce: 2 cans crushed tomatoes, 4 cloves garlic, 1 tbsp oregano..."
            class="textarea-text w-full border border-stone-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 font-mono text-xs"
          ></textarea>
        </div>

        <!-- Image Input -->
        <div v-if="mode === 'image'" class="space-y-2">
          <label class="block text-xs font-semibold uppercase text-stone-600">Upload Recipe Image</label>
          <input
            type="file"
            accept="image/*"
            class="file-input block w-full text-xs text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            @change="handleFileUpload"
          />
          <div v-if="imagePreview" class="mt-2 max-h-48 overflow-hidden rounded border border-stone-200">
            <img :src="imagePreview" class="object-contain max-h-48 mx-auto" />
          </div>
        </div>

        <!-- Extract Button -->
        <div v-if="!extractedRecipe && !extracting" class="pt-2">
          <button
            class="btn-extract w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition"
            :disabled="!canExtract"
            @click="extractRecipe"
          >
            Extract Recipe
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="extracting" class="py-8 text-center space-y-2">
          <div class="inline-block animate-spin text-2xl">⏳</div>
          <div class="text-sm font-medium text-stone-700">Extracting recipe with AI...</div>
          <div class="text-xs text-stone-400">Parsing ingredients, quantities, and steps</div>
        </div>

        <!-- Error State -->
        <div v-if="errorMessage" class="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
          {{ errorMessage }}
        </div>

        <!-- Preview Extracted Recipe -->
        <div v-if="extractedRecipe" class="extracted-preview space-y-3 pt-2 border-t border-stone-200">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-stone-900">{{ extractedRecipe.title }}</h4>
            <span class="text-xs text-stone-500">{{ extractedRecipe.servings || 4 }} servings</span>
          </div>

          <p v-if="extractedRecipe.description" class="text-xs text-stone-600 italic">
            {{ extractedRecipe.description }}
          </p>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span class="font-semibold text-stone-700">Ingredients ({{ extractedRecipe.ingredients?.length || 0 }}):</span>
              <ul class="list-disc pl-4 mt-1 space-y-0.5 text-stone-600">
                <li v-for="(ing, idx) in extractedRecipe.ingredients" :key="idx">
                  {{ ing.raw_text || `${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim() }}
                </li>
              </ul>
            </div>
            <div>
              <span class="font-semibold text-stone-700">Steps ({{ extractedRecipe.steps?.length || 0 }}):</span>
              <ol class="list-decimal pl-4 mt-1 space-y-0.5 text-stone-600">
                <li v-for="(s, idx) in extractedRecipe.steps" :key="idx">
                  {{ s.instruction }}
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 border-t border-stone-200 flex items-center justify-end gap-2 bg-stone-50">
        <button class="btn-cancel px-4 py-2 border border-stone-300 rounded text-sm text-stone-700 hover:bg-stone-100" @click="close">
          Cancel
        </button>
        <button
          v-if="extractedRecipe"
          class="btn-save px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium transition"
          :disabled="saving"
          @click="saveRecipe"
        >
          {{ saving ? 'Saving...' : 'Save to Recipes' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'

const props = defineProps<{
  isOpen?: boolean
  ss?: any
}>()

const emit = defineEmits<{
  close: []
  saved: [recipeId: string]
}>()

const api = props.ss?.api || inject<any>('__SS_API__', null)
const notify = props.ss?.notify || inject<any>('__SS_NOTIFY__', null)

const mode = ref<'url' | 'text' | 'image'>('url')
const urlInput = ref('')
const textInput = ref('')
const imageBase64 = ref('')
const imageMime = ref('image/jpeg')
const imagePreview = ref('')

const extracting = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const extractedRecipe = ref<any>(null)

const canExtract = computed(() => {
  if (mode.value === 'url') return Boolean(urlInput.value.trim())
  if (mode.value === 'text') return Boolean(textInput.value.trim())
  if (mode.value === 'image') return Boolean(imageBase64.value)
  return false
})

function handleFileUpload(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  imageMime.value = file.type || 'image/jpeg'
  const reader = new FileReader()
  reader.onload = () => {
    const res = reader.result as string
    imagePreview.value = res
    // Strip data:image/...;base64,
    imageBase64.value = res.split(',')[1] || res
  }
  reader.readAsDataURL(file)
}

async function extractRecipe() {
  if (!api || !canExtract.value) return
  extracting.value = true
  errorMessage.value = ''
  extractedRecipe.value = null

  try {
    let endpoint = ''
    let payload: any = {}

    if (mode.value === 'url') {
      endpoint = '/api/x/core-recipe-importer/parse-url'
      payload = { url: urlInput.value.trim(), auto_save: false }
    } else if (mode.value === 'text') {
      endpoint = '/api/x/core-recipe-importer/parse-text'
      payload = { text: textInput.value.trim(), auto_save: false }
    } else if (mode.value === 'image') {
      endpoint = '/api/x/core-recipe-importer/parse-image'
      payload = { image_base64: imageBase64.value, mime_type: imageMime.value, auto_save: false }
    }

    const data = await api.post(endpoint, payload)
    extractedRecipe.value = data
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to extract recipe with AI'
  } finally {
    extracting.value = false
  }
}

async function saveRecipe() {
  if (!api || !extractedRecipe.value) return
  saving.value = true
  try {
    const res = await api.post('/api/recipes', extractedRecipe.value)
    const recipeId = res?.id || res?.data?.id
    if (notify) {
      notify({ level: 'success', message: 'Recipe imported successfully!' })
    }
    emit('saved', recipeId)
    close()
  } catch (err: any) {
    errorMessage.value = err?.message || 'Failed to save recipe'
  } finally {
    saving.value = false
  }
}

function close() {
  extractedRecipe.value = null
  errorMessage.value = ''
  emit('close')
}
</script>
