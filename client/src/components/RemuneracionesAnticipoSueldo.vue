<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const { cargando, progreso, estadoMensaje, run, reset } = useBarraProgreso()

const periodoActual = () => new Date().toISOString().replace(/-/g, '').substring(0, 6)

const formInicial = () => ({
  periodo: periodoActual(),
  rut: '',
  monto: ''
})

const form = ref(formInicial())
const personalList = ref([])

onMounted(async () => {
  emit('set-title', 'Anticipo de Sueldo')
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

// Combo1_LostFocus: al elegir el trabajador, trae el Anticipo ya grabado (si existe)
// para el Periodo actual, igual que el .frm original.
const handleRutChange = async () => {
  const rut = form.value.rut.trim()
  if (!rut || !form.value.periodo) {
    form.value.monto = ''
    return
  }

  try {
    const res = await run(() => axios.get('http://localhost:3000/api/anticipo-sueldo', {
      params: { periodo: form.value.periodo, rut }
    }), 'Consultando anticipo existente...')

    form.value.monto = res.data.anticipo ?? ''
    estadoMensaje.value = res.data.anticipo != null
      ? `Anticipo existente cargado para ${rut}.`
      : `${rut} no tiene un anticipo grabado en el período ${form.value.periodo}.`
  } catch (err) {
    estadoMensaje.value = 'Error al consultar el anticipo.'
    alert('Error al consultar el anticipo: ' + (err.response?.data?.error || err.message))
  }
}

// Grabar_Click. A diferencia del .frm original (que llamaba a Limpiar_Click al
// final), acá se dejan los campos visibles a propósito para que el usuario vea
// lo que grabó; los limpia manualmente con "Limpiar" o cambiando de pestaña.
const handleGrabar = async () => {
  if (!form.value.periodo) return alert('Ingresa el Período.')
  if (!form.value.rut) return alert('Selecciona un Empleado.')

  try {
    await run(() => axios.post('http://localhost:3000/api/anticipo-sueldo', {
      periodo: form.value.periodo,
      rut: form.value.rut,
      anticipo: Number(form.value.monto) || 0
    }), 'Grabando anticipo...')

    estadoMensaje.value = `Anticipo de ${form.value.rut} grabado.`
  } catch (err) {
    estadoMensaje.value = 'Error al grabar el anticipo.'
    alert('Error al grabar el anticipo: ' + (err.response?.data?.error || err.message))
  }
}

// Limpiar_Click: acá sí limpia también el Período (a diferencia de Liquidación de Sueldos)
const handleLimpiar = () => {
  form.value = formInicial()
  reset()
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Anticipo de Sueldo</h2>
      <span class="text-xs text-slate-400 font-mono">Anti_suel.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col justify-between min-h-95">
        <div class="space-y-3 py-4 max-w-xl">
          <div class="flex items-center space-x-3">
            <label class="w-28 text-right text-sm text-slate-300 font-medium">Periodo</label>
            <input v-model="form.periodo" type="text" placeholder="AAAAMM" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="flex items-center space-x-3">
            <label class="w-28 text-right text-sm text-slate-300 font-medium">Empleado</label>
            <select v-model="form.rut" @change="handleRutChange" class="w-72 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500">
              <option value="">-- Seleccionar Trabajador --</option>
              <option v-for="p in personalList" :key="p.rut" :value="p.rut">{{ p.apater }} {{ p.amater }}, {{ p.nombres }}</option>
            </select>
            <input v-model="form.rut" type="text" placeholder="Rut" class="w-28 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-center focus:outline-none focus:border-emerald-500" />
          </div>

          <div class="flex items-center space-x-3">
            <label class="w-28 text-right text-sm text-slate-300 font-medium">Monto</label>
            <input v-model="form.monto" type="number" class="w-36 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 text-right focus:outline-none focus:border-emerald-500" />
          </div>
        </div>

        <BarraProgreso :mensaje="estadoMensaje" :progreso="progreso" class="mt-4" />
      </div>

      <!-- Panel Lateral -->
      <div class="col-span-3 bg-slate-900/60 border border-slate-700 rounded-lg p-4 flex flex-col space-y-3 justify-center min-h-95">
        <button @click="handleGrabar" :disabled="cargando" class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic shadow">Grabar</button>
        <button @click="handleLimpiar" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Limpiar</button>
        <button @click="emit('close')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">Salir</button>
      </div>
    </div>
  </div>
</template>
