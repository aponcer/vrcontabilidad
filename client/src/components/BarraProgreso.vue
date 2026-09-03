<script setup>
defineProps({
  mensaje: { type: String, default: '' },
  progreso: { type: Number, default: 0 }
})
</script>

<template>
  <div class="border border-slate-700/80 bg-slate-950/80 rounded p-1 min-h-9 flex flex-col justify-center relative overflow-hidden">
    <div
      class="absolute left-0 top-0 bottom-0 bg-emerald-600/30 border-r-2 border-emerald-400 transition-all duration-75"
      :style="{ width: progreso + '%' }"
    ></div>

    <div class="relative z-10 px-2 flex justify-between items-center text-xs font-mono text-slate-300">
      <span>{{ mensaje }}</span>
      <span v-if="progreso > 0" class="text-emerald-400 font-bold">{{ progreso }}%</span>
    </div>
  </div>
</template>
