# 📊 vrcontabilidad

> **Remake moderno del sistema de contabilidad para PyMEs chilenas**, diseñado y programado originalmente en **Visual Basic 6** hace más de 30 años por **Víctor Reyes, Contador**, quien lo utilizó día a día para gestionar la contabilidad de sus clientes.

Este proyecto reconstruye dicho sistema como una **Single Page Application (SPA) moderna**, módulo por módulo, manteniendo la fidelidad funcional al original —mismos cálculos, formularios y flujo de trabajo— pero actualizando su interfaz, mejorando la usabilidad y corrigiendo inconsistencias históricas del software legado.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Frontend** | Vue 3 (`<script setup>`), Vite, Tailwind CSS |
| **Backend** | Node.js, Express, `better-sqlite3` |
| **Base de Datos** | SQLite (Arquitectura dedicada por empresa) |

---

## 🏢 Arquitectura Multi-Empresa

El sistema administra múltiples clientes de forma **completamente aislada**, replicando la lógica del software original donde cada empresa poseía su propio archivo de base de datos y plan de cuentas independiente.

- **Persistencia aislada:** Una base de datos SQLite por cada empresa/cliente.
- **Contexto dinámico:** El selector de empresa en la barra superior alterna la base de datos, el plan de cuentas y los reportes activos en tiempo real sin recargar la aplicación.

---

## 📦 Módulos del Sistema

### ⚙️ Mantenedores
* **Maestros:** Clientes, Proveedores y Plan de Cuentas.
* **Apertura:** Inicialización de Comprobantes (apertura de ejercicio contable).
* **Importadores:** Carga masiva desde el SII (Registro de Compras/Ventas) y Movimientos de Caja vía CSV.

### 🔄 Procesos Contables
* **Libros de Compras y Ventas:** Carga, procesamiento y auditoría de archivos del SII.
* **Generación de Pólizas:** Contabilización automática de Compras y Ventas con numeración correlativa por período.
* **Comprobante Diario:** Ingreso manual y edición de asientos contables.
* **Libros Contables:** Libro Diario y Libro Mayor.
* **Estados Financieros:** Balance de 8 Columnas y Estado de Resultados.
* **Consultas:** Motor de búsqueda y filtrado general.

### 👥 Remuneraciones
* Liquidaciones y Anticipos de Sueldo.
* Mantenedor completo de Trabajadores.

### 📋 Análisis y Declaraciones
* Análisis de Cuentas Corrientes (Clientes / Proveedores).
* Declaraciones Juradas (Certificados de Sueldo y Honorarios).

> 🖨️ **Fidelidad Visual:** Cada módulo incluye su propia vista previa de impresión, recreando fielmente el diseño y maquetación de los reportes originales en **Crystal Reports**.

---

## ✨ Features Destacadas

* **Importación Inteligente CSV:** Detección y autocorrección de errores comunes en los archivos del SII (inconsistencias de fechas, columnas desfasadas, codificación de caracteres `UTF-8` / `ISO-8859-1`).
* **Motor de Asientos Automáticos:** Generación de pólizas contables estandarizadas a partir de compras, ventas y caja.
* **Reportes Vectoriales:** Impresión adaptativa a pantalla y papel sin pérdida de formato.
* **Validaciones Locales:** Verificación de RUT chileno con algoritmo de dígito verificador.
* **Feedback en Tiempo Real:** Barras de progreso e indicadores de estado en tareas pesadas de procesamiento.

---

## 🚀 Mejoras sobre el Sistema Legado (VB6)

- [x] **Zero Installation:** Ejecutable desde cualquier navegador web sin requerir runtime de VB6 ni drivers ODBC.
- [x] **Diseño Responsivo:** Interfaz adaptativa que no se rompe con el nivel de zoom o la resolución de pantalla.
- [x] **Normalización de Fechas:** Corrección de formatos desalineados entre módulos que omitían registros en Libros Diarios, Mayores o Balances.
- [x] **Sanitización de Datos del SII:** Filtrado y recalculo de montos mal estructurados por la plataforma del SII.
- [x] **Prevención de Errores de Digitación:** Normalización automática de strings (case-sensitivity) en llaves secundarias para evitar descuadres silenciosos.
- [x] **Trazabilidad de Cargas:** Reporte detallado post-importación mostrando registros exitosos y errores específicos, en lugar de cierres inesperados.

---

## 👨‍💻 Créditos

**Sistema Original (Concepción, Lógica Contable y Arquitectura Base):**
* **Víctor Reyes**, Contador Público.