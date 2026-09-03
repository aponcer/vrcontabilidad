<script setup>
const props = defineProps({
  show: Boolean,
  certificados: { type: Array, default: () => [] },
  empresa: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close'])

const fmt = (val) => {
  if (!val && val !== 0) return '0'
  return new Intl.NumberFormat('es-CL').format(Math.round(val))
}

const totalesDe = (detalle) => detalle.reduce((acc, r) => ({
  sueldoBruto: acc.sueldoBruto + Number(r.sueldoBruto || 0),
  leyesSociales: acc.leyesSociales + Number(r.leyesSociales || 0),
  haberesTributables: acc.haberesTributables + Number(r.haberesTributables || 0),
  impuestoUnico: acc.impuestoUnico + Number(r.impuestoUnico || 0),
  haberesActualizados: acc.haberesActualizados + Number(r.haberesActualizados || 0),
  impuestoActualizado: acc.impuestoActualizado + Number(r.impuestoActualizado || 0)
}), { sueldoBruto: 0, leyesSociales: 0, haberesTributables: 0, impuestoUnico: 0, haberesActualizados: 0, impuestoActualizado: 0 })

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
        <span class="text-xs text-slate-400 font-mono">Vista Previa - Certificados de Sueldo ({{ certificados.length }})</span>
      </div>

      <!-- Document Sheet: un certificado por trabajador, cada uno en su propia página -->
      <div class="flex-1 overflow-y-auto p-8 bg-slate-950 flex flex-col items-center gap-8 print-wrapper">
        <div
          v-for="(cert, ci) in certificados"
          :key="ci"
          class="printable-area certificado-pagina shrink-0 bg-white text-black p-8 shadow-2xl w-[210mm] font-sans text-[11px]"
        >

          <!-- Encabezado -->
          <div class="flex justify-between items-start mb-6">
            <div class="font-bold leading-snug">
              <p>{{ empresa.Rsoc }}</p>
              <p>RUT: {{ empresa.Rut }}</p>
              <p>{{ empresa.Direccion }}<span v-if="empresa.Oficina"> {{ empresa.Oficina }}</span> - {{ empresa.Comuna || empresa.Ciudad }}</p>
              <p v-if="empresa.Giro">Giro: {{ empresa.Giro }}</p>
            </div>
            <div class="text-right font-bold leading-snug">
              <p>Certificado N° {{ cert.certificado }}</p>
              <p>{{ empresa.Ciudad || empresa.Comuna }} {{ cert.fechaEmision }}</p>
            </div>
          </div>

          <p class="mb-4 text-justify">
            El Empleador {{ empresa.Rsoc }} certifica que al Sr.<span class="font-bold">{{ cert.nombre }}</span> RUT {{ cert.rut }} en su
            calidad de empleado dependiente, durante el año {{ cert.agno }}, se le han pagado las rentas que se indican, y sobre las cuales se le
            practicaron las retenciones de impuestos que se señalan:
          </p>

          <table class="w-full border-collapse">
            <thead>
              <tr class="border-t border-b-2 border-black font-bold text-center">
                <th class="py-1 pl-1 text-left">Mes</th>
                <th class="py-1">Sueldo<br />Bruto</th>
                <th class="py-1">Leyes<br />Sociales</th>
                <th class="py-1">Haberes<br />Tributables</th>
                <th class="py-1">Impuesto<br />Unico</th>
                <th class="py-1">Factor</th>
                <th class="py-1">Haberes<br />Actualizados</th>
                <th class="py-1 pr-1">Impuesto<br />Actualizado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, idx) in cert.detalle" :key="idx" class="border-b border-gray-300 text-center">
                <td class="py-1 pl-1 text-left">{{ r.mes }}</td>
                <td class="py-1 text-right">{{ fmt(r.sueldoBruto) }}</td>
                <td class="py-1 text-right">{{ fmt(r.leyesSociales) }}</td>
                <td class="py-1 text-right">{{ fmt(r.haberesTributables) }}</td>
                <td class="py-1 text-right">{{ fmt(r.impuestoUnico) }}</td>
                <td class="py-1">{{ r.factor }}</td>
                <td class="py-1 text-right">{{ fmt(r.haberesActualizados) }}</td>
                <td class="py-1 pr-1 text-right">{{ fmt(r.impuestoActualizado) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr class="border-t-2 border-black font-bold text-center">
                <td class="py-1 pl-1 text-left">Totales</td>
                <td class="py-1 text-right">{{ fmt(totalesDe(cert.detalle).sueldoBruto) }}</td>
                <td class="py-1 text-right">{{ fmt(totalesDe(cert.detalle).leyesSociales) }}</td>
                <td class="py-1 text-right">{{ fmt(totalesDe(cert.detalle).haberesTributables) }}</td>
                <td class="py-1 text-right">{{ fmt(totalesDe(cert.detalle).impuestoUnico) }}</td>
                <td class="py-1"></td>
                <td class="py-1 text-right">{{ fmt(totalesDe(cert.detalle).haberesActualizados) }}</td>
                <td class="py-1 pr-1 text-right">{{ fmt(totalesDe(cert.detalle).impuestoActualizado) }}</td>
              </tr>
            </tfoot>
          </table>

          <p class="mt-6 text-justify">
            Se extiende el presente certificado en cumplimiento de la normativa vigente.
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
  .certificado-pagina {
    break-after: page;
  }
  .certificado-pagina:last-child {
    break-after: auto;
  }
}
</style>
