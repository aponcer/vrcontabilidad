<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  certificado: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close'])

const fmt = (val) => {
  if (!val && val !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(Math.round(val))
}

const empresa = computed(() => props.certificado.empresa || {})
const detalle = computed(() => props.certificado.detalle || [])

const totales = computed(() => detalle.value.reduce((acc, r) => ({
  honorarioBruto: acc.honorarioBruto + Number(r.honorarioBruto || 0),
  retencionImpuesto: acc.retencionImpuesto + Number(r.retencionImpuesto || 0),
  prestamo: acc.prestamo + Number(r.prestamo || 0),
  honorarioActualizado: acc.honorarioActualizado + Number(r.honorarioActualizado || 0),
  impuestoActualizado: acc.impuestoActualizado + Number(r.impuestoActualizado || 0),
  prestamoActualizado: acc.prestamoActualizado + Number(r.prestamoActualizado || 0),
  liquido: acc.liquido + Number(r.liquido || 0)
}), { honorarioBruto: 0, retencionImpuesto: 0, prestamo: 0, honorarioActualizado: 0, impuestoActualizado: 0, prestamoActualizado: 0, liquido: 0 }))

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
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Certificado de Honorarios</span>
      </div>

      <!-- Document Sheet: el scroll vive en el "papel" blanco, no en este
           contenedor oscuro. -->
      <div class="p-8 bg-slate-950 flex justify-center print-wrapper overflow-y-auto">
        <div class="printable-area shrink-0 overflow-y-auto max-h-[65vh] bg-white text-black p-8 shadow-2xl w-[210mm] font-sans text-[11px]">

          <!-- Encabezado -->
          <div class="flex justify-between items-start mb-6">
            <div class="font-bold leading-snug">
              <p>{{ empresa.Rsoc }}</p>
              <p>RUT: {{ empresa.Rut }}</p>
              <p>{{ empresa.Direccion }}<span v-if="empresa.Oficina"> {{ empresa.Oficina }}</span></p>
              <p>{{ empresa.Comuna || empresa.Ciudad }}</p>
            </div>
            <div class="text-right font-bold leading-snug">
              <p>Certificado N° {{ certificado.certificado }}</p>
              <p>{{ empresa.Ciudad || empresa.Comuna }} {{ certificado.fechaEmision }}</p>
            </div>
          </div>

          <p class="mb-4 text-justify">
            La empresa {{ empresa.Rsoc }} certifica que al Sr. <span class="font-bold">{{ certificado.nombre }}</span> Rut {{ certificado.rut }}, durante el
            año {{ certificado.agno }} se le han pagado las siguientes rentas por concepto de honorarios, y sobre las cuales se practicaron las
            siguientes retenciones de impuesto que se señalan
          </p>

          <table class="w-full border-collapse">
            <thead>
              <tr class="border-t border-b-2 border-black font-bold text-center">
                <th class="py-1 pl-1 text-left">Periodos</th>
                <th class="py-1">Honorario<br />Bruto</th>
                <th class="py-1">Retención<br />Impuesto</th>
                <th class="py-1">Prestamo<br />3%</th>
                <th class="py-1">Factor</th>
                <th class="py-1">Honorario<br />Actualizado</th>
                <th class="py-1">Impuesto<br />Actualizado</th>
                <th class="py-1">Prestamo<br />Actualizado</th>
                <th class="py-1 pr-1">Liquido</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in detalle" :key="idx" class="border-b border-gray-300 text-center">
                <td class="py-1 pl-1 text-left">{{ r.mes }}</td>
                <td class="py-1 text-right">{{ fmt(r.honorarioBruto) }}</td>
                <td class="py-1 text-right">{{ fmt(r.retencionImpuesto) }}</td>
                <td class="py-1 text-right">{{ fmt(r.prestamo) }}</td>
                <td class="py-1">{{ r.factor }}</td>
                <td class="py-1 text-right">{{ fmt(r.honorarioActualizado) }}</td>
                <td class="py-1 text-right">{{ fmt(r.impuestoActualizado) }}</td>
                <td class="py-1 text-right">{{ fmt(r.prestamoActualizado) }}</td>
                <td class="py-1 pr-1 text-right">{{ fmt(r.liquido) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-black font-bold text-center">
                <td class="py-1 pl-1 text-left">Totales</td>
                <td class="py-1 text-right">{{ fmt(totales.honorarioBruto) }}</td>
                <td class="py-1 text-right">{{ fmt(totales.retencionImpuesto) }}</td>
                <td class="py-1 text-right">{{ fmt(totales.prestamo) }}</td>
                <td class="py-1"></td>
                <td class="py-1 text-right">{{ fmt(totales.honorarioActualizado) }}</td>
                <td class="py-1 text-right">{{ fmt(totales.impuestoActualizado) }}</td>
                <td class="py-1 text-right">{{ fmt(totales.prestamoActualizado) }}</td>
                <td class="py-1 pr-1 text-right">{{ fmt(totales.liquido) }}</td>
              </tr>
            </tfoot>
          </table>

          <p class="mt-6 text-justify">
            Se extiende el presente certificado en cumplimiento de lo establecido en la Resolución Ex. N° 6509 del Servicio de Impuestos Internos,
            publicado en el Diario Oficial de fecha 20 de Diciembre de 1993, y sus modificaciones posteriores.
          </p>

          <div class="mt-16 text-center w-72 mx-auto">
            <p class="border-t border-black pt-1 font-bold">{{ empresa.RepLegal }}</p>
            <p class="font-bold">Rut: {{ empresa.RutRepLegal }}</p>
            <p class="font-bold">Representante Legal</p>
          </div>

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
