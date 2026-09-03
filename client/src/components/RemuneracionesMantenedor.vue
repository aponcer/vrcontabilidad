<script setup>
import { ref, onMounted, watch } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const activeTab = ref('honorarios') // honorarios | afp | isapre | indices | valoresIpc | personal

// --- Honorarios (Mae_hon) ---
const honorarioForm = ref({ rut: '', nombre: '', certificado: '' })

const handleRutHonorarioBlur = async () => {
  const rut = honorarioForm.value.rut.trim().toUpperCase()
  if (!rut) return
  honorarioForm.value.rut = rut
  try {
    const res = await axios.get(`http://localhost:3000/api/mae_hon/${rut}`)
    if (res.data.data) {
      honorarioForm.value.nombre = res.data.data.nombre || ''
      honorarioForm.value.certificado = res.data.data.certificado ?? ''
    }
  } catch {
    // Sin coincidencia: se deja para ingresar como registro nuevo
  }
}

// --- Afp (catálogo de AFP + % de cotización total), tabla Afp real en la DB ---
const afpForm = ref({ nombre: '', cotizacion: '' })
const afpList = ref([])

const cargarAfp = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/afp')
    afpList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando Afp:', err.message)
  }
}

// --- Isapre (catálogo + % de cotización), tabla Isapre real en la DB ---
const isapreForm = ref({ nombre: '', cotizacion: '' })
const isapreList = ref([])

const cargarIsapre = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/isapre')
    isapreList.value = res.data.data || []
  } catch (err) {
    console.error('Error cargando Isapre:', err.message)
  }
}

// --- Indices previsionales anuales (Indi) ---
const indicesForm = ref({
  anio: '',
  sis: '',
  segCesantiaEmpleador: '',
  segCesantiaTrabajador: '',
  accidenteTrabajo: '',
  topeImponibleUf: '',
  aporteAdicional: '',
  seguroSocial: '',
  expectativaVida: ''
})

const handleAnioIndicesBlur = async () => {
  const anio = indicesForm.value.anio.trim()
  if (!anio) return
  try {
    const res = await axios.get(`http://localhost:3000/api/indi/${anio}`)
    const d = res.data.data
    if (d) {
      indicesForm.value.sis = d.sis ?? ''
      indicesForm.value.segCesantiaEmpleador = d.cesEmpleador ?? ''
      indicesForm.value.segCesantiaTrabajador = d.cesTrabajador ?? ''
      indicesForm.value.accidenteTrabajo = d.accidenteTrabajo ?? ''
      indicesForm.value.topeImponibleUf = d.topeImponible ?? ''
      indicesForm.value.aporteAdicional = d.aporteAdicional ?? ''
      indicesForm.value.seguroSocial = d.seguroSocial ?? ''
      indicesForm.value.expectativaVida = d.expectativaVida ?? ''
    }
  } catch {
    // Sin coincidencia: se deja para ingresar como año nuevo
  }
}

// --- Actualizar valores IPC: fusiona las pestañas Uf/Utm del .frm original en
// una sola tabla. El .frm original permite consultar/editar CUALQUIER período
// (Text1/Text3 = Periodo); acá simplificamos a un solo período: el mes actual
// (detectado automáticamente, sin selector). "Fecha Actualización"/"Tipo de
// Actualización" se agregaron como columnas nuevas en Uf/Utm (no existían en
// el .frm original) y sí persisten; los registros históricos previos a este
// cambio quedaron marcados como "Manual" con fecha = primer día del mes de su Periodo.
const valoresIpc = ref([
  { tipo: 'UF', valor: null, fechaActualizacion: '', tipoActualizacion: '' },
  { tipo: 'UTM', valor: null, fechaActualizacion: '', tipoActualizacion: '' }
])

const hoyIso = () => new Date().toISOString().split('T')[0]
const periodoActual = () => hoyIso().replace(/-/g, '').substring(0, 6) // AAAAMM

const cargarValoresIpcActuales = async () => {
  const periodo = periodoActual()
  try {
    const [resUf, resUtm] = await Promise.all([
      axios.get(`http://localhost:3000/api/uf/${periodo}`),
      axios.get(`http://localhost:3000/api/utm/${periodo}`)
    ])
    if (resUf.data.data) {
      valoresIpc.value[0].valor = resUf.data.data.valor
      valoresIpc.value[0].tipoActualizacion = resUf.data.data.tipoActualizacion || ''
      valoresIpc.value[0].fechaActualizacion = resUf.data.data.fechaActualizacion || ''
    }
    if (resUtm.data.data) {
      valoresIpc.value[1].valor = resUtm.data.data.valor
      valoresIpc.value[1].tipoActualizacion = resUtm.data.data.tipoActualizacion || ''
      valoresIpc.value[1].fechaActualizacion = resUtm.data.data.fechaActualizacion || ''
    }
  } catch (err) {
    console.error('Error cargando Uf/Utm del período actual:', err.message)
  }
}

// --- Barra de estado / progreso (mismo patrón que ProcesosBalance8Columnas, ProcesosLibros, etc.) ---
const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

// Al cambiar de pestaña interna, limpia la barra para que no arrastre el último
// mensaje/estado de la pestaña anterior.
watch(activeTab, () => reset())

const handleActualizarMindicador = async () => {
  try {
    const res = await run(() => axios.get('http://localhost:3000/api/indices/mindicador'), 'Consultando mindicador.cl...')
    const hoy = hoyIso()

    const uf = res.data.uf
    const utm = res.data.utm
    if (uf) {
      valoresIpc.value[0].valor = uf.valor
      valoresIpc.value[0].fechaActualizacion = hoy
      valoresIpc.value[0].tipoActualizacion = 'Automática'
    }
    if (utm) {
      valoresIpc.value[1].valor = utm.valor
      valoresIpc.value[1].fechaActualizacion = hoy
      valoresIpc.value[1].tipoActualizacion = 'Automática'
    }

    estadoMensaje.value = 'UF y UTM actualizadas desde mindicador.cl.'
  } catch (err) {
    estadoMensaje.value = 'Error al actualizar desde mindicador.cl.'
    alert('Error al actualizar desde mindicador.cl: ' + (err.response?.data?.error || err.message))
  }
}

const handleValorIpcManual = (fila) => {
  fila.tipoActualizacion = 'Manual'
  fila.fechaActualizacion = hoyIso()
}

// --- Personal (Maeper: ficha del trabajador) ---
const personalFormInicial = () => ({
  rut: '', apellido: '', apellidoMaterno: '', nombres: '', cargo: '',
  afp: '', tipoTrabajador: '', isapre: '', vigente: '', tipoIsapre: '', valorIsapre: '',
  tipoSueldo: '', imponible: '', colacion: '', gratificacion: '', movilizacion: '',
  aguinaldo: '', comisiones: '', ctaCte: '', tipoContrato: '', fechaIngreso: '', fechaTermino: ''
})
const personalForm = ref(personalFormInicial())

const handleRutPersonalBlur = async () => {
  const rut = personalForm.value.rut.trim().toUpperCase()
  if (!rut) return
  personalForm.value.rut = rut
  try {
    const res = await axios.get(`http://localhost:3000/api/maeper/${rut}`)
    const d = res.data.data
    if (d) {
      personalForm.value = {
        rut: d.rut,
        apellido: d.apater || '',
        apellidoMaterno: d.amater || '',
        nombres: d.nombres || '',
        cargo: d.cargo || '',
        afp: d.afp || '',
        tipoTrabajador: d.tipoTrabajador || '',
        isapre: d.isapre || '',
        vigente: d.vigente || '',
        tipoIsapre: d.tipoIsapre || '',
        valorIsapre: d.valorIsapre ?? '',
        tipoSueldo: d.tipoSueldo || '',
        imponible: d.imponible ?? '',
        colacion: d.colacion ?? '',
        gratificacion: d.gratificacion ?? '',
        movilizacion: d.movilizacion ?? '',
        aguinaldo: d.aguinaldo ?? '',
        comisiones: d.comisiones ?? '',
        ctaCte: d.ctaCte ?? '',
        tipoContrato: d.tipoContrato || '',
        fechaIngreso: d.fechaIngreso || '',
        fechaTermino: d.fechaTermino || ''
      }
    }
  } catch {
    // Sin coincidencia: se deja para ingresar como trabajador nuevo
  }
}

// Si el nombre escrito en Afp/Isapre (dentro de Personal) no coincide con
// ninguno de la lista, se ofrece agregarlo como nuevo (cotización en 0,
// completable después desde su propia pestaña) en vez de solo rechazarlo.
const handleAfpPersonalBlur = async () => {
  const nombre = personalForm.value.afp.trim().toUpperCase()
  personalForm.value.afp = nombre
  if (!nombre) return
  if (afpList.value.some(a => a.nombre === nombre)) return

  if (confirm(`"${nombre}" no está registrada. ¿Deseas agregarla como una AFP nueva?`)) {
    try {
      await axios.post('http://localhost:3000/api/afp', { nombre, cotizacion: 0 })
      await cargarAfp()
      estadoMensaje.value = `AFP ${nombre} agregada (falta completar su % de cotización en la pestaña AFP).`
    } catch (err) {
      alert('Error al agregar la AFP: ' + (err.response?.data?.error || err.message))
      personalForm.value.afp = ''
    }
  } else {
    personalForm.value.afp = ''
  }
}

const handleIsaprePersonalBlur = async () => {
  const nombre = personalForm.value.isapre.trim().toUpperCase()
  personalForm.value.isapre = nombre
  if (!nombre) return
  if (isapreList.value.some(i => i.nombre === nombre)) return

  if (confirm(`"${nombre}" no está registrada. ¿Deseas agregarla como una Isapre nueva?`)) {
    try {
      await axios.post('http://localhost:3000/api/isapre', { nombre, cotizacion: 0 })
      await cargarIsapre()
      estadoMensaje.value = `Isapre ${nombre} agregada (falta completar su % de cotización en la pestaña Isapre).`
    } catch (err) {
      alert('Error al agregar la Isapre: ' + (err.response?.data?.error || err.message))
      personalForm.value.isapre = ''
    }
  } else {
    personalForm.value.isapre = ''
  }
}

onMounted(() => {
  emit('set-title', 'Mantenedor de Remuneraciones')
  cargarAfp()
  cargarIsapre()
  cargarValoresIpcActuales()
})

// --- Acción única "Grabar" (el .frm original no tiene botón de eliminar en
// ninguna pestaña, solo Grabar/Limpiar/Salir) ---
const handleGrabar = async () => {
  try {
    if (activeTab.value === 'afp') {
      const nombre = afpForm.value.nombre.trim().toUpperCase()
      if (!nombre) return alert('Selecciona una AFP.')
      const esNueva = !afpList.value.some(a => a.nombre === nombre)
      if (esNueva && !confirm(`"${nombre}" no está registrada. ¿Deseas agregarla como una AFP nueva?`)) return
      await run(() => axios.post('http://localhost:3000/api/afp', { nombre, cotizacion: afpForm.value.cotizacion }), 'Guardando...')
      await cargarAfp()
      handleLimpiar()
      estadoMensaje.value = esNueva ? `AFP ${nombre} agregada.` : `AFP ${nombre} actualizada.`
      progreso.value = 100

    } else if (activeTab.value === 'isapre') {
      const nombre = isapreForm.value.nombre.trim().toUpperCase()
      if (!nombre) return alert('Selecciona una Isapre.')
      const esNueva = !isapreList.value.some(i => i.nombre === nombre)
      if (esNueva && !confirm(`"${nombre}" no está registrada. ¿Deseas agregarla como una Isapre nueva?`)) return
      await run(() => axios.post('http://localhost:3000/api/isapre', { nombre, cotizacion: isapreForm.value.cotizacion }), 'Guardando...')
      await cargarIsapre()
      handleLimpiar()
      estadoMensaje.value = esNueva ? `Isapre ${nombre} agregada.` : `Isapre ${nombre} actualizada.`
      progreso.value = 100

    } else if (activeTab.value === 'honorarios') {
      const rut = honorarioForm.value.rut.trim().toUpperCase()
      if (!rut) return alert('Ingresa el Rut.')
      await run(() => axios.post('http://localhost:3000/api/mae_hon', {
        rut, nombre: honorarioForm.value.nombre, certificado: honorarioForm.value.certificado
      }), 'Guardando...')
      handleLimpiar()
      estadoMensaje.value = `Honorario de ${rut} guardado.`
      progreso.value = 100

    } else if (activeTab.value === 'indices') {
      const anio = indicesForm.value.anio.trim()
      if (!anio) return alert('Ingresa el Año.')
      await run(() => axios.post('http://localhost:3000/api/indi', {
        agno: anio,
        sis: indicesForm.value.sis || 0,
        cesEmpleador: indicesForm.value.segCesantiaEmpleador || 0,
        cesTrabajador: indicesForm.value.segCesantiaTrabajador || 0,
        accidenteTrabajo: indicesForm.value.accidenteTrabajo || 0,
        topeImponible: indicesForm.value.topeImponibleUf || 0,
        aporteAdicional: indicesForm.value.aporteAdicional || 0,
        seguroSocial: indicesForm.value.seguroSocial || 0,
        expectativaVida: indicesForm.value.expectativaVida || 0
      }), 'Guardando...')
      handleLimpiar()
      estadoMensaje.value = `Índices del año ${anio} guardados.`
      progreso.value = 100

    } else if (activeTab.value === 'valoresIpc') {
      const periodo = periodoActual()
      const resUtm = await run(async () => {
        await axios.post('http://localhost:3000/api/uf', {
          periodo, valor: valoresIpc.value[0].valor,
          tipoActualizacion: valoresIpc.value[0].tipoActualizacion || 'Manual'
        })
        return axios.post('http://localhost:3000/api/utm', {
          periodo, valor: valoresIpc.value[1].valor,
          tipoActualizacion: valoresIpc.value[1].tipoActualizacion || 'Manual'
        })
      }, 'Guardando...')
      await cargarValoresIpcActuales()
      estadoMensaje.value = resUtm.data.message

    } else if (activeTab.value === 'personal') {
      const rut = personalForm.value.rut.trim().toUpperCase()
      if (!rut) return alert('Ingresa el Rut del trabajador.')
      const p = personalForm.value
      const nombreCompleto = `${p.nombres} ${p.apellido}`.trim()
      await run(() => axios.post('http://localhost:3000/api/maeper', {
        rut,
        apater: p.apellido,
        amater: p.apellidoMaterno,
        nombres: p.nombres,
        cargo: p.cargo,
        afp: p.afp,
        isapre: p.isapre,
        valorIsapre: p.valorIsapre || 0,
        fechaIngreso: p.fechaIngreso,
        fechaTermino: p.fechaTermino,
        imponible: p.imponible || 0,
        movilizacion: p.movilizacion || 0,
        colacion: p.colacion || 0,
        comisiones: p.comisiones || 0,
        tipoSueldo: p.tipoSueldo,
        tipoIsapre: p.tipoIsapre,
        tipoContrato: p.tipoContrato,
        tipoTrabajador: p.tipoTrabajador,
        aguinaldo: p.aguinaldo || 0,
        vigente: p.vigente,
        gratificacion: p.gratificacion || 0,
        ctaCte: p.ctaCte || 0
      }), 'Guardando...')
      handleLimpiar()
      estadoMensaje.value = `Ficha de ${nombreCompleto || rut} guardada.`
      progreso.value = 100
    }
  } catch (err) {
    estadoMensaje.value = 'Error al guardar.'
    alert('Error al guardar: ' + (err.response?.data?.error || err.message))
  }
}

const handleLimpiar = () => {
  honorarioForm.value = { rut: '', nombre: '', certificado: '' }
  afpForm.value = { nombre: '', cotizacion: '' }
  isapreForm.value = { nombre: '', cotizacion: '' }
  // El .frm original no limpia el Año al presionar Limpiar en la pestaña Indices
  indicesForm.value = {
    anio: indicesForm.value.anio, sis: '', segCesantiaEmpleador: '', segCesantiaTrabajador: '',
    accidenteTrabajo: '', topeImponibleUf: '', aporteAdicional: '', seguroSocial: '', expectativaVida: ''
  }
  personalForm.value = personalFormInicial()
  reset()
}

const handleAfpRowSelect = (row) => {
  afpForm.value = { nombre: row.nombre, cotizacion: row.cotizacion }
}

const handleIsapreRowSelect = (row) => {
  isapreForm.value = { nombre: row.nombre, cotizacion: row.cotizacion }
}

const handleEliminarAfp = async (nombre) => {
  if (!confirm(`¿Eliminar la AFP ${nombre}?`)) return
  try {
    await axios.delete(`http://localhost:3000/api/afp/${nombre}`)
    await cargarAfp()
    if (afpForm.value.nombre === nombre) handleLimpiar()
    estadoMensaje.value = `AFP ${nombre} eliminada.`
    progreso.value = 0
  } catch (err) {
    alert('Error al eliminar: ' + (err.response?.data?.error || err.message))
  }
}

const handleEliminarIsapre = async (nombre) => {
  if (!confirm(`¿Eliminar la Isapre ${nombre}?`)) return
  try {
    await axios.delete(`http://localhost:3000/api/isapre/${nombre}`)
    await cargarIsapre()
    if (isapreForm.value.nombre === nombre) handleLimpiar()
    estadoMensaje.value = `Isapre ${nombre} eliminada.`
    progreso.value = 0
  } catch (err) {
    alert('Error al eliminar: ' + (err.response?.data?.error || err.message))
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Mantenedor de Remuneraciones</h2>
      <span class="text-xs text-slate-400 uppercase tracking-wider font-semibold">MantRem.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Izquierdo: Formulario con Pestañas -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between">
        <div>

        <div class="flex flex-wrap border-b border-slate-700 gap-1 mb-4">
          <button
            @click="activeTab = 'honorarios'"
            :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'honorarios' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
            Honorarios
          </button>
          <button
            @click="activeTab = 'afp'"
            :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'afp' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
            AFP
          </button>
          <button
            @click="activeTab = 'isapre'"
            :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'isapre' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
            Isapre
          </button>
          <button
            @click="activeTab = 'indices'"
            :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'indices' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
            Indices
          </button>
          <button
            @click="activeTab = 'valoresIpc'"
            :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'valoresIpc' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
            Actualizar valores IPC
          </button>
          <button
            @click="activeTab = 'personal'"
            :class="['px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-t border-x border-transparent', activeTab === 'personal' ? 'bg-slate-800 text-emerald-400 border-slate-700 font-semibold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40']">
            Personal
          </button>
        </div>

        <!-- Listas de autocompletado compartidas (Afp/Isapre), disponibles sin importar
             qué pestaña esté activa: las usan tanto la pestaña Afp/Isapre como Personal -->
        <datalist id="afp-nombres">
          <option v-for="a in afpList" :key="a.nombre" :value="a.nombre" />
        </datalist>
        <datalist id="isapre-nombres">
          <option v-for="i in isapreList" :key="i.nombre" :value="i.nombre" />
        </datalist>

        <!-- Honorarios -->
        <div v-if="activeTab === 'honorarios'" class="space-y-4 py-4 min-h-80 flex flex-col items-center">
          <div class="space-y-3 w-full max-w-md">
            <div class="flex items-center space-x-3">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Rut</label>
              <input
                v-model="honorarioForm.rut"
                @blur="handleRutHonorarioBlur"
                @focus="$event.target.select()"
                type="text" placeholder="12345678-9"
                title="Al salir del campo (Tab) se autocompleta si el Rut ya existe."
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Nombre</label>
              <input v-model="honorarioForm.nombre" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-24 text-right text-sm text-slate-300 font-medium">Certificado</label>
              <input v-model="honorarioForm.certificado" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <!-- Afp -->
        <div v-else-if="activeTab === 'afp'" class="space-y-4 py-4 min-h-80">
          <div class="flex items-center justify-center space-x-3">
            <input
              v-model="afpForm.nombre"
              list="afp-nombres"
              type="text"
              placeholder="Nombre AFP (nueva o existente)"
              title="Escribe una AFP nueva o elige una de la lista"
              class="w-56 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            <input v-model="afpForm.cotizacion" type="number" step="0.01" placeholder="Cotización %" class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden max-w-md mx-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-800 text-slate-400 border-b border-slate-700">
                <tr>
                  <th class="p-2 border-r border-slate-700">Nombre</th>
                  <th class="p-2 border-r border-slate-700 text-right">Cotización</th>
                  <th class="p-2 w-16"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-300">
                <tr v-for="a in afpList" :key="a.nombre" class="hover:bg-slate-800/40 font-mono">
                  <td class="p-2 border-r border-slate-800 font-sans cursor-pointer" @dblclick="handleAfpRowSelect(a)" title="Doble clic para cargar en el formulario">{{ a.nombre }}</td>
                  <td class="p-2 border-r border-slate-800 text-right cursor-pointer" @dblclick="handleAfpRowSelect(a)" title="Doble clic para cargar en el formulario">{{ a.cotizacion }}</td>
                  <td class="p-2 text-center">
                    <button @click="handleEliminarAfp(a.nombre)" class="text-red-400 hover:text-red-300 font-sans text-[11px] font-semibold cursor-pointer">Eliminar</button>
                  </td>
                </tr>
                <tr v-if="afpList.length === 0">
                  <td colspan="3" class="p-3 text-center text-slate-500 italic">Sin AFP registradas.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Isapre -->
        <div v-else-if="activeTab === 'isapre'" class="space-y-4 py-4 min-h-80">
          <div class="flex items-center justify-center space-x-3">
            <input
              v-model="isapreForm.nombre"
              list="isapre-nombres"
              type="text"
              placeholder="Nombre Isapre (nueva o existente)"
              title="Escribe una Isapre nueva o elige una de la lista"
              class="w-56 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            <input v-model="isapreForm.cotizacion" type="number" step="0.01" placeholder="Cotización %" class="w-32 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden max-w-md mx-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-800 text-slate-400 border-b border-slate-700">
                <tr>
                  <th class="p-2 border-r border-slate-700">Nombre</th>
                  <th class="p-2 border-r border-slate-700 text-right">Cotización</th>
                  <th class="p-2 w-16"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-300">
                <tr v-for="i in isapreList" :key="i.nombre" class="hover:bg-slate-800/40 font-mono">
                  <td class="p-2 border-r border-slate-800 font-sans cursor-pointer" @dblclick="handleIsapreRowSelect(i)" title="Doble clic para cargar en el formulario">{{ i.nombre }}</td>
                  <td class="p-2 border-r border-slate-800 text-right cursor-pointer" @dblclick="handleIsapreRowSelect(i)" title="Doble clic para cargar en el formulario">{{ i.cotizacion }}</td>
                  <td class="p-2 text-center">
                    <button @click="handleEliminarIsapre(i.nombre)" class="text-red-400 hover:text-red-300 font-sans text-[11px] font-semibold cursor-pointer">Eliminar</button>
                  </td>
                </tr>
                <tr v-if="isapreList.length === 0">
                  <td colspan="3" class="p-3 text-center text-slate-500 italic">Sin Isapres registradas.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Indices -->
        <div v-else-if="activeTab === 'indices'" class="space-y-3 py-4 min-h-80 flex flex-col items-center">
          <div class="space-y-3 w-full max-w-md">
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Año</label>
              <input
                v-model="indicesForm.anio"
                @blur="handleAnioIndicesBlur"
                @focus="$event.target.select()"
                type="text" placeholder="2026"
                title="Al salir del campo (Tab) se autocompleta si el año ya existe."
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">SIS</label>
              <input v-model="indicesForm.sis" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Seg. Cesantía Empleador</label>
              <input v-model="indicesForm.segCesantiaEmpleador" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Seg. Cesantía Trabajador</label>
              <input v-model="indicesForm.segCesantiaTrabajador" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Accidente del Trabajo</label>
              <input v-model="indicesForm.accidenteTrabajo" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Tope Imponible (UF)</label>
              <input v-model="indicesForm.topeImponibleUf" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Aporte Adicional</label>
              <input v-model="indicesForm.aporteAdicional" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Seguro Social</label>
              <input v-model="indicesForm.seguroSocial" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-52 text-right text-sm text-slate-300 font-medium">Expectativa de Vida</label>
              <input v-model="indicesForm.expectativaVida" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        <!-- Actualizar valores IPC (Uf + Utm fusionados) -->
        <div v-else-if="activeTab === 'valoresIpc'" class="space-y-4 py-4 min-h-80">
          <div class="flex justify-center">
            <button
              @click="handleActualizarMindicador"
              :disabled="cargando"
              class="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded text-sm shadow transition-colors cursor-pointer">
              {{ cargando ? 'Actualizando...' : 'Actualizar desde mindicador.cl' }}
            </button>
          </div>

          <div class="bg-slate-900/60 border border-slate-700 rounded-lg overflow-hidden max-w-2xl mx-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead class="bg-slate-800 text-slate-400 border-b border-slate-700">
                <tr>
                  <th class="p-2 border-r border-slate-700">Tipo</th>
                  <th class="p-2 border-r border-slate-700 text-right">Valor</th>
                  <th class="p-2 border-r border-slate-700">Fecha Actualización</th>
                  <th class="p-2">Tipo de Actualización</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800 text-slate-300">
                <tr v-for="fila in valoresIpc" :key="fila.tipo" class="font-mono">
                  <td class="p-2 border-r border-slate-800 font-sans font-bold text-emerald-400">{{ fila.tipo }}</td>
                  <td class="p-2 border-r border-slate-800 text-right">
                    <input
                      v-model.number="fila.valor"
                      @input="handleValorIpcManual(fila)"
                      type="number"
                      step="0.01"
                      class="w-28 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-right text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td class="p-2 border-r border-slate-800">{{ fila.fechaActualizacion || '-' }}</td>
                  <td class="p-2">
                    <span v-if="fila.tipoActualizacion" :class="['px-2 py-0.5 rounded text-[10px] font-sans font-semibold', fila.tipoActualizacion === 'Automática' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-slate-700 text-slate-300']">
                      {{ fila.tipoActualizacion }}
                    </span>
                    <span v-else class="text-slate-500">-</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Personal (Maeper) -->
        <div v-else-if="activeTab === 'personal'" class="space-y-3 py-4 min-h-80">
          <div class="grid grid-cols-2 gap-x-6 gap-y-3 max-w-3xl mx-auto">
            <div class="flex items-center space-x-3 col-span-2">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Rut</label>
              <input
                v-model="personalForm.rut"
                @blur="handleRutPersonalBlur"
                @focus="$event.target.select()"
                type="text" placeholder="12345678-9"
                title="Al salir del campo (Tab) se carga la ficha completa si el Rut ya existe."
                class="w-48 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3 col-span-2">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Apellido</label>
              <input v-model="personalForm.apellido" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3 col-span-2">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Apellido Materno</label>
              <input v-model="personalForm.apellidoMaterno" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3 col-span-2">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Nombres</label>
              <input v-model="personalForm.nombres" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3 col-span-2">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Cargo</label>
              <input v-model="personalForm.cargo" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Afp</label>
              <input
                v-model="personalForm.afp"
                @blur="handleAfpPersonalBlur"
                list="afp-nombres"
                type="text"
                placeholder="Nombre AFP"
                title="Escribe una AFP nueva o elige una de la lista"
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Tipo Trabajador</label>
              <select v-model="personalForm.tipoTrabajador" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                <option value="ACTIVO">ACTIVO</option>
                <option value="PENSIONADO">PENSIONADO</option>
              </select>
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Isapre</label>
              <input
                v-model="personalForm.isapre"
                @blur="handleIsaprePersonalBlur"
                list="isapre-nombres"
                type="text"
                placeholder="Nombre Isapre"
                title="Escribe una Isapre nueva o elige una de la lista"
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Vigente</label>
              <input v-model="personalForm.vigente" type="text" placeholder="S/N" class="w-20 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Tipo Isapre</label>
              <select v-model="personalForm.tipoIsapre" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                <option value="UF">UF</option>
                <option value="PE">PE</option>
              </select>
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Valor Isapre</label>
              <input v-model="personalForm.valorIsapre" type="number" step="0.01" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Tipo Sueldo</label>
              <select v-model="personalForm.tipoSueldo" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                <option value="UF">UF</option>
                <option value="PE">PE</option>
              </select>
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Imponible</label>
              <input v-model="personalForm.imponible" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Colación</label>
              <input v-model="personalForm.colacion" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Gratificación</label>
              <input v-model="personalForm.gratificacion" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Movilización</label>
              <input v-model="personalForm.movilizacion" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Aguinaldo</label>
              <input v-model="personalForm.aguinaldo" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Comisiones</label>
              <input v-model="personalForm.comisiones" type="number" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Cta. Cte.</label>
              <input v-model="personalForm.ctaCte" type="text" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>

            <div class="flex items-center space-x-3 col-span-2">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Tipo Contrato</label>
              <select v-model="personalForm.tipoContrato" class="w-48 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
                <option value="">Seleccionar...</option>
                <option value="INDEFINIDO">INDEFINIDO</option>
                <option value="PLAZO FIJO">PLAZO FIJO</option>
              </select>
            </div>

            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Fecha Ingreso</label>
              <input v-model="personalForm.fechaIngreso" type="date" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm text-slate-300 font-medium">Fecha Término</label>
              <input v-model="personalForm.fechaTermino" type="date" class="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>
        </div>

        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />

      </div>

      <!-- Panel Derecho: Acciones -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center">
        <button @click="handleGrabar" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded text-sm shadow transition-colors">
          Grabar
        </button>
        <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
          Limpiar
        </button>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 font-semibold py-2 px-4 rounded text-sm transition-colors">
          Salir
        </button>
      </div>
    </div>
  </div>
</template>
