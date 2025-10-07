import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { WagmiPlugin } from '@wagmi/vue'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { wagmiConfig } from './core/web3'
import './style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(VueQueryPlugin) // 必须在 WagmiPlugin 之前初始化
app.use(WagmiPlugin, { config: wagmiConfig })

app.mount('#app')