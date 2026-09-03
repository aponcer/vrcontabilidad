<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import ReporteLibroMayor from './ReporteLibroMayor.vue'
import ReporteLibroDiario from './ReporteLibroDiario.vue'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const activeSubTab = ref('mayor') // 'mayor' | 'diario'

const hoy = new Date().toISOString().split('T')[0]

const mayorForm = ref({ modo: 'cuenta-periodo', desde: hoy, hasta: hoy, cuenta: '' })
const diarioForm = ref({ modo: 'general', desde: hoy, hasta: hoy })

const cuentasList = ref([])

const cargarCuentasList = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/cuentas')
    cuentasList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando cuentas:', err.message)
  }
}

onMounted(() => {
  emit('set-title', 'Libros Diario y Mayor')
  cargarCuentasList()
})

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

// Al cambiar de sub-pestaña (Mayor/Diario), limpia la barra para que no arrastre
// el último mensaje/estado de la otra sub-pestaña.
watch(activeSubTab, () => reset())

// Guarda el Desde/Hasta con el que realmente se proceso por última vez, para que
// el encabezado del reporte impreso nunca muestre fechas distintas a los datos
// que hay en Lmayor/Ldiario (que no guardan período, se pisan en cada Procesar).
const mayorProcesado = ref({ desde: '', hasta: '' })
const diarioProcesado = ref({ desde: '', hasta: '' })

const showMayorModal = ref(false)
const mayorReportData = ref([])

const showDiarioModal = ref(false)
const diarioReportData = ref([])

const handleProcesar = async () => {
  if (activeSubTab.value === 'mayor' && mayorForm.value.modo === 'cuenta-periodo' && !mayorForm.value.cuenta) {
    alert('Selecciona una Cuenta.')
    return
  }

  try {
    if (activeSubTab.value === 'mayor') {
      const res = await run(() => axios.post('http://localhost:3000/api/lmayor/procesar', {
        modo: mayorForm.value.modo === 'cuenta-periodo' ? 'cuenta' : 'general',
        desde: mayorForm.value.desde,
        hasta: mayorForm.value.hasta,
        cuenta: mayorForm.value.cuenta
      }), 'Procesando Libro Mayor...')
      mayorProcesado.value = { desde: mayorForm.value.desde, hasta: mayorForm.value.hasta }
      estadoMensaje.value = res.data.message

    } else {
      const res = await run(() => axios.post('http://localhost:3000/api/ldiario/procesar', {
        desde: diarioForm.value.desde,
        hasta: diarioForm.value.hasta
      }), 'Procesando Libro Diario...')
      diarioProcesado.value = { desde: diarioForm.value.desde, hasta: diarioForm.value.hasta }
      estadoMensaje.value = res.data.message
    }
  } catch (err) {
    estadoMensaje.value = 'Error al procesar.'
    alert('Error al procesar: ' + (err.response?.data?.error || err.message))
  }
}

const handleImprimir = async () => {
  try {
    if (activeSubTab.value === 'mayor') {
      const res = await axios.get('http://localhost:3000/api/lmayor/reporte')
      if (!res.data.data || res.data.data.length === 0) {
        alert('No hay un Libro Mayor procesado. Haz clic en "Procesar" primero.')
        return
      }
      mayorReportData.value = res.data.data
      showMayorModal.value = true

    } else {
      const res = await axios.get('http://localhost:3000/api/ldiario/reporte')
      if (!res.data.data || res.data.data.length === 0) {
        alert('No hay un Libro Diario procesado. Haz clic en "Procesar" primero.')
        return
      }
      diarioReportData.value = res.data.data
      showDiarioModal.value = true
    }
  } catch (err) {
    alert('Error obteniendo el reporte: ' + (err.response?.data?.error || err.message))
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Libros Diario y Mayor</h2>
      <span class="text-xs text-slate-400 font-mono">Lmayor.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Izquierdo: Formulario con Sub-Pestañas -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div>
          <!-- Sub-Pestañas -->
          <div class="flex border-b border-slate-700 space-x-1 mb-4">
            <button
              @click="activeSubTab = 'mayor'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeSubTab === 'mayor' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Libro Mayor
            </button>
            <button
              @click="activeSubTab = 'diario'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeSubTab === 'diario' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Libro Diario
            </button>
          </div>

          <!-- Sub-Pestaña 1: Libro Mayor -->
          <div v-if="activeSubTab === 'mayor'" class="space-y-6 py-6 flex flex-col items-center">
            <h3 class="text-sm font-semibold text-slate-300">Por Cuenta y Periodo</h3>

            <div class="space-y-3 w-full max-w-md">
              <div class="flex items-center space-x-3">
                <label class="w-20 text-right text-sm text-slate-300 font-medium">Desde</label>
                <input v-model="mayorForm.desde" type="date" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-20 text-right text-sm text-slate-300 font-medium">Hasta</label>
                <input v-model="mayorForm.hasta" type="date" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-20 text-right text-sm text-slate-300 font-medium">Cuenta</label>
                <select v-model="mayorForm.cuenta" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                  <option value="">Seleccionar Cuenta...</option>
                  <option v-for="c in cuentasList" :key="c.codigo" :value="c.codigo">{{ c.codigo }} - {{ c.nombre }}</option>
                </select>
                <input :value="mayorForm.cuenta" readonly class="w-24 bg-slate-800/60 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-center" />
              </div>
            </div>
          </div>

          <!-- Sub-Pestaña 2: Libro Diario -->
          <div v-else-if="activeSubTab === 'diario'" class="space-y-6 py-6 flex flex-col items-center">
            <h3 class="text-sm font-semibold text-slate-300">General</h3>

            <div class="space-y-3 w-full max-w-md">
              <div class="flex items-center space-x-3">
                <label class="w-20 text-right text-sm text-slate-300 font-medium">Desde</label>
                <input v-model="diarioForm.desde" type="date" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-20 text-right text-sm text-slate-300 font-medium">Hasta</label>
                <input v-model="diarioForm.hasta" type="date" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel Derecho: Acciones -->
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

    <ReporteLibroMayor
      :show="showMayorModal"
      :desde="mayorProcesado.desde"
      :hasta="mayorProcesado.hasta"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="mayorReportData"
      @close="showMayorModal = false"
    />

    <ReporteLibroDiario
      :show="showDiarioModal"
      :desde="diarioProcesado.desde"
      :hasta="diarioProcesado.hasta"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="diarioReportData"
      @close="showDiarioModal = false"
    />
  </div>
</template>
