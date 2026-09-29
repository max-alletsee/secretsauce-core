import { createRouter, createWebHistory } from 'vue-router'
import SetupPage from './pages/SetupPage.vue'
import LoginPage from './pages/LoginPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
import SharePage from './pages/SharePage.vue'

export function buildRouter(basePath: string = '/') {
  let router: any

  const routes = [
    {
      path: '/',
      redirect: () => {
        try {
          const preferred = localStorage.getItem('secretsauce:default_start_page')
          if (preferred === '/timeline' || preferred === '/recipes') return preferred
        } catch { /* device storage is optional */ }
        if (router && router.getRoutes().some((r: any) => r.path === '/timeline')) {
          return '/timeline'
        }
        return '/recipes'
      },
    },
    { path: '/setup', component: SetupPage },
    { path: '/login', component: LoginPage },
    {
      path: '/settings',
      component: SettingsPage,
    },
    {
      path: '/plugins',
      redirect: '/settings?section=plugins',
    },
    { path: '/share', component: SharePage },
  ]

  router = createRouter({
    history: createWebHistory(basePath),
    routes,
  })

  return router
}
