<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import ReporteLibroComprasModal from './ReporteLibroComprasModal.vue'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

// Recibimos 'activeCompany' desde App.vue para mostrar el nombre correcto en el reporte
const props = defineProps({
  activeCompany: Object
})

const activeTab = ref('compras') // 'operaciones', 'compras', 'ventas', 'libros'

// Declarábamos 'set-title' para que App.vue capture el texto de la pestaña
const emit = defineEmits(['close', 'set-title'])

// Estado del Modal de Impresión
const showReportModal = ref(false)
const reportData = ref([])
const reportPeriodo = ref('2026-07')

// Formularios por pestaña
const comprasForm = ref({
  fecha: new Date().toISOString().substring(0, 10),
  tdoc: '33',
  numdoc: '',
  rut: '',
  razonSocial: '',
  cuenta: '',
  neto: 0,
  iva: 0,
  total: 0,
  glosa: ''
})

const ventasForm = ref({
  fecha: new Date().toISOString().substring(0, 10),
  tdoc: '33',
  numdoc: '',
  rut: '',
  razonSocial: '',
  neto: 0,
  iva: 0,
  total: 0
})

const siiForm = ref({ tipo: 'compras', periodo: '' })
const librosForm = ref({ tipo: 'ventas', periodo: '' })

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

// Emite el título dinámico a la pestaña del navegador según activeTab
watch(activeTab, (newTab) => {
  const titles = {
    compras: 'Registro de Compras',
    ventas: 'Registro de Ventas',
    operaciones: 'Operaciones SII',
    libros: 'Generación de Libros'
  }
  emit('set-title', titles[newTab] || 'Compras y Ventas')
  reset()
}, { immediate: true })

const handleCalcularTotal = (tipo) => {
  if (tipo === 'compras') {
    const neto = parseFloat(comprasForm.value.neto) || 0
    comprasForm.value.iva = Math.round(neto * 0.19)
    comprasForm.value.total = neto + comprasForm.value.iva
  } else if (tipo === 'ventas') {
    const neto = parseFloat(ventasForm.value.neto) || 0
    ventasForm.value.iva = Math.round(neto * 0.19)
    ventasForm.value.total = neto + ventasForm.value.iva
  }
}

const handleGrabar = async () => {
  try {
    if (activeTab.value === 'compras') {
      await run(() => axios.post('http://localhost:3000/api/rcv/compras', comprasForm.value), 'Guardando...')
    } else if (activeTab.value === 'ventas') {
      await run(() => axios.post('http://localhost:3000/api/rcv/ventas', ventasForm.value), 'Guardando...')
    }
    estadoMensaje.value = 'Registro guardado correctamente.'
    alert('Registro guardado correctamente')
  } catch (err) {
    estadoMensaje.value = 'Error al guardar.'
    alert('Error al guardar: ' + err.message)
  }
}

const handleProcesarSII = async () => {
  try {
    const payload = activeTab.value === 'operaciones' ? siiForm.value : librosForm.value
    const res = await run(() => axios.post('http://localhost:3000/api/rcv/procesar-sii', payload), 'Procesando...')
    estadoMensaje.value = res.data.message
    alert(res.data.message)
  } catch (err) {
    estadoMensaje.value = 'Error al procesar.'
    alert('Error al procesar: ' + err.message)
  }
}

// Handler para cargar los datos e invocar el modal de vista previa
const handleAbrirImpresion = async () => {
  const periodoInput = librosForm.value.periodo?.trim()
  const tipoLibro = librosForm.value.tipo // 'compras' o 'ventas'

  if (!periodoInput) {
    alert('Por favor, ingresa un período en la pestaña Libros (ej: 202607)')
    return
  }

  try {
    const res = await axios.get(`http://localhost:3000/api/reportes/libro-${tipoLibro}?periodo=${periodoInput}`)
    reportData.value = res.data.data
    reportPeriodo.value = periodoInput
    showReportModal.value = true
  } catch (err) {
    alert('Error al generar vista previa: ' + err.message)
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Registro de Compras y Ventas</h2>
      <span class="text-xs text-slate-400 font-mono">RCV.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel de Contenido -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between">
        <div>
          <!-- Navegación de Pestañas -->
          <div class="flex border-b border-slate-700 space-x-1 mb-4">
            <button @click="activeTab = 'operaciones'" :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'operaciones' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">
              Operaciones SII
            </button>
            <button @click="activeTab = 'compras'" :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'compras' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">
              Compras
            </button>
            <button @click="activeTab = 'ventas'" :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'ventas' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">
              Ventas
            </button>
            <button @click="activeTab = 'libros'" :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'libros' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200']">
              Libros
            </button>
          </div>

          <!-- Pestaña 1: Operaciones SII -->
          <div v-if="activeTab === 'operaciones'" class="space-y-6 py-6 min-h-70 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-8">
              <div class="space-y-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" v-model="siiForm.tipo" value="compras" class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm">Compras</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" v-model="siiForm.tipo" value="ventas" class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm">Ventas</span>
                </label>
              </div>

              <div class="flex items-center space-x-3">
                <label class="text-sm text-slate-300 font-medium">Periodo</label>
                <input v-model="siiForm.periodo" type="text" placeholder="AAAAMM" class="w-28 text-center bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <!-- Pestaña 2: Compras -->
          <div v-else-if="activeTab === 'compras'" class="space-y-3 py-2 min-h-70">
            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Fecha</label>
              <input v-model="comprasForm.fecha" type="date" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Tdoc</label>
              <select v-model="comprasForm.tdoc" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="33">33 - Factura Electrónica</option>
                <option value="34">34 - Factura Exenta</option>
                <option value="61">61 - Nota de Crédito</option>
                <option value="56">56 - Nota de Débito</option>
              </select>
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Numdoc</label>
              <input v-model="comprasForm.numdoc" type="text" placeholder="N° Documento" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Rut</label>
              <input v-model="comprasForm.rut" type="text" placeholder="12345678-9 (F3)" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              <input v-model="comprasForm.razonSocial" type="text" placeholder="Razón Social Proveedor" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Cuenta</label>
              <select v-model="comprasForm.cuenta" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar Cuenta Contable...</option>
              </select>
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Neto</label>
              <input v-model="comprasForm.neto" @input="handleCalcularTotal('compras')" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Iva</label>
              <input v-model="comprasForm.iva" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Total</label>
              <input v-model="comprasForm.total" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 focus:outline-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Glosa</label>
              <input v-model="comprasForm.glosa" type="text" placeholder="Glosa de la compra" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Pestaña 3: Ventas -->
          <div v-else-if="activeTab === 'ventas'" class="space-y-3 py-2 min-h-70">
            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Fecha</label>
              <input v-model="ventasForm.fecha" type="date" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Tdoc</label>
              <select v-model="ventasForm.tdoc" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="33">33 - Factura Electrónica</option>
                <option value="39">39 - Boleta Electrónica</option>
                <option value="61">61 - Nota de Crédito</option>
              </select>
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Numdoc</label>
              <input v-model="ventasForm.numdoc" type="text" placeholder="N° Documento" class="w-40 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Rut</label>
              <input v-model="ventasForm.rut" type="text" placeholder="12345678-9 (F3)" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              <input v-model="ventasForm.razonSocial" type="text" placeholder="Razón Social Cliente" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Neto</label>
              <input v-model="ventasForm.neto" @input="handleCalcularTotal('ventas')" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Iva</label>
              <input v-model="ventasForm.iva" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Total</label>
              <input v-model="ventasForm.total" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 focus:outline-none" />
            </div>
          </div>

          <!-- Pestaña 4: Libros -->
          <div v-else-if="activeTab === 'libros'" class="space-y-6 py-6 min-h-70 flex flex-col items-center justify-center">
            <div class="flex items-center space-x-8">
              <div class="space-y-2">
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" v-model="librosForm.tipo" value="ventas" class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm">Libro de Ventas</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer">
                  <input type="radio" v-model="librosForm.tipo" value="compras" class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm">Libro de Compras</span>
                </label>
              </div>

              <div class="flex items-center space-x-3">
                <label class="text-sm text-slate-300 font-medium">Periodo</label>
                <input v-model="librosForm.periodo" type="text" placeholder="AAAAMM" class="w-28 text-center bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel de Botones Lateral -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center">
        <button @click="handleGrabar" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm shadow transition-colors cursor-pointer">Grabar</button>
        <button class="w-full bg-slate-800 hover:bg-red-900/40 text-red-400 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors cursor-pointer">Elimina Registro</button>
        <!-- Botón Imprimir con handler conectado -->
        <button @click="handleAbrirImpresion" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors cursor-pointer">Imprimir</button>
        <button class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors cursor-pointer">Limpiar</button>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors cursor-pointer">Salir</button>
        <button @click="handleProcesarSII" :disabled="cargando" class="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-emerald-400 border border-slate-600 font-semibold py-2 px-4 rounded text-sm transition-colors cursor-pointer">Procesar</button>
      </div>
    </div>

    <!-- Modal de Impresión -->
    <ReporteLibroComprasModal
      :show="showReportModal"
      :periodo="reportPeriodo"
      :tipoReporte="librosForm.tipo"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="reportData"
      @close="showReportModal = false"
    />
  </div>
</template>