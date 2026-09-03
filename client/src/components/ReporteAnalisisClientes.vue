<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  periodo: String,
  reportData: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const fmt = (val) => {
  if (!val && val !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(Math.round(val))
}

const totDebito = computed(() => props.reportData.reduce((a, r) => a + Number(r.Debito || 0), 0))
const totCredito = computed(() => props.reportData.reduce((a, r) => a + Number(r.Credito || 0), 0))
const totSaldo = computed(() => totDebito.value - totCredito.value)

const handleImprimir = () => {
  window.print()
}
</script>

<template>
  <Teleport to="body">
  <div v-if="show" class="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
    <div class="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

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
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Analisis de Clientes</span>
      </div>

      <!-- Document Sheet: el scroll vive en el "papel" blanco, no en este
           contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-8 shadow-2xl w-[210mm] font-sans text-[11px]">

          <h1 class="text-center font-bold text-sm mb-6">Analisis de Clientes Periodo:{{ periodo }}</h1>

          <table class="w-full border-collapse">
            <thead>
              <tr class="border-b border-black font-bold underline">
                <th class="py-1 text-left pl-1">Rut</th>
                <th class="py-1 text-left">Razón Social</th>
                <th class="py-1 text-left w-14">Tdoc</th>
                <th class="py-1 text-left w-20">Numdoc</th>
                <th class="py-1 text-right w-24">Debito</th>
                <th class="py-1 text-right w-24">Credito</th>
                <th class="py-1 text-right pr-1 w-24">Saldo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in reportData" :key="idx">
                <td class="py-0.5 pl-1">{{ r.Rut }}</td>
                <td class="py-0.5">{{ r.RazonSocial }}</td>
                <td class="py-0.5">{{ r.Tdoc }}</td>
                <td class="py-0.5">{{ r.Numdoc }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Debito) }}</td>
                <td class="py-0.5 text-right">{{ fmt(r.Credito) }}</td>
                <td class="py-0.5 text-right pr-1"></td>
              </tr>
              <tr v-if="reportData.length === 0">
                <td colspan="7" class="py-6 text-center text-gray-500 italic">Sin movimientos en CtaCte_cli.</td>
              </tr>
            </tbody>
            <tfoot v-if="reportData.length > 0">
              <tr class="font-bold border-t border-black">
                <td colspan="4"></td>
                <td class="py-1 text-right">{{ fmt(totDebito) }}</td>
                <td class="py-1 text-right">{{ fmt(totCredito) }}</td>
                <td class="py-1 text-right pr-1">{{ fmt(totSaldo) }}</td>
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
