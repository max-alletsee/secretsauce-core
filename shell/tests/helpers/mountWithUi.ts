import { mount, config, type MountingOptions } from '@vue/test-utils'
import type { Component, App } from 'vue'
import { installUi } from '../../src/ui/install'
import { createThemeRegistry } from '../../src/theme'

export const UI_TEST_PLUGIN = { install: (app: App) => installUi(app, { themes: createThemeRegistry() }) }
export function mountWithUi(component: Component, options: MountingOptions<any> = {}) {
  return mount(component as any, { ...options, global: {
    ...options.global,
    plugins: [ ...(config.global.plugins.includes(UI_TEST_PLUGIN) ? [] : [UI_TEST_PLUGIN]), ...(options.global?.plugins || []) ],
  } })
}
