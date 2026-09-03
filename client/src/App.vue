<script setup>
import { ref, watch, watchEffect, onMounted } from 'vue'
import axios from 'axios'
import Mantenedores from './components/Mantenedores.vue'
import ProcesosComprasVentas from './components/ProcesosComprasVentas.vue'
import ProcesosContabComprasVentas from './components/ProcesosContabComprasVentas.vue'
import ProcesosComprobanteDiario from './components/ProcesosComprobanteDiario.vue'
import ProcesosBalance8Columnas from './components/ProcesosBalance8Columnas.vue'
import ProcesosLibros from './components/ProcesosLibros.vue'
import ProcesosEstadoResultados from './components/ProcesosEstadoResultados.vue'
import ProcesosConsultas from './components/ProcesosConsultas.vue'
import ProcesosFormularios from './components/ProcesosFormularios.vue'
import AnalisisClientesProveedores from './components/AnalisisClientesProveedores.vue'
import DeclaracionesJuradas from './components/DeclaracionesJuradas.vue'
import RemuneracionesMantenedor from './components/RemuneracionesMantenedor.vue'
import RemuneracionesLiquidaciones from './components/RemuneracionesLiquidaciones.vue'
import RemuneracionesAnticipoSueldo from './components/RemuneracionesAnticipoSueldo.vue'

const activeMenu = ref(null)
const currentView = ref('home')
const serverStatus = ref('Cargando...')
const subViewTitle = ref('')

// Las empresas se piden al backend (server/empresas.js, fuera de git) en vez
// de venir escritas acá, para que el código público -- y el bundle ya
// compilado -- no revele clientes reales. Ver server/empresas.example.js.
const companies = ref([])
const activeCompany = ref({ id: '', name: 'Cargando...', status: 'unconfigured', dbFile: '' })

const updateAxiosCompanyHeader = (companyId) => {
  axios.defaults.headers.common['x-company-id'] = companyId
}

const cargarEmpresas = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/empresas')
    companies.value = res.data.data || []
    activeCompany.value = companies.value[0] || { id: '', name: 'Sin empresas configuradas', status: 'unconfigured', dbFile: '' }
  } catch (err) {
    console.error('Error cargando empresas:', err.message)
    activeCompany.value = { id: '', name: 'Error al cargar empresas', status: 'offline', dbFile: '' }
  }
}

watch(activeCompany, (newCompany) => {
  updateAxiosCompanyHeader(newCompany.id)
}, { immediate: true })

const toggleMenu = (menuName) => {
  activeMenu.value = activeMenu.value === menuName ? null : menuName
}

const closeMenus = () => {
  activeMenu.value = null
}

const navigateTo = (viewName) => {
  currentView.value = viewName
  activeMenu.value = null
  subViewTitle.value = ''
}

const handleSetTitle = (title) => {
  subViewTitle.value = title
}

// Helper para Capitalizar la primera letra
const capitalize = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

watchEffect(() => {
  const empresa = activeCompany.value?.name || 'Sin Empresa'
  
  if (currentView.value === 'home') {
    document.title = `VReyes Contabilidad | ${empresa} | Inicio`
  } else {
    document.title = `VReyes Contabilidad | ${empresa} | ${subViewTitle.value}`
  }
})

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'online':
      return 'bg-emerald-400 animate-pulse'
    case 'offline':
      return 'bg-red-500'
    case 'unconfigured':
    default:
      return 'bg-slate-900 border border-slate-600'
  }
}

onMounted(async () => {
  cargarEmpresas()
  try {
    const res = await axios.get('http://localhost:3000/api/health')
    serverStatus.value = res.data.message
  } catch (err) {
    serverStatus.value = 'Error al conectar'
  }
})
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8 flex items-center justify-center font-sans" @click="closeMenus">
    <div class="w-full max-w-5xl bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col min-h-135">
      
      <!-- Menú Superior -->
      <header class="bg-slate-800/90 border-b border-slate-700 px-4 h-14 flex items-center justify-between relative z-50" @click.stop>
        <nav class="flex space-x-1 text-sm font-medium">
          <button 
            @click="navigateTo('mantenciones')"
            :class="['px-3 py-1.5 rounded transition-colors', currentView === 'mantenciones' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'hover:bg-slate-700/60 text-slate-200']">
            Mantenciones
          </button>

          <!-- Procesos (Desplegable) -->
          <div class="relative">
            <button 
              @click="toggleMenu('procesos')"
              :class="['px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5', activeMenu === 'procesos' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'hover:bg-slate-700/60 text-slate-200']">
              <span>Procesos</span>
              <svg class="w-3.5 h-3.5 transition-transform" :class="{'rotate-180': activeMenu === 'procesos'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="activeMenu === 'procesos'" class="absolute left-0 mt-1 w-60 bg-slate-800 border border-slate-700 rounded shadow-2xl py-1 z-50">
              <a href="#" @click.prevent="navigateTo('comprasVentas')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Compras y Ventas</a>
              <a href="#" @click.prevent="navigateTo('contabComprasVentas')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Contab. Compras y Ventas</a>
              <a href="#" @click.prevent="navigateTo('comprobanteDiario')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Comprobante Diario</a>
              <a href="#" @click.prevent="navigateTo('balance')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Balance</a>
              <a href="#" @click.prevent="navigateTo('estadoResultados')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Estado Resultados</a>
              <a href="#" @click.prevent="navigateTo('libros')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Libros</a>
              <a href="#" @click.prevent="navigateTo('consultas')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Consultas</a>
              <a href="#" @click.prevent="navigateTo('formularios')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Formularios</a>
            </div>
          </div>

          <button
            @click="navigateTo('analisisCtasCtes')"
            :class="['px-3 py-1.5 rounded transition-colors', currentView === 'analisisCtasCtes' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'hover:bg-slate-700/60 text-slate-200']">
            Analisis Ctas. Ctes.
          </button>

          <div class="relative">
            <button
              @click="toggleMenu('remuneraciones')"
              :class="['px-3 py-1.5 rounded transition-colors flex items-center space-x-1.5', activeMenu === 'remuneraciones' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'hover:bg-slate-700/60 text-slate-200']">
              <span>Remuneraciones</span>
              <svg class="w-3.5 h-3.5 transition-transform" :class="{'rotate-180': activeMenu === 'remuneraciones'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="activeMenu === 'remuneraciones'" class="absolute left-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded shadow-2xl py-1 z-50">
              <a href="#" @click.prevent="navigateTo('remuMantenciones')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Mantenciones</a>
              <a href="#" @click.prevent="navigateTo('liquidacionSueldo')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Liquidación Sueldo</a>
              <a href="#" @click.prevent="navigateTo('anticipoSueldo')" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-emerald-400">Anticipo Sueldo</a>
            </div>
          </div>

          <button
            @click="navigateTo('declaracionesJuradas')"
            :class="['px-3 py-1.5 rounded transition-colors', currentView === 'declaracionesJuradas' ? 'bg-slate-700 text-emerald-400 font-semibold' : 'hover:bg-slate-700/60 text-slate-200']">
            Declaraciones Juradas
          </button>

          <button @click="navigateTo('home')" class="px-3 py-1.5 rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
            Salir
          </button>
        </nav>

        <!-- Selector Desplegable de Empresas -->
        <div class="relative" @click.stop>
          <button 
            @click="toggleMenu('empresas')"
            class="px-3 py-1 bg-slate-900/80 border border-slate-700 hover:border-slate-500 rounded-lg flex items-center space-x-2 transition-colors cursor-pointer">
            
            <span :class="['w-2 h-2 rounded-full', getStatusBadgeClass(activeCompany.status)]"></span>
            
            <span class="text-xs font-semibold text-slate-300 uppercase tracking-wide">{{ activeCompany.name }}</span>
            <svg class="w-3.5 h-3.5 text-slate-400 transition-transform" :class="{'rotate-180': activeMenu === 'empresas'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div v-if="activeMenu === 'empresas'" class="absolute right-0 mt-1 w-60 bg-slate-800 border border-slate-700 rounded shadow-2xl py-1 z-50 divide-y divide-slate-700/50">
            <button 
              v-for="comp in companies" 
              :key="comp.id"
              :disabled="comp.status === 'unconfigured'"
              @click="comp.status !== 'unconfigured' && (activeCompany = comp, closeMenus())" 
              class="w-full text-left px-4 py-2.5 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer">
              
              <div class="flex items-center space-x-2.5">
                <span :class="['w-2 h-2 rounded-full', getStatusBadgeClass(comp.status)]"></span>
                <span>{{ comp.name }}</span>
              </div>

              <span v-if="activeCompany.id === comp.id" class="text-emerald-400 font-bold">✓</span>
            </button>
          </div>
        </div>
      </header>

      <!-- Área de Trabajo -->
      <main class="flex-1 p-6 flex flex-col justify-between bg-slate-900/40">
        <div v-if="currentView === 'home'" class="flex-1 flex flex-col items-center justify-center space-y-4">
          <div class="p-8 bg-slate-800/90 border border-slate-700 rounded-2xl shadow-xl text-center max-w-md w-full">
            <h1 class="text-2xl font-bold text-emerald-400 italic tracking-wide">
              {{ activeCompany.name }}
            </h1>
            <p class="text-xs text-slate-400 mt-2">Sistema Contable & Remuneraciones</p>
          </div>
        </div>

        <Mantenedores
          v-else-if="currentView === 'mantenciones'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosComprasVentas
          v-else-if="currentView === 'comprasVentas'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosContabComprasVentas
          v-else-if="currentView === 'contabComprasVentas'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosComprobanteDiario
          v-else-if="currentView === 'comprobanteDiario'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosBalance8Columnas
          v-else-if="currentView === 'balance'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosLibros
          v-else-if="currentView === 'libros'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosEstadoResultados
          v-else-if="currentView === 'estadoResultados'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosConsultas
          v-else-if="currentView === 'consultas'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <ProcesosFormularios
          v-else-if="currentView === 'formularios'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <AnalisisClientesProveedores
          v-else-if="currentView === 'analisisCtasCtes'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <DeclaracionesJuradas
          v-else-if="currentView === 'declaracionesJuradas'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <RemuneracionesMantenedor
          v-else-if="currentView === 'remuMantenciones'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <RemuneracionesLiquidaciones
          v-else-if="currentView === 'liquidacionSueldo'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <RemuneracionesAnticipoSueldo
          v-else-if="currentView === 'anticipoSueldo'"
          :activeCompany="activeCompany"
          @close="navigateTo('home')"
          @set-title="handleSetTitle"
        />

        <!-- Footer -->
        <div class="mt-4 p-3 rounded-lg bg-slate-900/60 border border-slate-700/80 flex items-center justify-between text-xs">
          <span class="text-slate-400">Estado Backend: <strong class="text-slate-200">{{ serverStatus }}</strong></span>
          <span class="text-slate-500">Base de datos: <strong class="text-slate-300">SQLite ({{ activeCompany.dbFile }})</strong></span>
        </div>
      </main>

    </div>
  </div>
</template>