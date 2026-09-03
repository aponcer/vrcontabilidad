<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import ReporteBalanceModal from './ReporteBalanceModal.vue'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const fechaCorte = ref(new Date().toISOString().split('T')[0])
const { cargando, progreso, estadoMensaje, run } = useBarraProgreso()

const showReporteModal = ref(false)
const reporteData = ref([])
const empresaData = ref({})
const periodoActivo = ref('')

onMounted(() => {
  emit('set-title', 'Balance')
})

const handleProcesar = async () => {
  if (!fechaCorte.value) {
    alert('Selecciona una fecha de corte.')
    return
  }

  try {
    const res = await run(
      () => axios.post('http://localhost:3000/api/balance/procesar', { fecha: fechaCorte.value }),
      'Procesando registros de Cdiario...'
    )
    periodoActivo.value = res.data.periodo
    estadoMensaje.value = res.data.message
  } catch (err) {
    estadoMensaje.value = 'Error al procesar el balance.'
    alert('Error al procesar balance: ' + (err.response?.data?.error || err.message))
  }
}

const handleImprimir = async () => {
  const anio = fechaCorte.value.substring(0, 4)
  const mm = fechaCorte.value.substring(5, 7)
  const periodo = `${anio}${mm}`

  try {
    const res = await axios.get(`http://localhost:3000/api/balance/reporte?periodo=${periodo}`)

    if (!res.data.data || res.data.data.length === 0) {
      alert(`No hay un balance procesado para el período ${periodo}. Haz clic en 'Procesar' primero.`)
      return
    }

    reporteData.value = res.data.data
    empresaData.value = res.data.empresa || {}
    periodoActivo.value = periodo
    showReporteModal.value = true

  } catch (err) {
    alert('Error obteniendo reporte de balance: ' + err.message)
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Balance</h2>
      <span class="text-xs text-slate-400 font-mono">Balance.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-6 flex flex-col justify-between min-h-95">
        <div class="flex-1 flex flex-col items-center justify-center space-y-4">
          <div class="flex items-center space-x-4 bg-slate-800/80 p-6 rounded-lg border border-slate-700/80 shadow-inner">
            <label class="text-sm font-semibold text-slate-300">Fecha</label>
            <input
              v-model="fechaCorte"
              type="date"
              class="bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm"
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

    <!-- Modal de Impresión del Balance -->
    <ReporteBalanceModal
      :show="showReporteModal"
      :periodo="periodoActivo"
      :reportData="reporteData"
      :empresa="empresaData"
      @close="showReporteModal = false"
    />
  </div>
</template>
