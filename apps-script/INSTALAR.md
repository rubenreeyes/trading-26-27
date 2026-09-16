# Instalar el puente con la hoja "Registro Trading 26-27"

El fichero `Code.gs` de esta carpeta se pega a mano en el editor de Apps Script
de la hoja. Ni el token ni la URL del script se guardan en el repositorio: se
escriben dentro de la app, en la pestaña **Ajustes**.

La hoja ya existe y ya tiene sus filas y sus fórmulas. **El script no crea
hojas ni filas**: solo escribe en las que ya están (y, si alguna vez se agotan
las filas preparadas, copia antes las fórmulas de la fila anterior).

## 1. Pegar el código

1. Abre la hoja **Registro Trading 26-27** en Google Sheets.
2. Menú **Extensiones → Apps Script**. Se abre el editor con un fichero `Código.gs`.
3. Borra todo lo que haya en ese fichero y pega el contenido completo de `Code.gs`.
4. Guarda (Ctrl/Cmd + S). Si pide nombre de proyecto, pon `Trading 26/27`.

## 2. Crear el token

1. En el editor, rueda dentada de la izquierda: **Configuración del proyecto**.
2. Baja hasta **Propiedades del script** y pulsa **Añadir propiedad del script**.
3. Propiedad: `TOKEN`. Valor: una cadena larga y aleatoria (30 o más caracteres).
   Por ejemplo, en el terminal del Mac:

   ```bash
   openssl rand -hex 24
   ```

4. **Guardar propiedades del script**. Apunta el valor: es el que pegarás en la app.

## 3. Comprobar las cabeceras

1. En el editor, en el desplegable de funciones de arriba, elige **comprobarHojas**
   y pulsa **Ejecutar**. La primera vez pedirá autorización: elige tu cuenta, y si
   sale "Google no ha verificado esta aplicación", **Configuración avanzada → Ir a
   Trading 26/27 (no seguro) → Permitir**. Es tu propio script sobre tu propia hoja.
2. El informe sale en el **Registro de ejecución**, abajo: una línea por hoja.
   Todo con `✓` es correcto. Cada `✗` dice qué cabecera esperaba, cuál hay y en
   qué columna va a buscarla. No abre ninguna ventana emergente a propósito: un
   aviso deja la ejecución esperando a que lo cierres y acaba en "Exceeded
   maximum execution time".
3. Si una cabecera está escrita de otra forma, el script la localiza igual por
   parecido, y el paréntesis con los valores permitidos (`Rev 7:30 (x)`,
   `Tipo (swing/scalping)`…) no cuenta para la comparación. Solo hay que tocar
   algo si dice que **falta** una hoja o si la columna que va a usar no es la
   correcta.

## 4. Publicar como aplicación web

1. Botón azul **Implementar → Nueva implementación**.
2. En **Seleccionar tipo** (rueda dentada), elige **Aplicación web**.
3. Descripción: la que quieras. **Ejecutar como: Yo**. **Quién tiene acceso: Cualquier usuario**.
4. **Implementar** y copia la **URL de la aplicación web**, que termina en `/exec`.

## 5. Pegarlo en la app

1. Abre la app Trading 26/27 → pestaña **Ajustes**.
2. Pega la URL en **URL del Apps Script** y el token en **Token**. Se guardan solos
   en el móvil; no van al repositorio.
3. Pulsa **Probar conexión** (hace un GET de `que=cuentas`). Debe decir
   "Conexión correcta" y cuántas cuentas tiene la hoja.
4. Si tenías cambios pendientes, se envían solos. En un móvil nuevo, usa
   **Recuperar de la hoja** o restaura una copia de seguridad.
5. Elige la **fase actual de scalping** (0-4): se escribe en `Dias!K` al marcar cada día.

## Cada vez que cambies `Code.gs`

Pegar el código nuevo no basta: hay que **Implementar → Gestionar implementaciones →
lápiz (editar) → Versión: Nueva versión → Implementar**. La URL `/exec` no cambia.
Si en su lugar creas una "Nueva implementación", la URL cambia y hay que
actualizarla en Ajustes.

## Comprobarlo desde el terminal (opcional)

```bash
curl -L "URL_EXEC?token=TU_TOKEN&que=cuentas"
```

Consultas disponibles en `que=`: `dias` (con `desde`), `operaciones`,
`candidatas` (con `semana` opcional), `cuentas`, `estado`, `notas` y `retiros`.
Acciones del POST: `dia`, `operacion`, `candidata`, `estadoSemanal`,
`backtest`, `nota`, `retiro` y `cuenta`.

Debe devolver `{"ok":true,"que":"cuentas","filas":[…]}`. Un POST de prueba que
marca la revisión de 7:30 del 14 de septiembre:

```bash
curl -L -H "Content-Type: text/plain" -d '{"token":"TU_TOKEN","accion":"dia","datos":{"fecha":"2026-09-14","rev730":true}}' "URL_EXEC"
```

## Qué hace y qué no

- **Dias**: nunca añade filas. Busca la fila por la fecha de la columna A comparada
  como texto `AAAA-MM-DD` (da igual que la celda sea fecha o texto) y escribe solo
  D-L. Si la fecha no está, responde `{"ok":false,"error":"fecha no encontrada"}` y
  la app descarta ese cambio. C y M (fórmulas) no se tocan.
- **Operaciones**: sin `id`, escribe en la primera fila con la columna B vacía y
  devuelve el `id` (= fila − 1). Con `id`, actualiza la fila `id + 1` solo con los
  campos que lleguen. A, J, Q, X e Y (fórmulas) no se tocan nunca.
- **Candidatas**, **Estado semanal** y **Backtest**: escriben en la primera fila
  libre de su hoja. En Candidatas, además, si el mensaje lleva `fila` se actualiza
  esa fila en lugar de gastar una nueva: es lo que usa la app para cambiar el
  **Estado** de una candidata ya enviada (pendiente → entrada). B y H de Candidatas
  y B de Estado semanal son fórmulas y no se tocan. En Backtest nunca se pasa de la
  fila 401, porque de la 404 en adelante hay resúmenes.
- **Cuentas** se lee y se escribe: la app da de alta cuentas nuevas (acción
  `cuenta`, una fila al final) y actualiza las existentes buscándolas por el
  nombre de la columna A. Además usa dos columnas nuevas al final, **M "Riesgo
  por defecto %"** y **N "Coste challenge ($)"**; si sus cabeceras están vacías,
  el script las escribe solo al leer o guardar cuentas.
- **Notas** y **Retiros** son las dos únicas hojas que el script crea, con sus
  cabeceras, la primera vez que escribe en ellas. Notas guarda los textos del
  domingo (A Fecha · B Tipo · C Semana, con fórmula · D Texto), una fila por
  fecha y tipo, que se actualiza en vez de duplicarse. Retiros guarda los pagos
  cobrados (A Fecha · B Cuenta · C Beneficio bruto · D Reparto % · E Neto
  cobrado · F Método · G Notas).
- **Leyenda** y **Resumen** no se tocan nunca.
- Los cuatro campos de tipo casilla del día (`rev730`, `ny1530`, `formacion`,
  `planificacion`): `true` escribe "x", `false` vacía la celda, `null` o ausente no
  la toca. El resto de campos solo se escriben si vienen en el mensaje.
- Fechas: la fecha de apertura y la de cierre de Operaciones (B y S) y la
  columna A de Candidatas, Estado semanal y Backtest se escriben como **fechas
  reales** con formato `yyyy-mm-dd`, para que las fórmulas de Semana, Mes y
  Resumen calculen sin convertir texto. "Próximo retiro" de Estado semanal
  sigue como texto `AAAA-MM-DD`. Dias!A no se escribe nunca. Al leer, la app
  recibe siempre las fechas como texto `AAAA-MM-DD`.
- La zona horaria del script (Configuración del proyecto) debe ser la misma que
  la de la hoja (Archivo → Configuración); si no, una fecha podría guardarse un
  día antes. `comprobarHojas()` lo avisa.
- Un token incorrecto responde `{"ok":false,"codigo":403,"error":"token incorrecto"}`.
  Apps Script no permite cambiar el código HTTP, por eso el 403 va dentro del JSON.
- La app envía con `Content-Type: text/plain` para evitar el preflight de CORS y
  sigue la redirección que hace Google al responder. Las escrituras van dentro de
  un `LockService`, así que dos envíos a la vez no se pisan.

## Si se agotan las filas preparadas

Operaciones, Candidatas y Estado semanal siguen funcionando: el script añade una
fila y copia en ella las fórmulas de la fila anterior. Backtest no: se para en la
401 y responde `no quedan filas libres en "Backtest"`, porque debajo están los
resúmenes.
