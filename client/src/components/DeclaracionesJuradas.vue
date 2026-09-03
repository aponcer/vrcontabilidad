<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'
import ReporteCertificadoHonorarios from './ReporteCertificadoHonorarios.vue'
import ReporteCertificadoSueldo from './ReporteCertificadoSueldo.vue'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

const activeTab = ref('honorarios') // 'honorarios' | 'sueldos' | 'factores'

// --- Honorarios ---
const honorarioForm = ref({
  periodo: '', rut: '', boleta: '', total: '', retencion: '', prestamo: '', liquido: ''
})
const honorariosList = ref([])
const selectedIndex = ref('')

const showCertificadoHonorarios = ref(false)
const certificadoHonorarios = ref({})

onMounted(async () => {
  emit('set-title', 'Declaraciones Juradas')
  await cargarHonorarios()
})

const cargarHonorarios = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/mae_hon/activos')
    honorariosList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando honorarios:', err.message)
  }
}

// Selecciona por índice (no por texto) para no confundir dos personas con el
// mismo nombre pero Rut distinto -- mismo criterio aplicado en Consultas.vue.
const handleSeleccionChange = () => {
  const item = honorariosList.value[Number(selectedIndex.value)]
  honorarioForm.value.rut = item ? item.rut : ''
}

const handleRutChange = () => {
  const idx = honorariosList.value.findIndex(i => i.rut === honorarioForm.value.rut)
  selectedIndex.value = idx >= 0 ? String(idx) : ''
}

// Boleta_LostFocus: si ya existe una Decla_hon grabada para Periodo+Rut+Boleta,
// precarga el resto de los campos.
const handleBoletaBlur = async () => {
  const { periodo, rut, boleta } = honorarioForm.value
  if (!periodo || !rut || !boleta) return

  try {
    const res = await axios.get('http://localhost:3000/api/decla-hon/buscar', { params: { periodo, rut, boleta } })
    if (res.data.data) {
      honorarioForm.value.total = res.data.data.Total ?? ''
      honorarioForm.value.retencion = res.data.data.Reten ?? ''
      honorarioForm.value.prestamo = res.data.data.Prest ?? ''
      honorarioForm.value.liquido = res.data.data.Liquido ?? ''
    }
  } catch (err) {
    console.error('Error consultando la boleta:', err.message)
  }
}

// Recalcula el Líquido = Total - Retención - Préstamo. El .frm original tenía
// dos fórmulas distintas según qué campo perdía el foco (Líquido: Total-Retención,
// ignorando el Préstamo; Préstamo: Total-Retención-Préstamo) -- una inconsistencia
// que casi seguro es un descuido (el campo Préstamo se agregó después y sólo se
// actualizó una de las dos fórmulas). Acá se usa siempre la fórmula completa.
const recalcularLiquido = () => {
  const total = Number(honorarioForm.value.total) || 0
  const retencion = Number(honorarioForm.value.retencion) || 0
  const prestamo = Number(honorarioForm.value.prestamo) || 0
  honorarioForm.value.liquido = total - retencion - prestamo
}

// --- Sueldos ---
const sueldosForm = ref({ ejercicio: '' })

const showCertificadoSueldo = ref(false)
const certificadosSueldo = ref([])
const empresaCertificadoSueldo = ref({})

// --- Factores ---
const factoresFormInicial = () => ({
  periodo: '',
  enero: '', febrero: '', marzo: '', abril: '', mayo: '', junio: '',
  julio: '', agosto: '', septiembre: '', octubre: '', noviembre: '', diciembre: ''
})
const factoresForm = ref(factoresFormInicial())
const MESES_FACTORES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// Text1_LostFocus: al perder foco el año, precarga los 12 factores ya grabados.
const handlePeriodoFactoresBlur = async () => {
  if (!factoresForm.value.periodo) return
  try {
    const res = await axios.get(`http://localhost:3000/api/factores/${factoresForm.value.periodo}`)
    MESES_FACTORES.forEach((mes, i) => {
      const mm = String(i + 1).padStart(2, '0')
      if (res.data.data[mm] !== undefined) factoresForm.value[mes] = res.data.data[mm]
    })
  } catch (err) {
    console.error('Error consultando los factores:', err.message)
  }
}

// Al cambiar de pestaña, limpia la barra (mismo criterio que en el resto de los módulos)
watch(activeTab, () => reset())

// Grabar (Procesar_Click, tres ramas según la pestaña activa)
const handleGrabar = async () => {
  if (activeTab.value === 'honorarios') {
    const { periodo, rut, boleta, total, retencion, prestamo, liquido } = honorarioForm.value
    if (!periodo || !rut || !boleta) return alert('Ingresa Periodo, Rut y Boleta.')

    try {
      const res = await run(() => axios.post('http://localhost:3000/api/decla-hon', {
        periodo, rut, boleta, total, reten: retencion, prestamo, liquido
      }), 'Grabando...')
      handleLimpiar()
      progreso.value = 100
      estadoMensaje.value = res.data.message
    } catch (err) {
      estadoMensaje.value = 'Error al grabar.'
      alert('Error al grabar: ' + (err.response?.data?.error || err.message))
    }
  } else if (activeTab.value === 'sueldos') {
    if (!sueldosForm.value.ejercicio) return alert('Ingresa el Ejercicio.')

    try {
      const res = await run(() => axios.post('http://localhost:3000/api/decla-suel/procesar', {
        ejercicio: sueldosForm.value.ejercicio
      }), 'Procesando declaraciones de sueldos...')
      estadoMensaje.value = res.data.message
    } catch (err) {
      estadoMensaje.value = 'Error al grabar.'
      alert('Error al grabar: ' + (err.response?.data?.error || err.message))
    }
  } else {
    if (!factoresForm.value.periodo) return alert('Ingresa el Período.')

    try {
      const meses = MESES_FACTORES.map(mes => factoresForm.value[mes])
      const res = await run(() => axios.post('http://localhost:3000/api/factores', {
        agno: factoresForm.value.periodo, meses
      }), 'Grabando...')
      estadoMensaje.value = res.data.message
    } catch (err) {
      estadoMensaje.value = 'Error al grabar.'
      alert('Error al grabar: ' + (err.response?.data?.error || err.message))
    }
  }
}

// Imprimir (Certif_hono.rpt / Certif_suel.rpt): pendiente -- el usuario va a
// revisar los reportes por separado antes de conectarlos.
// Imprimir_Click: Rut/Año salen de Combo2/Text3 (la selección actual de la
// pestaña Honorarios), igual que el .frm original.
const handleImprimir = async () => {
  if (activeTab.value === 'honorarios') {
    const { periodo, rut } = honorarioForm.value
    if (!periodo || !rut) return alert('Selecciona un Rut y un Periodo.')

    try {
      const res = await run(() => axios.get('http://localhost:3000/api/reportes/certificado-honorarios', {
        params: { rut, agno: periodo.substring(0, 4) }
      }), 'Generando certificado...')
      certificadoHonorarios.value = res.data.data
      showCertificadoHonorarios.value = true
      estadoMensaje.value = 'Certificado generado.'
    } catch (err) {
      estadoMensaje.value = 'Error al generar el certificado.'
      alert('Error al generar el certificado: ' + (err.response?.data?.error || err.message))
    }
  } else if (activeTab.value === 'sueldos') {
    if (!sueldosForm.value.ejercicio) return alert('Ingresa el Ejercicio.')

    try {
      const res = await run(() => axios.get('http://localhost:3000/api/reportes/certificado-sueldo', {
        params: { agno: sueldosForm.value.ejercicio }
      }), 'Generando certificados...')
      certificadosSueldo.value = res.data.data
      empresaCertificadoSueldo.value = res.data.empresa || {}
      showCertificadoSueldo.value = true
      estadoMensaje.value = `${res.data.data.length} certificado(s) generado(s).`
    } catch (err) {
      estadoMensaje.value = 'Error al generar los certificados.'
      alert('Error al generar los certificados: ' + (err.response?.data?.error || err.message))
    }
  }
}

// Limpiar_Click: en el .frm original, en la pestaña "Sueldos" este botón no
// hace nada (sin rama para Tab=1) -- se respeta tal cual.
const handleLimpiar = () => {
  if (activeTab.value === 'honorarios') {
    const periodoActual = honorarioForm.value.periodo
    honorarioForm.value = { periodo: periodoActual, rut: '', boleta: '', total: '', retencion: '', prestamo: '', liquido: '' }
    selectedIndex.value = ''
  } else if (activeTab.value === 'factores') {
    factoresForm.value = factoresFormInicial()
  }
  reset()
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Declaraciones Juradas</h2>
      <span class="text-xs text-slate-400 font-mono">DJurada.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div>
          <!-- Pestañas -->
          <div class="flex border-b border-slate-700 space-x-1 mb-4">
            <button
              @click="activeTab = 'honorarios'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'honorarios' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Honorarios
            </button>
            <button
              @click="activeTab = 'sueldos'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'sueldos' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Sueldos
            </button>
            <button
              @click="activeTab = 'factores'"
              :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'factores' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
              Factores
            </button>
          </div>

          <!-- Tab Honorarios -->
          <div v-if="activeTab === 'honorarios'" class="space-y-3 py-2 flex flex-col items-center">
            <div class="space-y-3 w-full max-w-sm">
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Periodo</label>
                <input v-model="honorarioForm.periodo" type="text" placeholder="AAAAMM" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Rut</label>
                <select v-model="selectedIndex" @change="handleSeleccionChange" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                  <option value="">-- Seleccionar --</option>
                  <option v-for="(h, i) in honorariosList" :key="h.rut" :value="String(i)">{{ h.nombre }}</option>
                </select>
                <input v-model="honorarioForm.rut" @change="handleRutChange" type="text" placeholder="Rut" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Boleta</label>
                <input v-model="honorarioForm.boleta" @blur="handleBoletaBlur" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Total</label>
                <input v-model="honorarioForm.total" @blur="recalcularLiquido" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Retencion 14,5%</label>
                <input v-model="honorarioForm.retencion" @blur="recalcularLiquido" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Prestamo 3%</label>
                <input v-model="honorarioForm.prestamo" @blur="recalcularLiquido" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-32 text-right text-sm text-slate-300 font-medium">Líquido</label>
                <input v-model="honorarioForm.liquido" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>

          <!-- Tab Sueldos -->
          <div v-else-if="activeTab === 'sueldos'" class="space-y-6 py-8 flex flex-col items-center">
            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Ejercicio</label>
              <input v-model="sueldosForm.ejercicio" type="text" placeholder="AAAA" class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <!-- Tab Factores -->
          <div v-else-if="activeTab === 'factores'" class="space-y-6 py-4 flex flex-col items-center">
            <div class="flex items-center space-x-3">
              <label class="w-20 text-right text-sm text-slate-300 font-medium">Periodo</label>
              <input v-model="factoresForm.periodo" @blur="handlePeriodoFactoresBlur" type="text" placeholder="AAAA" class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="grid grid-cols-2 gap-x-10 gap-y-3">
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Enero</label>
                <input v-model="factoresForm.enero" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Julio</label>
                <input v-model="factoresForm.julio" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Febrero</label>
                <input v-model="factoresForm.febrero" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Agosto</label>
                <input v-model="factoresForm.agosto" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Marzo</label>
                <input v-model="factoresForm.marzo" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Septiembre</label>
                <input v-model="factoresForm.septiembre" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Abril</label>
                <input v-model="factoresForm.abril" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Octubre</label>
                <input v-model="factoresForm.octubre" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Mayo</label>
                <input v-model="factoresForm.mayo" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Noviembre</label>
                <input v-model="factoresForm.noviembre" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Junio</label>
                <input v-model="factoresForm.junio" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
              <div class="flex items-center space-x-3">
                <label class="w-24 text-right text-sm text-slate-300 font-medium">Diciembre</label>
                <input v-model="factoresForm.diciembre" type="number" step="any" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel Lateral -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center min-h-95">
        <button
          @click="handleGrabar"
          :disabled="cargando"
          class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic shadow">
          Grabar
        </button>
        <button
          v-if="activeTab !== 'factores'"
          @click="handleImprimir"
          :disabled="cargando"
          class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Imprimir
        </button>
        <button
          @click="handleLimpiar"
          class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Limpiar
        </button>
        <button
          @click="emit('close')"
          class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Salir
        </button>
      </div>
    </div>

    <ReporteCertificadoHonorarios
      :show="showCertificadoHonorarios"
      :certificado="certificadoHonorarios"
      @close="showCertificadoHonorarios = false"
    />

    <ReporteCertificadoSueldo
      :show="showCertificadoSueldo"
      :certificados="certificadosSueldo"
      :empresa="empresaCertificadoSueldo"
      @close="showCertificadoSueldo = false"
    />
  </div>
</template>
