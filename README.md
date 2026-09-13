# Trading 26/27

PWA personal de una sola página para llevar la rutina y el diario de trading del
curso 2026-2027, sincronizada con una hoja de Google Sheets.

- `index.html` — la app entera: sin dependencias, sin compilación. Al principio
  del `<script>` están los datos del plan (checklists, fases, reglas de riesgo)
  separados de la interfaz.
- `sw.js`, `manifest.json`, `icons/` — lo que la hace instalable y capaz de
  funcionar sin conexión.
- `apps-script/` — el puente con la hoja de cálculo y sus instrucciones de
  instalación.

## Pestañas

**Hoy** (revisión de 7:30, sesión de Nueva York de 15:30, formación,
planificación del domingo, reglas cumplidas, freno y nota del día) ·
**Operaciones** (abiertas con Gestionar y Cerrar, cerradas en R, formulario de
entrada con la checklist, avisos de posiciones y de riesgo abierto por cuenta) ·
**Candidatas** (lista del domingo por semana, convertir en operación, estado
semanal por cuenta) · **Plan** (fases de scalping, backtest y referencia) ·
**Ajustes**.

## Puesta en marcha

1. Sirve la carpeta en cualquier sitio con HTTPS (aquí, GitHub Pages) y abre la
   página en el móvil.
2. Monta el puente con la hoja siguiendo [apps-script/INSTALAR.md](apps-script/INSTALAR.md).
3. En **Ajustes**, pega la URL del Apps Script y el token.

La URL y el token se guardan solo en el navegador del móvil: nunca están en este
repositorio. El plan de trabajo (`PLAN.md`) y la hoja de cálculo tampoco: son
privados y viven fuera de aquí.

## Sin conexión

Todo se guarda en `localStorage` y los cambios pendientes esperan en una cola
hasta que hay internet. La app funciona igual sin el script configurado.
