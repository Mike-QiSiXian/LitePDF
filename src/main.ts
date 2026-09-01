import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { installBrowserLitePdfShim } from './browser/litepdf-shim'
import { initI18n } from './i18n'
import App from './App.vue'
import './styles/app.css'

// 纯浏览器访问 localhost:5173 时没有 Electron preload，注入调试替身
installBrowserLitePdfShim()

const platform = window.litepdf?.platform || 'browser'
document.documentElement.classList.add(`platform-${platform}`)

void initI18n().finally(() => {
  createApp(App).use(createPinia()).mount('#app')
})

