<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

// "Tab 2" del .frm original está vacío (0 controles) -- se omite a propósito.
const activeTab = ref('hojasSueltas') // 'hojasSueltas' | 'libroSueldos'

const folioInicial = ref('')
const folioFinal = ref('')
const periodo = ref('')

onMounted(async () => {
  emit('set-title', 'Formularios SII')
  await cargarFolioInicial()
})

// Al cambiar de pestaña, limpia la barra (mismo criterio que el resto de los módulos)
watch(activeTab, () => reset())

// Form_Load: precarga el Folio Inicial con el próximo folio disponible.
const cargarFolioInicial = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/formularios/hojas-sueltas/info')
    folioInicial.value = res.data.folioInicial
  } catch (err) {
    console.error('Error cargando el folio inicial:', err.message)
  }
}

// Procesar_Click
const handleProcesar = async () => {
  if (activeTab.value === 'hojasSueltas') {
    if (!folioInicial.value || !folioFinal.value) return alert('Ingresa el Folio Inicial y el Folio Final.')
    if (Number(folioFinal.value) < Number(folioInicial.value)) return alert('El Folio Final debe ser mayor o igual al Folio Inicial.')

    try {
      const res = await run(() => axios.post('http://localhost:3000/api/formularios/hojas-sueltas/procesar', {
        folioInicial: folioInicial.value,
        folioFinal: folioFinal.value
      }), 'Generando Hojas Sueltas...')
      estadoMensaje.value = res.data.message
      folioFinal.value = ''
      await cargarFolioInicial()
    } catch (err) {
      estadoMensaje.value = 'Error al procesar.'
      alert('Error al procesar: ' + (err.response?.data?.error || err.message))
    }
  } else {
    if (!periodo.value.trim()) return alert('Ingresa el Período.')

    try {
      const res = await run(() => axios.post('http://localhost:3000/api/formularios/libro-sueldos/procesar', {
        periodo: periodo.value.trim()
      }), 'Procesando Libro de Sueldos...')
      estadoMensaje.value = res.data.message
    } catch (err) {
      estadoMensaje.value = 'Error al procesar.'
      alert('Error al procesar: ' + (err.response?.data?.error || err.message))
    }
  }
}

// Imprimir (Hojas_sueltas.rpt / Libro_rem.rpt): los formularios SII todavía no
// existen -- pendientes de confirmar con el contador.
const handleImprimir = () => {
  alert('Imprimir pendiente: el formulario SII (.rpt) todavía no existe -- pendiente de confirmar con el contador.')
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Formularios SII</h2>
      <span class="text-xs text-slate-400 font-mono">Hojas.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div>
          <!-- Pestañas -->
          <div class="flex border-b border-slate-700 space-x-1 mb-4">
            <button
              @click="activeTab = 'hojasSueltas'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'hojasSueltas' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Hojas Sueltas
            </button>
            <button
              @click="activeTab = 'libroSueldos'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'libroSueldos' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Libro Sueldos
            </button>
          </div>

          <!-- Tab Hojas Sueltas -->
          <div v-if="activeTab === 'hojasSueltas'" class="space-y-6 py-8 flex flex-col items-center">
            <div class="space-y-3 w-full max-w-xs">
              <div class="flex items-center space-x-3">
                <label class="w-28 text-right text-sm text-slate-300 font-medium">Folio Inicial</label>
                <input v-model="folioInicial" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-28 text-right text-sm text-slate-300 font-medium">Folio Final</label>
                <input v-model="folioFinal" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <!-- Tab Libro Sueldos -->
          <div v-else-if="activeTab === 'libroSueldos'" class="space-y-6 py-8 flex flex-col items-center">
            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Período</label>
              <input v-model="periodo" type="text" placeholder="AAAAMM" class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel Lateral -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center min-h-95">
        <button
          @click="handleProcesar"
          :disabled="cargando"
          class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic shadow">
          Procesar
        </button>
        <button
          @click="handleImprimir"
          :disabled="cargando"
          class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Imprimir
        </button>
        <button
          @click="emit('close')"
          class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Salir
        </button>
      </div>
    </div>
  </div>
</template>
