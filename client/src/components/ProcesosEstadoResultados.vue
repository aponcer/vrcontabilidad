<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'
import ReporteEstadoResultadosModal from './ReporteEstadoResultadosModal.vue'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run } = useBarraProgreso()

const periodo = ref('')

const showReporteModal = ref(false)
const reporteData = ref([])
const empresaData = ref({})

onMounted(() => {
  emit('set-title', 'Estado de Resultados')
})

// Procesar_Click: toma el Balance ya procesado del período y separa cada cuenta
// en Ganancia/Pérdida en la tabla de resultados.
const handleProcesar = async () => {
  if (!periodo.value.trim()) return alert('Ingresa el Período.')

  try {
    const res = await run(() => axios.post('http://localhost:3000/api/estado-resultados/procesar', {
      periodo: periodo.value.trim()
    }), 'Procesando Estado de Resultados...')
    estadoMensaje.value = res.data.message
  } catch (err) {
    estadoMensaje.value = 'Error al procesar.'
    alert('Error al procesar: ' + (err.response?.data?.error || err.message))
  }
}

// Imprimir (Est_resul.rpt): a diferencia del reporte original (que no filtraba
// por Periodo en su SQL base -- ver nota en el backend), acá sí se filtra por
// el período ingresado.
const handleImprimir = async () => {
  if (!periodo.value.trim()) return alert('Ingresa el Período.')

  try {
    const res = await axios.get('http://localhost:3000/api/reportes/estado-resultados', {
      params: { periodo: periodo.value.trim() }
    })
    reporteData.value = res.data.data
    empresaData.value = res.data.empresa || {}
    showReporteModal.value = true
  } catch (err) {
    alert('Error al obtener el Estado de Resultados: ' + (err.response?.data?.error || err.message))
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Estado de Resultados</h2>
      <span class="text-xs text-slate-400 font-mono">Est_Resultado.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div class="flex-1 flex flex-col items-center justify-center space-y-4">
          <div class="flex items-center space-x-4 bg-slate-800/80 p-6 rounded-lg border border-slate-700/80 shadow-inner">
            <label class="text-sm font-semibold text-slate-300">Período</label>
            <input
              v-model="periodo"
              type="text"
              placeholder="AAAAMM"
              class="w-32 bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500 shadow-sm"
            />
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" />
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

    <ReporteEstadoResultadosModal
      :show="showReporteModal"
      :periodo="periodo"
      :reportData="reporteData"
      :empresa="empresaData"
      @close="showReporteModal = false"
    />
  </div>
</template>
