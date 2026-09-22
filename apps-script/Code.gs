/**
 * Trading 26/27 · puente entre la app y la hoja "Registro Trading 26-27".
 *
 * La hoja YA EXISTE y ya tiene sus filas y sus fórmulas. Este script no crea
 * hojas ni filas nuevas salvo cuando se agotan las filas preparadas, y en ese
 * caso copia antes las fórmulas de la fila anterior. Las dos únicas hojas que
 * este script crea son "Notas" y "Retiros", si no existen.
 *
 * Hojas que toca:
 *   Dias            una fila por día del curso (14-09-2026 a 31-07-2027). Solo D-L.
 *   Operaciones     400 filas preparadas; A, J, Q, X, Y son fórmulas.
 *   Candidatas      400 filas preparadas; B y H son fórmulas.
 *   Estado semanal  300 filas preparadas; B es fórmula.
 *   Backtest        filas 2-401 (de la 404 en adelante hay resúmenes).
 *   Cuentas         se lee y se escribe (alta, edición y columnas M y N).
 *   Notas           textos del domingo; se crea con cabeceras si no existe.
 *   Retiros         pagos cobrados; se crea con cabeceras si no existe.
 *   Leyenda y Resumen no se tocan nunca.
 *
 * Fechas: Operaciones B y S, Candidatas A, Estado semanal A y Backtest A se
 * escriben como fechas reales (Date) con formato yyyy-mm-dd, para que las
 * fórmulas de la hoja (Semana, Mes, Resumen) no dependan de convertir texto.
 * Dias!A nunca se escribe, solo se busca. Al leer, toda fecha se devuelve
 * como texto AAAA-MM-DD.
 *
 * Cada columna se localiza por el TEXTO de su cabecera (fila 1) y, si no
 * aparece, por la letra de respaldo. Ejecuta comprobarHojas() para ver si
 * alguna cabecera no coincide.
 *
 * El token NO va aquí: Configuración del proyecto → Propiedades del script →
 * clave TOKEN. Ver INSTALAR.md.
 *
 * Nota: una aplicación web de Apps Script siempre responde HTTP 200 con
 * ContentService, así que el "403" va dentro del JSON: {ok:false, codigo:403}.
 */

// --- Definición de las hojas -------------------------------------------------
// [clave interna, texto de la cabecera, letra de respaldo]
var HOJAS = {
  dias: {
    nombre: 'Dias',
    formulas: ['semana', 'mes'],   // fórmulas: no se escriben nunca
    cols: [
      ['fecha', 'Fecha', 'A'], ['dia', 'Día', 'B'], ['semana', 'Semana', 'C'],
      ['rev730', 'Rev 7:30 (x)', 'D'], ['ny1530', 'NY 15:30 (x)', 'E'], ['formacion', 'Formación (x)', 'F'],
      ['planificacion', 'Planif. domingo (x)', 'G'], ['reglas', 'Reglas cumplidas (sí/no)', 'H'],
      ['reglaIncumplida', 'Regla incumplida', 'I'], ['freno', 'Freno (diario/semanal)', 'J'],
      ['fase', 'Fase scalping (0-4)', 'K'], ['notas', 'Notas', 'L'], ['mes', 'Mes', 'M']
    ]
  },
  operaciones: {
    nombre: 'Operaciones',
    formulas: ['id', 'ratio', 'checklist', 'semana', 'mes'],   // A, J, Q, X, Y
    preparadas: 401,               // última fila con fórmulas ya escritas
    claveLibre: 'fechaApertura',   // fila libre = la primera con esta columna (B) vacía
    cols: [
      ['id', 'ID', 'A'], ['fechaApertura', 'Fecha apertura', 'B'], ['tipo', 'Tipo (swing/scalping)', 'C'],
      ['activo', 'Activo', 'D'], ['direccion', 'Dirección (largo/corto)', 'E'], ['cuentas', 'Cuentas', 'F'],
      ['entrada', 'Entrada', 'G'], ['stop', 'Stop', 'H'], ['tp1', 'TP1', 'I'],
      ['ratio', 'Ratio TP1', 'J'], ['riesgo', 'Riesgo %', 'K'],
      ['c1', 'C1 fin de ciclo', 'L'], ['c2', 'C2 zona repetida', 'M'], ['c3', 'C3 gatillo', 'N'],
      ['c4', 'C4 contexto', 'O'], ['c5', 'C5 ratio ≥1:3', 'P'], ['checklist', 'Checklist OK', 'Q'],
      ['gestion', 'Gestión (parciales, BE, cierres)', 'R'], ['fechaCierre', 'Fecha cierre', 'S'],
      ['resultadoR', 'Resultado (R)', 'T'], ['dentroReglas', 'Dentro de reglas (sí/no)', 'U'],
      ['motivo', 'Motivo si no', 'V'], ['aprendizaje', 'Aprendizaje', 'W'],
      ['semana', 'Semana', 'X'], ['mes', 'Mes', 'Y']
    ]
  },
  candidatas: {
    nombre: 'Candidatas',
    formulas: ['semana', 'ratio'],                             // B y H
    preparadas: 401,
    claveLibre: 'fecha',
    cols: [
      ['fecha', 'Fecha (domingo)', 'A'], ['semana', 'Semana', 'B'], ['activo', 'Activo', 'C'],
      ['direccion', 'Dirección', 'D'], ['zona', 'Zona de entrada', 'E'], ['stop', 'Stop', 'F'],
      ['tp1', 'TP1', 'G'], ['ratio', 'Ratio', 'H'], ['estado', 'Estado', 'I'], ['notas', 'Notas', 'J']
    ]
  },
  cuentas: {
    nombre: 'Cuentas',
    formulas: [],
    cols: [
      ['cuenta', 'Cuenta', 'A'], ['firma', 'Firma', 'B'], ['producto', 'Producto', 'C'],
      ['balance', 'Balance inicial ($)', 'D'], ['fase', 'Fase (challenge/earning)', 'E'],
      ['perdidaDiaria', 'Pérdida diaria ($)', 'F'], ['perdidaMaxima', 'Pérdida máxima ($)', 'G'],
      ['objetivo', 'Objetivo ($)', 'H'], ['fechaLimite', 'Fecha límite', 'I'],
      ['estado', 'Estado', 'J'], ['uso', 'Uso (swing/scalping)', 'K'], ['notas', 'Notas', 'L'],
      ['riesgoDefecto', 'Riesgo por defecto %', 'M'], ['costeChallenge', 'Coste challenge ($)', 'N']
    ],
    claveLibre: 'cuenta',
    nuevasCabeceras: ['riesgoDefecto', 'costeChallenge']   // se escriben en la fila 1 si faltan
  },
  estado: {
    nombre: 'Estado semanal',
    formulas: ['semana'],                                      // B
    preparadas: 301,
    claveLibre: 'fecha',
    cols: [
      ['fecha', 'Fecha (domingo)', 'A'], ['semana', 'Semana', 'B'], ['cuenta', 'Cuenta', 'C'],
      ['balance', 'Balance', 'D'], ['drawdown', 'Drawdown usado (%)', 'E'],
      ['diasRentables', 'Días rentables', 'F'], ['proximoRetiro', 'Próximo retiro', 'G'],
      ['progreso', 'Progreso objetivo (%)', 'H'], ['notas', 'Notas', 'I']
    ]
  },
  notas: {
    nombre: 'Notas',
    crear: true,                   // esta hoja y Retiros son las únicas que el script crea
    formulas: ['semana'],
    claveLibre: 'fecha',
    formulaSemana: 'semana',       // se escribe al añadir la fila, no se copia de la anterior
    cols: [
      ['fecha', 'Fecha', 'A'], ['tipo', 'Tipo (revision/calendario/mensual/expansion/libre)', 'B'],
      ['semana', 'Semana', 'C'], ['texto', 'Texto', 'D']
    ]
  },
  retiros: {
    nombre: 'Retiros',
    crear: true,
    formulas: [],
    claveLibre: 'fecha',
    cols: [
      ['fecha', 'Fecha', 'A'], ['cuenta', 'Cuenta', 'B'], ['bruto', 'Beneficio bruto ($)', 'C'],
      ['reparto', 'Reparto %', 'D'], ['neto', 'Neto cobrado ($)', 'E'], ['metodo', 'Método', 'F'], ['notas', 'Notas', 'G']
    ]
  },
  backtest: {
    nombre: 'Backtest',
    formulas: [],
    preparadas: 401,               // de la 404 en adelante hay resúmenes: nunca se pasa de aquí
    tope: true,
    claveLibre: 'fecha',
    cols: [
      ['fecha', 'Fecha del caso', 'A'], ['estrategia', 'Estrategia (swing/scalping)', 'B'], ['activo', 'Activo', 'C'],
      ['direccion', 'Dirección', 'D'], ['checklist', 'Checklist OK (sí/no)', 'E'],
      ['resultadoR', 'Resultado (R)', 'F'], ['notas', 'Notas', 'G']
    ]
  }
};

// Columnas de fecha que se escriben como fecha real (Date) con formato yyyy-mm-dd.
// La clave 'fecha' es la columna A de Candidatas, Estado semanal y Backtest
// (en Dias también se llama así, pero Dias!A nunca se escribe), más la fecha
// límite de Cuentas y el próximo retiro de Estado semanal.
var COLS_FECHA_REAL = ['fecha', 'fechaApertura', 'fechaCierre', 'fechaLimite', 'proximoRetiro'];
// Ninguna columna de fecha se escribe ya como texto; al leer, todas se normalizan.
var COLS_FECHA_TEXTO = [];
// Al leer, todas se normalizan a texto AAAA-MM-DD.
var COLS_FECHA = COLS_FECHA_REAL.concat(COLS_FECHA_TEXTO);
var FORMATO_FECHA = 'yyyy-mm-dd';

// --- Utilidades --------------------------------------------------------------
function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function tokenValido(t) {
  var esperado = PropertiesService.getScriptProperties().getProperty('TOKEN');
  return !!esperado && !!t && String(t) === esperado;
}

function definido(v) { return v !== undefined && v !== null; }
function texto(v) { return String(v == null ? '' : v).trim(); }
function esX(v) { return texto(v).toLowerCase() === 'x'; }
function esFecha(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }

// Quita el paréntesis final de una cabecera: "Rev 7:30 (x)" → "rev 7:30".
// Así da igual que la hoja lleve o no la chuleta de valores permitidos.
function base(s) { return normaliza(s).replace(/\s*\([^()]*\)\s*$/, ''); }

function normaliza(s) {
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // sin tildes
    .replace(/\s+/g, ' ').trim();
}

function letraACol(l) {
  var n = 0;
  for (var i = 0; i < l.length; i++) n = n * 26 + (l.toUpperCase().charCodeAt(i) - 64);
  return n;
}

function colALetra(n) {
  var s = '';
  while (n > 0) { var r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; }
  return s;
}

// Zona horaria de la hoja (con la del script como respaldo). Se usa al leer
// fechas para que el día sea el que se ve en la celda.
var zonaCache_ = null;
function zonaHoja() {
  if (!zonaCache_) {
    try { zonaCache_ = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); } catch (err) { zonaCache_ = null; }
    if (!zonaCache_) zonaCache_ = Session.getScriptTimeZone();
  }
  return zonaCache_;
}

// La celda de fecha, como texto AAAA-MM-DD, valga como Date o como texto.
function fechaTexto(v) {
  // Duck typing en vez de "instanceof Date": vale para cualquier Date venga de donde venga.
  if (v && typeof v.getTime === 'function') return Utilities.formatDate(v, zonaHoja(), 'yyyy-MM-dd');
  var s = texto(v);
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);            // por si alguna celda quedó como 14/09/2026
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function hojaDe(def) {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName(def.nombre);
  if (!sh) {
    if (!def.crear) throw new Error('falta la hoja "' + def.nombre + '"');
    sh = ss.insertSheet(def.nombre);
    sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols.map(function (c) { return c[1]; })]);
    sh.setFrozenRows(1);
  }
  return sh;
}

// Columnas añadidas después (Cuentas M y N): si la cabecera está vacía, se escribe.
function asegurarCabeceras(sh, def, cols) {
  (def.nuevasCabeceras || []).forEach(function (clave) {
    var c = cols[clave], celda = sh.getRange(1, c);
    if (texto(celda.getValue()) === '') {
      var def1 = def.cols.filter(function (x) { return x[0] === clave; })[0];
      celda.setValue(def1[1]);
    }
  });
}

/**
 * Mapa clave → número de columna. Primero cabeceras idénticas, después las que
 * empiezan igual o contienen el texto, y por último la letra de respaldo.
 */
function columnas(sh, def) {
  var ancho = Math.max(sh.getLastColumn(), def.cols.length);
  var cab = ancho > 0 ? sh.getRange(1, 1, 1, ancho).getValues()[0].map(normaliza) : [];
  var base1 = cab.map(base);
  var out = {}, usadas = {}, pendientes = [];
  def.cols.forEach(function (c) {
    var i = cab.indexOf(normaliza(c[1]));
    if (i < 0 || usadas[i]) i = base1.indexOf(base(c[1]));   // igual salvo el paréntesis
    if (i >= 0 && !usadas[i]) { out[c[0]] = i + 1; usadas[i] = true; } else pendientes.push(c);
  });
  pendientes.forEach(function (c) {
    var t = normaliza(c[1]), i = -1, j;
    for (j = 0; j < cab.length; j++) if (!usadas[j] && cab[j] && (cab[j].indexOf(t) === 0 || t.indexOf(cab[j]) === 0)) { i = j; break; }
    if (i < 0) for (j = 0; j < cab.length; j++) if (!usadas[j] && cab[j] && cab[j].indexOf(t) >= 0) { i = j; break; }
    if (i >= 0) { out[c[0]] = i + 1; usadas[i] = true; } else out[c[0]] = letraACol(c[2]);
  });
  return out;
}

function esFormula(def, clave) {
  return (def.formulas || []).indexOf(clave) >= 0;
}

// Texto AAAA-MM-DD (o fecha) → Date real a medianoche; null si no es una fecha válida.
function fechaReal(v) {
  var m = fechaTexto(v).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.getMonth() === Number(m[2]) - 1 && d.getDate() === Number(m[3]) ? d : null;   // descarta 2026-02-30
}

// Escribe respetando el tipo: fechas reales con formato yyyy-mm-dd, o texto AAAA-MM-DD.
function escribir(sh, fila, col, clave, valor) {
  var r = sh.getRange(fila, col);
  if (COLS_FECHA_REAL.indexOf(clave) >= 0) {
    if (fechaTexto(valor) === '') { r.clearContent(); return; }
    var d = fechaReal(valor);
    if (!d) throw new Error('fecha inválida (AAAA-MM-DD): ' + valor);
    r.setValue(d);
    r.setNumberFormat(FORMATO_FECHA);
    return;
  }
  if (COLS_FECHA_TEXTO.indexOf(clave) >= 0) {
    var f = fechaTexto(valor);
    if (f === '') { r.clearContent(); return; }
    r.setNumberFormat('@');
    r.setValue(f);
    return;
  }
  if (valor === '') { r.clearContent(); return; }
  r.setValue(valor);
}

// Primera fila cuya columna clave está vacía. Si no queda ninguna, la siguiente
// a la última preparada, copiando antes las fórmulas de la fila de arriba.
function filaLibre(sh, def, cols) {
  var col = cols[def.claveLibre];
  // Con tope (Backtest) no se mira más allá de la última fila preparada:
  // de la 404 en adelante hay resúmenes y ahí no se escribe nunca.
  var hasta = def.tope ? def.preparadas : Math.max(def.preparadas || 0, sh.getLastRow());
  if (hasta >= 2) {
    var v = sh.getRange(2, col, hasta - 1, 1).getValues();
    for (var i = 0; i < v.length; i++) if (texto(v[i][0]) === '') return 2 + i;
  }
  if (def.tope) throw new Error('no quedan filas libres en "' + def.nombre + '" (hasta la ' + def.preparadas + ')');
  var nueva = Math.max(hasta, 1) + 1;
  if (def.formulaSemana) escribirFormulaSemana(sh, def, cols, nueva);
  else (def.formulas || []).forEach(function (clave) {
    var c = cols[clave];
    sh.getRange(nueva - 1, c).copyTo(sh.getRange(nueva, c));   // arrastra la fórmula a la fila nueva
  });
  return nueva;
}

// Semana de una hoja creada por el script (el domingo cuenta como semana siguiente,
// igual que en Candidatas). setFormula espera la sintaxis en inglés; la hoja la muestra traducida.
function escribirFormulaSemana(sh, def, cols, fila) {
  var a = colALetra(cols[def.cols[0][0]]) + fila;
  sh.getRange(fila, cols[def.formulaSemana])
    .setFormula('=IF(' + a + '="","","S"&(INT((' + a + '-DATE(2026,9,14)+1)/7)+1))');
}

// Escribe en una fila los campos que vengan definidos, saltándose las fórmulas.
// Las fechas se validan antes de escribir nada, para no dejar filas a medias.
function validarFechas(def, datos) {
  def.cols.forEach(function (c) {
    var v = datos[c[0]];
    if (COLS_FECHA_REAL.indexOf(c[0]) >= 0 && definido(v) && fechaTexto(v) !== '' && !fechaReal(v)) {
      throw new Error('fecha inválida (AAAA-MM-DD): ' + v);
    }
  });
}
function escribirFila(sh, def, cols, fila, datos) {
  validarFechas(def, datos);
  def.cols.forEach(function (c) {
    var clave = c[0];
    if (!definido(datos[clave])) return;
    if (esFormula(def, clave)) return;
    var v = datos[clave];
    if (v === true) v = 'x';
    else if (v === false) v = '';
    else if (Array.isArray(v)) v = v.join(', ');
    escribir(sh, fila, cols[clave], clave, v);
  });
}

function conBloqueo(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (err) { return responder({ ok: false, error: 'la hoja está ocupada, reintenta' }); }
  try { return fn(); } finally { lock.releaseLock(); }
}

// --- Escrituras --------------------------------------------------------------
/**
 * datos = {fecha, rev730, ny1530, formacion, planificacion, reglas,
 *          reglaIncumplida, freno, fase, notas}
 * Los cuatro booleanos: true → "x", false → celda vacía, null/ausente → no se toca.
 * Nunca se añaden filas: si la fecha no está, responde "fecha no encontrada".
 */
function guardarDia(d) {
  var def = HOJAS.dias, sh = hojaDe(def), cols = columnas(sh, def);
  var fecha = fechaTexto(d.fecha);
  if (!esFecha(fecha)) return responder({ ok: false, error: 'fecha inválida (AAAA-MM-DD)' });

  var n = sh.getLastRow();
  var fila = -1;
  if (n >= 2) {
    var col = sh.getRange(2, cols.fecha, n - 1, 1).getValues();
    for (var i = 0; i < col.length; i++) if (fechaTexto(col[i][0]) === fecha) { fila = i + 2; break; }
  }
  if (fila < 0) return responder({ ok: false, error: 'fecha no encontrada' });

  ['rev730', 'ny1530', 'formacion', 'planificacion'].forEach(function (k) {
    if (d[k] === true) sh.getRange(fila, cols[k]).setValue('x');
    else if (d[k] === false) sh.getRange(fila, cols[k]).clearContent();
  });
  ['reglas', 'reglaIncumplida', 'freno', 'notas'].forEach(function (k) {
    if (definido(d[k])) escribir(sh, fila, cols[k], k, texto(d[k]));
  });
  if (definido(d.fase) && texto(d.fase) !== '') {
    var f = Number(d.fase);
    escribir(sh, fila, cols.fase, 'fase', isNaN(f) ? texto(d.fase) : f);
  }
  return responder({ ok: true, fila: fila });
}

/**
 * datos de una operación. Sin id se escribe en la primera fila con B vacía;
 * con id se actualiza la fila id+1 solo con los campos que vengan.
 * A, J, Q, X e Y (fórmulas) no se tocan nunca.
 */
function guardarOperacion(d) {
  var def = HOJAS.operaciones, sh = hojaDe(def), cols = columnas(sh, def);
  var fila, nueva = false;
  if (definido(d.id) && texto(d.id) !== '') {
    fila = Number(d.id) + 1;
    if (!(fila >= 2)) return responder({ ok: false, error: 'id inválido' });
    if (fila > Math.max(def.preparadas, sh.getLastRow())) return responder({ ok: false, error: 'id fuera de la hoja' });
  } else {
    if (!definido(d.fechaApertura) || fechaTexto(d.fechaApertura) === '') {
      return responder({ ok: false, error: 'falta la fecha de apertura' });
    }
    validarFechas(def, d);
    fila = filaLibre(sh, def, cols);
    nueva = true;
  }
  escribirFila(sh, def, cols, fila, d);
  return responder({ ok: true, id: fila - 1, fila: fila, nueva: nueva });
}

// Candidata: sin fila, primera libre (columna A vacía); con fila, actualiza esa.
function guardarCandidata(d) {
  var def = HOJAS.candidatas, sh = hojaDe(def), cols = columnas(sh, def);
  var fila;
  if (definido(d.fila) && Number(d.fila) >= 2) {
    fila = Number(d.fila);
    if (fila > Math.max(def.preparadas, sh.getLastRow())) return responder({ ok: false, error: 'fila fuera de la hoja' });
  } else {
    if (fechaTexto(d.fecha) === '') return responder({ ok: false, error: 'falta la fecha' });
    fila = filaLibre(sh, def, cols);
  }
  escribirFila(sh, def, cols, fila, d);
  return responder({ ok: true, fila: fila });
}

function guardarEstadoSemanal(d) {
  var def = HOJAS.estado, sh = hojaDe(def), cols = columnas(sh, def);
  if (fechaTexto(d.fecha) === '') return responder({ ok: false, error: 'falta la fecha' });
  var fila = filaLibre(sh, def, cols);
  escribirFila(sh, def, cols, fila, d);
  return responder({ ok: true, fila: fila });
}

function guardarBacktest(d) {
  var def = HOJAS.backtest, sh = hojaDe(def), cols = columnas(sh, def);
  if (fechaTexto(d.fecha) === '') return responder({ ok: false, error: 'falta la fecha' });
  var fila = filaLibre(sh, def, cols);
  escribirFila(sh, def, cols, fila, d);
  return responder({ ok: true, fila: fila });
}

// Busca una fila por el valor de una columna (texto normalizado). -1 si no está.
function buscarFila(sh, cols, clave, valor) {
  var n = sh.getLastRow();
  if (n < 2) return -1;
  var v = sh.getRange(2, cols[clave], n - 1, 1).getValues(), buscado = normaliza(valor);
  for (var i = 0; i < v.length; i++) if (normaliza(v[i][0]) === buscado && buscado !== '') return i + 2;
  return -1;
}

/**
 * Nota del domingo: una fila por fecha y tipo. Si ya existe esa pareja se
 * actualiza el texto; si no, se añade al final y se le escribe la fórmula de Semana.
 */
function guardarNota(d) {
  var def = HOJAS.notas, sh = hojaDe(def), cols = columnas(sh, def);
  var fecha = fechaTexto(d.fecha), tipo = texto(d.tipo);
  if (!esFecha(fecha)) return responder({ ok: false, error: 'fecha inválida (AAAA-MM-DD)' });
  if (!tipo) return responder({ ok: false, error: 'falta el tipo de nota' });
  var n = sh.getLastRow(), fila = -1;
  if (n >= 2) {
    var v = sh.getRange(2, 1, n - 1, Math.max(cols.fecha, cols.tipo)).getValues();
    for (var i = 0; i < v.length; i++) {
      if (fechaTexto(v[i][cols.fecha - 1]) === fecha && normaliza(v[i][cols.tipo - 1]) === normaliza(tipo)) { fila = i + 2; break; }
    }
  }
  var nueva = fila < 0;
  if (nueva) {
    fila = filaLibre(sh, def, cols);
    escribirFila(sh, def, cols, fila, { fecha: fecha, tipo: tipo, texto: texto(d.texto) });
    escribirFormulaSemana(sh, def, cols, fila);
  } else {
    escribirFila(sh, def, cols, fila, { texto: texto(d.texto) });
  }
  return responder({ ok: true, fila: fila, nueva: nueva });
}

/** Retiro cobrado: siempre una fila nueva. */
function guardarRetiro(d) {
  var def = HOJAS.retiros, sh = hojaDe(def), cols = columnas(sh, def);
  if (fechaTexto(d.fecha) === '') return responder({ ok: false, error: 'falta la fecha' });
  var fila = filaLibre(sh, def, cols);
  escribirFila(sh, def, cols, fila, d);
  return responder({ ok: true, fila: fila });
}

/**
 * Alta o edición de una cuenta. Se localiza por el nombre (columna A); si no
 * existe, se añade al final. No se borran filas nunca.
 */
function guardarCuenta(d) {
  var def = HOJAS.cuentas, sh = hojaDe(def), cols = columnas(sh, def);
  asegurarCabeceras(sh, def, cols);
  var nombre = texto(d.cuenta);
  if (!nombre) return responder({ ok: false, error: 'falta el nombre de la cuenta' });
  var fila = buscarFila(sh, cols, 'cuenta', nombre), nueva = false;
  if (fila < 0) { fila = filaLibre(sh, def, cols); nueva = true; }
  escribirFila(sh, def, cols, fila, d);
  return responder({ ok: true, fila: fila, nueva: nueva, cuenta: nombre });
}

// --- Lecturas ----------------------------------------------------------------
// Devuelve las filas con datos de una hoja, como objetos {clave: valor}.
function leerHoja(def, filtro) {
  var sh = hojaDe(def), cols = columnas(sh, def);
  var n = sh.getLastRow(), out = [];
  if (n < 2) return out;
  var ancho = sh.getLastColumn();
  var v = sh.getRange(2, 1, n - 1, ancho).getValues();
  for (var i = 0; i < v.length; i++) {
    var o = { fila: i + 2 };
    def.cols.forEach(function (c) {
      var col = cols[c[0]];
      var val = col <= ancho ? v[i][col - 1] : '';
      o[c[0]] = COLS_FECHA.indexOf(c[0]) >= 0 ? fechaTexto(val) : val;
    });
    if (!filtro || filtro(o)) out.push(o);
  }
  return out;
}

/**
 * GET ?token=…&que=dias|operaciones|candidatas|cuentas|estado
 *   dias        acepta &desde=AAAA-MM-DD
 *   candidatas  acepta &semana=N
 */
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (!tokenValido(p.token)) return responder({ ok: false, codigo: 403, error: 'token incorrecto' });
  var que = texto(p.que) || 'cuentas';
  try {
    var filas;
    if (que === 'dias') {
      var desde = fechaTexto(p.desde || '');
      if (!esFecha(desde)) return responder({ ok: false, error: 'parámetro desde inválido (AAAA-MM-DD)' });
      filas = leerHoja(HOJAS.dias, function (o) {
        if (!esFecha(o.fecha) || o.fecha < desde) return false;
        return !!(esX(o.rev730) || esX(o.ny1530) || esX(o.formacion) || esX(o.planificacion) ||
                  texto(o.reglas) || texto(o.reglaIncumplida) || texto(o.freno) ||
                  texto(o.fase) !== '' || texto(o.notas));
      }).map(function (o) {
        return {
          fecha: o.fecha, rev730: esX(o.rev730), ny1530: esX(o.ny1530), formacion: esX(o.formacion),
          planificacion: esX(o.planificacion), reglas: texto(o.reglas), reglaIncumplida: texto(o.reglaIncumplida),
          freno: texto(o.freno), fase: texto(o.fase), notas: texto(o.notas)
        };
      });
    } else if (que === 'operaciones') {
      filas = leerHoja(HOJAS.operaciones, function (o) { return texto(o.fechaApertura) !== ''; })
        .map(function (o) {
          o.id = o.fila - 1;
          ['c1', 'c2', 'c3', 'c4', 'c5'].forEach(function (k) { o[k] = esX(o[k]); });
          return o;
        });
    } else if (que === 'candidatas') {
      var sem = texto(p.semana);
      filas = leerHoja(HOJAS.candidatas, function (o) {
        if (texto(o.fecha) === '') return false;
        return sem === '' || texto(o.semana) === sem;
      });
    } else if (que === 'cuentas') {
      var shC = hojaDe(HOJAS.cuentas);
      asegurarCabeceras(shC, HOJAS.cuentas, columnas(shC, HOJAS.cuentas));
      filas = leerHoja(HOJAS.cuentas, function (o) { return texto(o.cuenta) !== ''; });
    } else if (que === 'notas') {
      filas = leerHoja(HOJAS.notas, function (o) { return texto(o.fecha) !== ''; });
    } else if (que === 'retiros') {
      filas = leerHoja(HOJAS.retiros, function (o) { return texto(o.fecha) !== ''; });
    } else if (que === 'estado') {
      filas = leerHoja(HOJAS.estado, function (o) { return texto(o.fecha) !== ''; });
    } else {
      return responder({ ok: false, error: 'parámetro que desconocido: ' + que });
    }
    return responder({ ok: true, que: que, filas: filas });
  } catch (err) {
    return responder({ ok: false, error: (err && err.message) || String(err) });
  }
}

/** POST con cuerpo JSON { token, accion, datos }. */
function doPost(e) {
  var d;
  try { d = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (err) { return responder({ ok: false, error: 'JSON inválido' }); }
  if (!tokenValido(d.token)) return responder({ ok: false, codigo: 403, error: 'token incorrecto' });

  var accion = texto(d.accion), datos = d.datos || {};
  var fns = {
    dia: guardarDia, operacion: guardarOperacion, candidata: guardarCandidata,
    estadoSemanal: guardarEstadoSemanal, backtest: guardarBacktest,
    nota: guardarNota, retiro: guardarRetiro, cuenta: guardarCuenta
  };
  if (!fns[accion]) return responder({ ok: false, error: 'acción desconocida: ' + (accion || '(vacía)') });

  return conBloqueo(function () {
    try { return fns[accion](datos); }
    catch (err) { return responder({ ok: false, error: (err && err.message) || String(err) }); }
  });
}

// --- Comprobación ------------------------------------------------------------
/**
 * Compara las cabeceras de la hoja con las que espera el script y avisa de
 * cualquier diferencia. Ejecútala una vez después de pegar el código:
 * el resultado sale en el registro de ejecución (Ver → Registros).
 */
function comprobarHojas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var lineas = ['Comprobación de "' + ss.getName() + '"'];
  var problemas = 0;

  Object.keys(HOJAS).forEach(function (k) {
    var def = HOJAS[k];
    var sh = ss.getSheetByName(def.nombre);
    if (!sh) {
      if (def.crear) lineas.push('· la hoja "' + def.nombre + '" todavía no existe: el script la creará con sus cabeceras la primera vez que escriba en ella.');
      else { lineas.push('✗ FALTA la hoja "' + def.nombre + '"'); problemas++; }
      return;
    }
    var ancho = Math.max(sh.getLastColumn(), def.cols.length);
    var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
    var mapa = columnas(sh, def);
    var fallos = [];
    def.cols.forEach(function (c) {
      var esperada = letraACol(c[2]);
      var real = mapa[c[0]];
      var textoReal = texto(cab[esperada - 1]);
      if (textoReal === '' && (def.nuevasCabeceras || []).indexOf(c[0]) >= 0) {
        lineas.push('· ' + def.nombre + ' columna ' + c[2] + ': falta «' + c[1] + '»; el script la escribirá al leer o guardar cuentas.');
        return;
      }
      if (base(textoReal) !== base(c[1])) {
        fallos.push('   columna ' + c[2] + ': se esperaba «' + c[1] + '» y hay «' + textoReal + '»' +
          (real !== esperada ? ' → se usará la columna ' + colALetra(real) : ' → se usará igualmente la ' + c[2]));
      }
    });
    var extras = [];
    for (var i = def.cols.length; i < ancho; i++) if (texto(cab[i]) !== '') extras.push(colALetra(i + 1) + ' «' + texto(cab[i]) + '»');
    if (!fallos.length && !extras.length) {
      lineas.push('✓ ' + def.nombre + ': ' + def.cols.length + ' cabeceras correctas, ' + sh.getLastRow() + ' filas.');
    } else {
      problemas += fallos.length;
      lineas.push('✗ ' + def.nombre + ':');
      fallos.forEach(function (f) { lineas.push(f); });
      if (extras.length) lineas.push('   columnas de más (se ignoran): ' + extras.join(', '));
    }
  });

  ['Leyenda', 'Resumen'].forEach(function (n) {
    lineas.push((ss.getSheetByName(n) ? '· ' : '· falta ') + 'la hoja "' + n + '" (el script no la toca)');
  });
  var zScript = Session.getScriptTimeZone(), zHoja = ss.getSpreadsheetTimeZone();
  if (zScript === zHoja) lineas.push('✓ Zona horaria del script y de la hoja: ' + zHoja + '.');
  else {
    problemas++;
    lineas.push('✗ La zona horaria del script (' + zScript + ') no coincide con la de la hoja (' + zHoja + '): ' +
      'las fechas podrían guardarse un día antes. Iguala las dos; lo normal es poner la hoja en Europe/Madrid ' +
      '(Archivo → Configuración → Zona horaria).');
  }
  lineas.push(PropertiesService.getScriptProperties().getProperty('TOKEN')
    ? '✓ La propiedad TOKEN está puesta.'
    : '✗ FALTA la propiedad del script TOKEN (Configuración del proyecto → Propiedades del script).');
  lineas.push(problemas ? '\n' + problemas + ' diferencia(s). Revísalas arriba.' : '\nTodo correcto.');

  // Ojo: nada de SpreadsheetApp.getUi().alert() aquí. Un aviso emergente deja la
  // ejecución esperando a que alguien lo cierre y acaba en "Exceeded maximum
  // execution time". El informe sale en el registro de ejecución.
  var informe = lineas.join('\n');
  Logger.log(informe);
  return informe;
}
