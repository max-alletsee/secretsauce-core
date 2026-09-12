import { createRouter, createWebHistory } from 'vue-router'
import SetupPage from './pages/SetupPage.vue'
import LoginPage from './pages/LoginPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import PluginManagerPage from './pages/PluginManagerPage.vue'
import SharePage from './pages/SharePage.vue'

export function buildRouter(basePath: string = '/') {
  return createRouter({
    history: createWebHistory(basePath),
    routes: [
      { path: '/', redirect: '/recipes' },
      { path: '/setup', component: SetupPage },
      { path: '/login', component: LoginPage },
      {
        path: '/settings',
        component: SettingsPage,
        nav: { label: 'Settings', icon: 'cog', order: 900 } as any,
      },
      {
        path: '/plugins',
        component: PluginManagerPage,
        nav: { label: 'Plugins', icon: 'box', order: 910 } as any,
      },
      { path: '/share', component: SharePage },
    ],
  })
}
