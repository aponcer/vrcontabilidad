<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import BarraProgreso from './BarraProgreso.vue'
import { useBarraProgreso } from '../composables/useBarraProgreso'

const props = defineProps({
  activeCompany: Object
})

const emit = defineEmits(['close', 'set-title'])

const form = ref({
  fecha: new Date().toISOString().split('T')[0],
  poliza: ''
})

const { cargando, progreso, estadoMensaje, run } = useBarraProgreso()

onMounted(() => {
  emit('set-title', 'Traspasos')
})

const handleProcesar = async () => {
  if (!form.value.fecha || !form.value.poliza.trim()) {
    alert('Ingresa la Fecha y el N° de Comprobante (C. Diario).')
    return
  }

  try {
    const res = await run(
      () => axios.post('http://localhost:3000/api/traspasos/procesar', {
        fecha: form.value.fecha,
        poliza: form.value.poliza.trim()
      }),
      'Procesando traspaso...'
    )
    estadoMensaje.value = res.data.message
  } catch (err) {
    estadoMensaje.value = 'Error al procesar el traspaso.'
    alert('Error al procesar traspaso: ' + (err.response?.data?.error || err.message))
  }
}
</script>

<template>
  <div class="space-y-4 text-slate-200">
    <div class="flex justify-between items-center border-b border-slate-700 pb-3">
      <h2 class="text-xl font-bold text-emerald-400">Traspasos</h2>
      <span class="text-xs text-slate-400 font-mono">Traspasos.frm</span>
    </div>

    <div class="grid grid-cols-12 gap-4">
      <!-- Panel Principal -->
      <div class="col-span-9 bg-slate-900/60 border border-slate-700 rounded-lg p-6 flex flex-col justify-between min-h-95">
        <div class="flex-1 flex flex-col items-center justify-center space-y-4">
          <div class="space-y-3 bg-slate-800/80 p-6 rounded-lg border border-slate-700/80 shadow-inner w-full max-w-sm">
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm font-semibold text-slate-300">Fecha</label>
              <input
                v-model="form.fecha"
                type="date"
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
            </div>
            <div class="flex items-center space-x-3">
              <label class="w-28 text-right text-sm font-semibold text-slate-300">C. Diario</label>
              <input
                v-model="form.poliza"
                type="text"
                placeholder="N° Comprobante"
                class="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm"
              />
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
          @click="emit('close')"
          class="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 font-semibold py-2.5 px-4 rounded text-sm transition-colors cursor-pointer italic">
          Salir
        </button>
      </div>
    </div>
  </div>
</template>
