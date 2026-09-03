<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import ReportePolizaModal from './ReportePolizaModal.vue'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])
const activeTab = ref('compras')

const showPolizaModal = ref(false)
const polizaData = ref([])
const activePolizaNum = ref('')
const busquedaForm = ref({ poliza: '' })

const cvForm = ref({ periodo: '', poliza: '' })

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

watch(activeTab, (newTab) => {
  const titles = {
    compras: 'Contabilización - Compras',
    ventas: 'Contabilización - Ventas',
    busqueda: 'Consulta de Pólizas'
  }
  emit('set-title', titles[newTab] || 'Contabilización de Compras y Ventas')
  reset()
}, { immediate: true })

const handleBuscarPoliza = async () => {
  const periodoInput = cvForm.value.periodo
  const url = `http://localhost:3000/api/contab/siguiente-poliza?periodo=${periodoInput ? periodoInput.trim() : ''}`

  try {
    const res = await axios.get(url)
    cvForm.value.poliza = res.data.poliza
    if (res.data.esUltima && res.data.periodo) cvForm.value.periodo = res.data.periodo
  } catch (err) {
    console.error('Error al consultar número de póliza:', err.message)
  }
}

// Procesar Compras o Ventas
const handleProcesar = async () => {
  const periodoInput = cvForm.value.periodo;

  if (!periodoInput || periodoInput.trim().length < 6) {
    alert('Ingresa un período válido de 6 dígitos antes de procesar.');
    return;
  }

  // Cada "Procesar" genera una Póliza NUEVA (Busca_pol en ContabComp.frm), así
  // que se confirma con el usuario antes de crearla.
  await handleBuscarPoliza();
  if (!confirm(`Se creará una nueva póliza. La nueva póliza es: ${cvForm.value.poliza}`)) {
    return;
  }

  try {
    const res = await run(() => axios.post('http://localhost:3000/api/contab/procesar-cv', {
      tipo: activeTab.value,
      periodo: periodoInput.trim()
    }), 'Procesando...')

    estadoMensaje.value = res.data.message
    alert(res.data.message);
    cvForm.value.poliza = res.data.poliza;

  } catch (err) {
    estadoMensaje.value = 'Error al procesar.'
    alert('Error al procesar: ' + (err.response?.data?.error || err.message));
  }
}

const handleLimpiar = () => {
  cvForm.value = { periodo: '', poliza: '' }
  reset()
}

const handleImprimirPoliza = async () => {
  const polizaNum = cvForm.value.poliza

  if (!polizaNum?.trim()) {
    alert('No hay una póliza asignada para imprimir.')
    return
  }

  try {
    const res = await axios.get(`http://localhost:3000/api/reportes/comprobante-diario?poliza=${polizaNum.trim()}`)
    polizaData.value = res.data.data
    activePolizaNum.value = polizaNum.trim()
    showPolizaModal.value = true
  } catch (err) {
    alert('Error al obtener comprobante: ' + err.message)
  }
}

const handleBuscarPolizaManual = async () => {
  const numPoliza = busquedaForm.value.poliza.trim()

  if (!numPoliza) {
    alert('Ingresa un número de póliza para buscar.')
    return
  }

  try {
    const res = await axios.get(`http://localhost:3000/api/reportes/comprobante-diario?poliza=${numPoliza}`)

    if (!res.data.data || res.data.data.length === 0) {
      alert(`La Póliza N° ${numPoliza} no existe en Cdiario.`)
      return
    }

    polizaData.value = res.data.data
    activePolizaNum.value = numPoliza
    showPolizaModal.value = true
  } catch (err) {
    alert('Error al buscar la póliza: ' + (err.response?.data?.error || err.message))
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Contabilización de Compras y Ventas</h2>
      <span class="text-xs text-slate-400 font-mono">ContaCV.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div>
          <div class="flex border-b border-slate-700 space-x-1 mb-6">
            <button @click="activeTab = 'compras'" :class="['px-5 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent cursor-pointer', activeTab === 'compras' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">Compras</button>
            <button @click="activeTab = 'ventas'" :class="['px-5 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent cursor-pointer', activeTab === 'ventas' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">Ventas</button>
            <button @click="activeTab = 'busqueda'" :class="['px-5 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent cursor-pointer', activeTab === 'busqueda' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">Búsqueda de Pólizas</button>
          </div>

          <!-- Pestaña 1: Compras -->
          <div v-if="activeTab === 'compras'" class="space-y-4 py-8 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-4">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Periodo</label>
              <input v-model="cvForm.periodo" @blur="handleBuscarPoliza" type="text" placeholder="AAAAMM" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 text-center" />
            </div>
            <div class="flex items-center space-x-4">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Póliza</label>
              <input :value="cvForm.poliza" readonly type="text" placeholder="Auto" class="w-36 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-emerald-400 font-bold text-center cursor-not-allowed select-none" />
            </div>
          </div>

          <!-- Pestaña 2: Ventas -->
          <div v-else-if="activeTab === 'ventas'" class="space-y-4 py-8 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-4">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Periodo</label>
              <input v-model="cvForm.periodo" @blur="handleBuscarPoliza" type="text" placeholder="AAAAMM" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 text-center" />
            </div>
            <div class="flex items-center space-x-4">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Póliza</label>
              <input :value="cvForm.poliza" readonly type="text" placeholder="Auto" class="w-36 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-emerald-400 font-bold text-center cursor-not-allowed select-none" />
            </div>
          </div>

          <!-- Pestaña 3: Búsqueda -->
          <div v-if="activeTab === 'busqueda'" class="space-y-6 py-8 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-4">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">N° Póliza</label>
              <input
                v-model="busquedaForm.poliza"
                @keyup.enter="handleBuscarPolizaManual"
                type="text"
                placeholder="Ej: 160101"
                class="w-44 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 text-center"
              />
            </div>
            <button
              @click="handleBuscarPolizaManual"
              class="bg-emerald-600 hover:bg-emerald-500 text-slate-300 font-bold py-2 px-6 rounded text-sm transition-colors cursor-pointer flex items-center space-x-2">
              <span>Buscar e Imprimir Póliza</span>
            </button>
          </div>


        </div>

        <BarraProgreso v-if="activeTab !== 'busqueda'" :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel Lateral (Oculta botones innecesarios cuando estamos en 'busqueda') -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-4 justify-center">
        <template v-if="activeTab !== 'busqueda'">
          <button @click="handleProcesar" :disabled="cargando" class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer">Procesar</button>
          <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer">Limpiar</button>
          <button @click="handleImprimirPoliza" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer">Imprime Poliza</button>
        </template>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer">Salir</button>
      </div>
    </div>

    <ReportePolizaModal
      :show="showPolizaModal"
      :poliza="activePolizaNum"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="polizaData"
      @close="showPolizaModal = false"
    />
  </div>
</template>
