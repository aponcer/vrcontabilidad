<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'
import ReporteAnalisisClientes from './ReporteAnalisisClientes.vue'
import ReporteAnalisisProveedores from './ReporteAnalisisProveedores.vue'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

const hoyIso = () => new Date().toISOString().split('T')[0]

const modo = ref('clientes') // 'clientes' | 'proveedores'
const desde = ref(hoyIso())
const hasta = ref(hoyIso())

const showReporteClientes = ref(false)
const reporteClientesData = ref([])
const showReporteProveedores = ref(false)
const reporteProveedoresData = ref([])
const reportePeriodo = ref('')

onMounted(() => {
  emit('set-title', 'Analisis Clientes y Proveedores')
})

// Al cambiar de radio, limpia la barra (mismo criterio que en el resto de los módulos)
watch(modo, () => reset())

// Procesar_Click: copia los movimientos de Cdiario del rango de fechas a la
// tabla de staging (CtaCte_cli/CtaCte_provee).
const handleProcesar = async () => {
  if (!desde.value || !hasta.value) return alert('Selecciona el rango de fechas (Desde/Hasta).')

  try {
    const res = await run(() => axios.post('http://localhost:3000/api/analisis-ctas-ctes/procesar', {
      modo: modo.value, desde: desde.value, hasta: hasta.value
    }), 'Procesando movimientos...')
    estadoMensaje.value = res.data.message
  } catch (err) {
    estadoMensaje.value = 'Error al procesar.'
    alert('Error al procesar: ' + (err.response?.data?.error || err.message))
  }
}

// Analizar_Click: consolida/cancela documentos según su saldo neto.
const handleAnalizar = async () => {
  try {
    const res = await run(() => axios.post('http://localhost:3000/api/analisis-ctas-ctes/analizar', {
      modo: modo.value
    }), 'Analizando saldos...')
    estadoMensaje.value = res.data.message
  } catch (err) {
    estadoMensaje.value = 'Error al analizar.'
    alert('Error al analizar: ' + (err.response?.data?.error || err.message))
  }
}

// Imprimir_Click: el "Período" del título del reporte es sólo una etiqueta
// armada desde la fecha "Desde" (no filtra los datos, ver nota en el backend).
const handleImprimir = async () => {
  reportePeriodo.value = desde.value.replace(/-/g, '').substring(0, 6)

  if (modo.value === 'clientes') {
    try {
      const res = await run(() => axios.get('http://localhost:3000/api/reportes/analisis-clientes'), 'Generando reporte...')
      reporteClientesData.value = res.data.data
      showReporteClientes.value = true
      estadoMensaje.value = 'Reporte generado.'
    } catch (err) {
      estadoMensaje.value = 'Error al generar el reporte.'
      alert('Error al generar el reporte: ' + (err.response?.data?.error || err.message))
    }
  } else {
    try {
      const res = await run(() => axios.get('http://localhost:3000/api/reportes/analisis-proveedores'), 'Generando reporte...')
      reporteProveedoresData.value = res.data.data
      showReporteProveedores.value = true
      estadoMensaje.value = 'Reporte generado.'
    } catch (err) {
      estadoMensaje.value = 'Error al generar el reporte.'
      alert('Error al generar el reporte: ' + (err.response?.data?.error || err.message))
    }
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Analisis Clientes y Proveedores</h2>
      <span class="text-xs text-slate-400 font-mono">Analisis.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div class="flex-1 flex items-center px-4">
          <div class="space-y-6">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="radio" v-model="modo" value="clientes" class="text-emerald-500 focus:ring-emerald-400" />
              <span class="text-sm">Clientes</span>
            </label>
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="radio" v-model="modo" value="proveedores" class="text-emerald-500 focus:ring-emerald-400" />
              <span class="text-sm">Proveedores</span>
            </label>
          </div>

          <div class="ml-16 space-y-3">
            <div class="flex items-center space-x-3">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Desde</label>
              <input v-model="desde" type="date" class="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-16 text-right text-sm text-slate-300 font-medium">Hasta</label>
              <input v-model="hasta" type="date" class="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
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
          @click="handleAnalizar"
          :disabled="cargando"
          class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Analizar
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

    <ReporteAnalisisClientes
      :show="showReporteClientes"
      :periodo="reportePeriodo"
      :reportData="reporteClientesData"
      @close="showReporteClientes = false"
    />

    <ReporteAnalisisProveedores
      :show="showReporteProveedores"
      :periodo="reportePeriodo"
      :reportData="reporteProveedoresData"
      @close="showReporteProveedores = false"
    />
  </div>
</template>
