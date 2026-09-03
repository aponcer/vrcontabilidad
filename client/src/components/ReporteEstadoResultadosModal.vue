<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  periodo: String,
  reportData: { type: Array, default: () => [] },
  empresa: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close'])

// Etiquetas de grupo tal como aparecen en el reporte real (Est_resul.rpt): el
// Tipo '01' agrupa las cuentas de Ganancia como "Ventas" y el '02' las de
// Pérdida como "Gastos de Operación". El .frm sólo genera estos dos códigos.
const GRUPOS = {
  '01': 'Ventas',
  '02': 'Gastos de Operación'
}

const fmt = (val) => {
  if (!val && val !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(Math.round(val))
}

const hoy = computed(() => new Date().toLocaleDateString('es-CL'))

const grupos = computed(() => {
  const orden = ['01', '02']
  return orden
    .map(tipo => {
      const filas = props.reportData.filter(r => r.Tipo === tipo)
      if (filas.length === 0) return null
      const subtotal = filas.reduce((acc, r) => acc + Number(r.Valor || 0), 0)
      return { tipo, nombre: GRUPOS[tipo] || `Tipo ${tipo}`, filas, subtotal }
    })
    .filter(Boolean)
})

const resultadoEjercicio = computed(() => {
  const ventas = grupos.value.find(g => g.tipo === '01')?.subtotal || 0
  const gastos = grupos.value.find(g => g.tipo === '02')?.subtotal || 0
  return ventas - gastos
})

const handleImprimir = () => {
  window.print()
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

      <!-- Control Bar -->
      <div class="no-print bg-slate-800 border-b border-slate-700 px-6 py-3 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-3">
          <button @click="handleImprimir" class="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-1.5 rounded text-xs flex items-center space-x-2 transition-colors cursor-pointer shadow">
            <span>Imprimir</span>
          </button>
          <button @click="emit('close')" class="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold px-4 py-1.5 rounded text-xs transition-colors cursor-pointer border border-slate-600">
            Cancelar
          </button>
        </div>
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Estado de Resultados</span>
      </div>

      <!-- Document Sheet: el scroll vive en el "papel" blanco, no en este
           contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-8 shadow-2xl w-[210mm] font-sans text-[11px]">

          <div class="mb-2">
            <p class="font-bold">{{ empresa.Rsoc || 'EMPRESA' }}</p>
            <p class="text-[10px] text-gray-700">{{ hoy }}</p>
          </div>

          <h1 class="text-center font-bold text-sm mb-4 uppercase">Estado de Resultados &ndash; Período: {{ periodo }}</h1>

          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b border-black font-bold underline">
                <th class="py-1 text-left pl-1 w-16">Cuenta</th>
                <th class="py-1 text-left">Nombre</th>
                <th class="py-1 text-right pr-1 w-28">Valor</th>
              </tr>
            </thead>
            <tbody v-for="g in grupos" :key="g.tipo">
              <tr>
                <td colspan="3" class="pt-3 pb-1 font-bold">{{ g.tipo }}&nbsp;&nbsp;{{ g.nombre }}</td>
              </tr>
              <tr v-for="(r, idx) in g.filas" :key="idx">
                <td class="py-0.5 pl-1">{{ r.Cuenta }}</td>
                <td class="py-0.5">{{ r.Nombre }}</td>
                <td class="py-0.5 text-right pr-1">{{ fmt(r.Valor) }}</td>
              </tr>
              <tr class="font-bold">
                <td colspan="2"></td>
                <td class="py-1 text-right pr-1 border-t border-black">{{ fmt(g.subtotal) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="font-bold">
                <td colspan="2" class="pt-3">Resultado del Ejercicio</td>
                <td class="pt-3 text-right pr-1 border-t-2 border-black">{{ fmt(resultadoEjercicio) }}</td>
              </tr>
            </tfoot>
          </table>

        </div>
      </div>

    </div>
  </div>
  </Teleport>
</template>

<style scoped>
@media print {
  @page {
    margin: 10mm;
    size: portrait;
  }
}
</style>
