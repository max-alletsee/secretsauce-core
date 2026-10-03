import type { ApiClient } from '@secretsauce/ui'

/** Covers belong to recipe groups in the assets API, not to Recipe PATCH fields. */
export async function fetchCoverId(api: ApiClient, groupId: string): Promise<string | null> {
  if (!groupId) return null
  try {
    const assets = await api.get<{ id: string; slot: string }[]>('/api/assets', { entity_type: 'recipe', entity_id: groupId })
    return assets.filter(asset => asset.slot === 'cover').at(-1)?.id || null
  } catch {
    // Media is optional: recipe text remains usable if its cached assets are unavailable offline.
    return null
  }
}
