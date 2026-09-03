<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'
import ReportePolizaModal from './ReportePolizaModal.vue'
import ReporteLiquidacionSueldoModal from './ReporteLiquidacionSueldoModal.vue'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

const periodoActual = () => new Date().toISOString().replace(/-/g, '').substring(0, 6)

// Campos que NO se limpian con "Limpiar" (Periodo y Póliza), igual que en el .frm
// original (Command1_Click no toca Text1 ni Text3).
const formInicial = (periodo = periodoActual(), poliza = '') => ({
  periodo,
  rut: '',
  diasTrabajados: '',
  imponible: '',
  comisiones: '',
  gratificacion: '',
  colacion: '',
  movilizacion: '',
  aguinaldo: '',
  totalImponible: '',
  totalNoImponible: '',
  totalHaberes: '',
  afpDescuento: '',
  saludDescuento: '',
  haberesTributables: '',
  iut: '',
  anticipo: '',
  liquido: '',
  afpNombre: '',
  afpPorcentaje: '',
  afpUnidad: '',
  saludNombre: '',
  saludValor: '',
  saludUnidad: '',
  cesTrabajador: '',
  cesEmpresa: '',
  sis: '',
  accTrabajo: '',
  ctaCte: '',
  aporteAdicional: '',
  seguroSocial: '',
  diferenciaIsapre: '',
  expectativaVida: '',
  poliza
})

const form = ref(formInicial())
const personalList = ref([])

const showPolizaModal = ref(false)
const polizaData = ref([])

const showLiquidacionModal = ref(false)
const liquidacionData = ref({})
const empresaData = ref({})

onMounted(async () => {
  emit('set-title', 'Liquidación de Sueldos')
  await cargarPersonal()
})

const cargarPersonal = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/maeper/activos')
    personalList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando personal:', err.message)
  }
}

// Dispara al perder foco "Dias Trabajados", igual que Text2_LostFocus en el .frm
// original: recalcula todos los haberes/descuentos base a partir de la Ficha del
// trabajador (Maeper), la Uf del período y los Índices Previsionales del año.
const handleDiasBlur = async () => {
  const rut = form.value.rut.trim()
  if (!rut || !form.value.periodo) return

  try {
    const res = await run(() => axios.get('http://localhost:3000/api/liq-suel/base', {
      params: { periodo: form.value.periodo, rut, dias: form.value.diasTrabajados || 30 }
    }), 'Calculando haberes y descuentos...')

    Object.assign(form.value, res.data.data)
    estadoMensaje.value = `Datos de ${res.data.data.nombreCompleto || rut} calculados.`
  } catch (err) {
    estadoMensaje.value = 'Error al calcular los haberes.'
    alert('Error al calcular los haberes: ' + (err.response?.data?.error || err.message))
  }
}

// Calcular_Click: calcula el Impuesto Único y el Líquido a partir de lo que ya
// dejó calculado handleDiasBlur (Total Haberes, Afp, Salud, Diferencia Isapre,
// Ces. Trabajador, Cta. Cte.).
const handleCalcular = async () => {
  if (!form.value.rut) return alert('Selecciona un Rut.')
  if (form.value.totalHaberes === '') return alert('Primero ingresa los Días Trabajados para calcular los haberes.')

  try {
    const res = await run(() => axios.get('http://localhost:3000/api/liq-suel/iut', {
      params: { periodo: form.value.periodo, habTrib: form.value.haberesTributables }
    }), 'Calculando Impuesto Único...')

    form.value.iut = res.data.iut
    const lsoc = Number(form.value.afpDescuento) + Number(form.value.saludDescuento) + Number(form.value.diferenciaIsapre) + Number(form.value.cesTrabajador)
    form.value.liquido = Math.round(Number(form.value.totalHaberes) - lsoc - form.value.iut - Number(form.value.ctaCte) - Number(form.value.anticipo))
    estadoMensaje.value = 'Impuesto Único y Líquido calculados.'
  } catch (err) {
    estadoMensaje.value = 'Error al calcular el Impuesto Único.'
    alert('Error al calcular el Impuesto Único: ' + (err.response?.data?.error || err.message))
  }
}

// Grabar_Click: upsert por (Periodo, Rut)
const handleGrabar = async () => {
  if (!form.value.rut) return alert('Selecciona un Rut.')
  if (form.value.liquido === '') return alert('Primero calcula la liquidación con "Calcular".')

  const totDesc = Number(form.value.afpDescuento) + Number(form.value.saludDescuento) + Number(form.value.diferenciaIsapre) + Number(form.value.cesTrabajador) + Number(form.value.ctaCte)

  try {
    await run(() => axios.post('http://localhost:3000/api/liq-suel', {
      ...form.value,
      totDesc
    }), 'Grabando liquidación...')
    estadoMensaje.value = `Liquidación de ${form.value.rut} grabada.`
  } catch (err) {
    estadoMensaje.value = 'Error al grabar la liquidación.'
    alert('Error al grabar la liquidación: ' + (err.response?.data?.error || err.message))
  }
}

// Imprimir (Liq_suel.rpt): la liquidación impresa individual. Requiere que la
// liquidación ya esté grabada (lee de Liq_suel + Maeper + Afp, igual que el
// reporte original), no de lo que esté en pantalla sin grabar.
const handleImprimir = async () => {
  if (!form.value.periodo || !form.value.rut) return alert('Selecciona un Período y un Rut.')

  try {
    const res = await axios.get('http://localhost:3000/api/reportes/liquidacion-sueldo', {
      params: { periodo: form.value.periodo, rut: form.value.rut }
    })
    liquidacionData.value = { ...res.data.data, diasTrabajados: form.value.diasTrabajados }
    empresaData.value = res.data.data.empresa || {}
    showLiquidacionModal.value = true
  } catch (err) {
    alert('Error al obtener la liquidación: ' + (err.response?.data?.error || err.message))
  }
}

// Contabilizar_Click: contabiliza TODAS las liquidaciones grabadas del período,
// generando una nueva Póliza en Cdiario (igual que en Comprobante Diario).
const handleContabilizar = async () => {
  if (!form.value.periodo) return alert('Ingresa el Período.')
  if (!confirm(`¿Contabilizar todas las liquidaciones grabadas del período ${form.value.periodo}? Se generará una nueva Póliza.`)) return

  try {
    const res = await run(() => axios.post('http://localhost:3000/api/liq-suel/contabilizar', { periodo: form.value.periodo }), 'Contabilizando período...')
    form.value.poliza = res.data.poliza
    estadoMensaje.value = res.data.message
    alert(res.data.message)
  } catch (err) {
    estadoMensaje.value = 'Error al contabilizar.'
    alert('Error al contabilizar: ' + (err.response?.data?.error || err.message))
  }
}

// Imprime Póliza (Imprepol_Click): reutiliza el mismo reporte de Cdiario que usan
// Comprobante Diario y Contab. Compras y Ventas, porque es la misma tabla/reporte.
const handleImprimePoliza = async () => {
  const polizaNum = form.value.poliza.trim()
  if (!polizaNum) return alert('No hay una póliza asignada para imprimir.')

  try {
    const res = await axios.get(`http://localhost:3000/api/reportes/comprobante-diario?poliza=${polizaNum}`)
    if (!res.data.data || res.data.data.length === 0) {
      alert(`La Póliza N° ${polizaNum} no existe en Cdiario.`)
      return
    }
    polizaData.value = res.data.data
    showPolizaModal.value = true
  } catch (err) {
    alert('Error al obtener la póliza: ' + (err.response?.data?.error || err.message))
  }
}

// Command1_Click: limpia todo excepto Periodo y Póliza.
const handleLimpiar = () => {
  form.value = formInicial(form.value.periodo, form.value.poliza)
  reset()
}

// Al cambiar de trabajador en el desplegable, limpia el formulario igual que
// "Limpiar" (evita que queden calculados los datos del trabajador anterior),
// conservando Periodo, Póliza y el Rut recién seleccionado.
const handleRutChange = () => {
  const rutSeleccionado = form.value.rut
  form.value = formInicial(form.value.periodo, form.value.poliza)
  form.value.rut = rutSeleccionado
  reset()
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Liquidación de Sueldos</h2>
      <span class="text-xs text-slate-400 font-mono">Liquidacion.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <!-- Campos Editables -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 pb-4 mb-4 border-b border-slate-800">
          <div class="flex items-center space-x-3">
            <label class="text-sm text-slate-300 font-medium">Período</label>
            <input v-model="form.periodo" type="text" placeholder="AAAAMM" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="flex items-center space-x-3">
            <label class="text-sm text-slate-300 font-medium">Rut</label>
            <select v-model="form.rut" @change="handleRutChange" class="w-56 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
              <option value="">-- Seleccionar Trabajador --</option>
              <option v-for="p in personalList" :key="p.rut" :value="p.rut">{{ p.apater }} {{ p.amater }}, {{ p.nombres }}</option>
            </select>
            <input v-model="form.rut" type="text" placeholder="Rut" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="flex items-center space-x-3">
            <label class="text-sm text-slate-300 font-medium">Dias Trabajados</label>
            <input v-model="form.diasTrabajados" @blur="handleDiasBlur" type="number" class="w-20 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="flex items-center space-x-3">
            <label class="text-sm text-slate-300 font-medium">Póliza</label>
            <input v-model="form.poliza" type="text" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <!-- Campos de Solo Lectura (calculados) -->
        <div class="grid grid-cols-2 gap-x-8">
          <!-- Columna Izquierda -->
          <div class="space-y-2.5">
            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Imponible</label>
              <input :value="form.imponible" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Comisiones</label>
              <input :value="form.comisiones" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Gratificación</label>
              <input :value="form.gratificacion" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Colacion</label>
              <input :value="form.colacion" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Movilización</label>
              <input :value="form.movilizacion" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Aguinaldo</label>
              <input :value="form.aguinaldo" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Total Imponible</label>
              <input :value="form.totalImponible" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Total No Imponible</label>
              <input :value="form.totalNoImponible" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Total Haberes</label>
              <input :value="form.totalHaberes" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Afp</label>
              <input :value="form.afpDescuento" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Salud</label>
              <input :value="form.saludDescuento" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Haberes Tributables</label>
              <input :value="form.haberesTributables" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">IUT</label>
              <input :value="form.iut" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Anticipo</label>
              <input :value="form.anticipo" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-36 text-right text-sm text-slate-300 font-medium">Liquido</label>
              <input :value="form.liquido" readonly type="text" class="flex-1 bg-slate-950 border border-emerald-800/60 rounded px-3 py-1.5 text-sm font-mono font-bold text-emerald-400 text-right cursor-default select-none" />
            </div>
          </div>

          <!-- Columna Derecha -->
          <div class="space-y-2.5">
            <div class="flex items-center space-x-2">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">AFP</label>
              <input :value="form.afpNombre" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-2 py-1.5 text-sm font-mono text-slate-400 cursor-default select-none" />
              <input :value="form.afpPorcentaje" readonly type="text" class="w-14 bg-slate-950/60 border border-slate-800 rounded px-1 py-1.5 text-sm font-mono text-slate-400 text-center cursor-default select-none" />
              <input :value="form.afpUnidad" readonly type="text" class="w-14 bg-slate-950/60 border border-slate-800 rounded px-1 py-1.5 text-sm font-mono text-slate-400 text-center cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-2">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Salud</label>
              <input :value="form.saludNombre" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-2 py-1.5 text-sm font-mono text-slate-400 cursor-default select-none" />
              <input :value="form.saludValor" readonly type="text" class="w-14 bg-slate-950/60 border border-slate-800 rounded px-1 py-1.5 text-sm font-mono text-slate-400 text-center cursor-default select-none" />
              <input :value="form.saludUnidad" readonly type="text" class="w-14 bg-slate-950/60 border border-slate-800 rounded px-1 py-1.5 text-sm font-mono text-slate-400 text-center cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Ces. Trabajador</label>
              <input :value="form.cesTrabajador" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Ces. Empresa</label>
              <input :value="form.cesEmpresa" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">SIS</label>
              <input :value="form.sis" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Acc. del Trabajo</label>
              <input :value="form.accTrabajo" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Cta. Cte.</label>
              <input :value="form.ctaCte" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Aporte Adic.</label>
              <input :value="form.aporteAdicional" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Seguro Social</label>
              <input :value="form.seguroSocial" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Diferencia Isapre</label>
              <input :value="form.diferenciaIsapre" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-32 text-right text-sm text-slate-300 font-medium">Expect. de Vida</label>
              <input :value="form.expectativaVida" readonly type="text" class="flex-1 bg-slate-950/60 border border-slate-800 rounded px-3 py-1.5 text-sm font-mono text-slate-400 text-right cursor-default select-none" />
            </div>
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel Lateral -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center min-h-95">
        <button @click="handleCalcular" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic shadow">Calcular</button>
        <button @click="handleGrabar" :disabled="cargando" class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Grabar</button>
        <button @click="handleImprimir" :disabled="cargando" class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Imprimir</button>
        <button @click="handleContabilizar" :disabled="cargando" class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Contabilizar</button>
        <button @click="handleImprimePoliza" :disabled="cargando" class="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Imprime Póliza</button>
        <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Limpiar</button>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Salir</button>
      </div>
    </div>

    <ReportePolizaModal
      :show="showPolizaModal"
      :poliza="form.poliza"
      :empresaNombre="activeCompany?.name || 'EMPRESA'"
      :reportData="polizaData"
      @close="showPolizaModal = false"
    />

    <ReporteLiquidacionSueldoModal
      :show="showLiquidacionModal"
      :liquidacion="liquidacionData"
      :empresa="empresaData"
      @close="showLiquidacionModal = false"
    />
  </div>
</template>
