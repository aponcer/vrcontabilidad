// Copia este archivo como "config.local.js" (misma carpeta, sin el sufijo
// ".example") para configurar reglas específicas de la empresa que no deben
// quedar públicas en el código fuente. config.local.js está en .gitignore.

module.exports = {
  // RUT de un trabajador con una regla de Cesantía especial (heredada del
  // .frm original de Liquidación de Sueldos): en vez del Ces_trab/Ces_emp de
  // la tabla Indi, a ese trabajador se le calcula únicamente un 0.8% de
  // aporte empresa y 0% de aporte trabajador. Dejar vacío si no aplica.
  rutExcepcionCesantia: ''
}
