export const SHOW_RECIPE_IMAGES_KEY = 'secretsauce:show_recipe_images'

export function getShowRecipeImages(): boolean {
  try {
    return localStorage.getItem(SHOW_RECIPE_IMAGES_KEY) !== 'false'
  } catch {
    return true
  }
}

export function setShowRecipeImages(show: boolean): void {
  try {
    if (show) {
      localStorage.removeItem(SHOW_RECIPE_IMAGES_KEY)
    } else {
      localStorage.setItem(SHOW_RECIPE_IMAGES_KEY, 'false')
    }
  } catch {
    // Device storage is optional.
  }
}
