import { ref } from 'vue'

export type RecipeSourceType = 'website' | 'cookbook' | 'person' | 'other'

export interface RecipeSource {
  type: RecipeSourceType
  name: string
  author?: string | null
  page?: string | null
  url?: string | null
  notes?: string | null
}

export interface SourceSummary {
  name: string
  type: RecipeSourceType
  author?: string | null
  count: number
}

/**
 * Ephemeral in-memory handoff when clicking a Recipe Source on RecipeDetailPage
 * to open RecipeListPage pre-filtered to that source (without URL query params).
 */
export const pendingSourceFilter = ref<string[] | null>(null)

export function sourceIcon(type?: string | null): string {
  switch (type) {
    case 'cookbook':
      return 'pi pi-book'
    case 'website':
      return 'pi pi-globe'
    case 'person':
      return 'pi pi-user'
    default:
      return 'pi pi-bookmark'
  }
}

export function sourceTypeLabel(type?: string | null): string {
  switch (type) {
    case 'cookbook':
      return 'Cookbook'
    case 'website':
      return 'Website'
    case 'person':
      return 'Person'
    default:
      return 'Other'
  }
}
