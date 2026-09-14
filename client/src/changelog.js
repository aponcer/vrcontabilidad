// Registro de cambios visible para el usuario final (independiente de los
// mensajes de commit de Git, que nadie fuera del equipo de desarrollo ve).
// Cada vez que se hace un cambio que vale la pena avisar, se agrega una
// entrada NUEVA arriba de todo, con una versión más alta. El modal de
// "Novedades" en App.vue muestra la entrada más nueva que el navegador
// todavía no haya visto (se recuerda en localStorage, por eso es por
// navegador/computador, no por usuario).
export const CHANGELOG = [
  {
    version: '1.1.0',
    fecha: '2026-09-14',
    cambios: [
      'El sistema ahora se actualiza solo al abrirlo -- ya no hace falta entrar por TeamViewer para traer los cambios nuevos.',
      'Nuevo aviso de "Novedades" (este mismo) para avisar qué cambió en cada actualización.'
    ]
  },
  {
    version: '1.0.0',
    fecha: '2026-09-10',
    cambios: [
      'Ferroq: nuevo módulo de Traspasos en el menú Procesos.',
      'Ferroq: nueva carga de Boletas de Venta del SII.',
      'Liquidación de Sueldos: se agregó el tipo "Adulto Mayor" (antes se calculaba mal, como Pensionado).',
      'Comprobante Diario: la Razón Social ahora se busca escribiendo parte del nombre, sin tener que saber el Rut de memoria.',
      'Carga de archivos CSV (Movimientos de Caja, Compras/Ventas SII): ahora acepta tanto "," como ";" como separador.'
    ]
  }
]
