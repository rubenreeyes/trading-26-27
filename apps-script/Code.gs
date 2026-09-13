/**
 * Trading 26/27 · puente entre la app y la hoja "Registro Trading 26-27".
 *
 * La hoja YA EXISTE y ya tiene sus filas y sus fórmulas. Este script no crea
 * hojas ni filas nuevas salvo cuando se agotan las filas preparadas, y en ese
 * caso copia antes las fórmulas de la fila anterior.
 *
 * Hojas que toca:
 *   Dias            una fila por día del curso (14-09-2026 a 31-07-2027). Solo D-L.
 *   Operaciones     400 filas preparadas; A, J, Q, X, Y son fórmulas.
 *   Candidatas      400 filas preparadas; B y H son fórmulas.
 *   Estado semanal  300 filas preparadas; B es fórmula.
 *   Backtest        filas 2-401 (de la 404 en adelante hay resúmenes).
 *   Cuentas         solo lectura.
 *   Leyenda y Resumen no se tocan nunca.
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
      ['rev730', 'Rev 7:30', 'D'], ['ny1530', 'NY 15:30', 'E'], ['formacion', 'Formación', 'F'],
      ['planificacion', 'Planif. domingo', 'G'], ['reglas', 'Reglas cumplidas', 'H'],
      ['reglaIncumplida', 'Regla incumplida', 'I'], ['freno', 'Freno', 'J'],
      ['fase', 'Fase scalping', 'K'], ['notas', 'Notas', 'L'], ['mes', 'Mes', 'M']
    ]
  },
  operaciones: {
    nombre: 'Operaciones',
    formulas: ['id', 'ratio', 'checklist', 'semana', 'mes'],   // A, J, Q, X, Y
    preparadas: 401,               // última fila con fórmulas ya escritas
    claveLibre: 'fechaApertura',   // fila libre = la primera con esta columna (B) vacía
    cols: [
      ['id', 'ID', 'A'], ['fechaApertura', 'Fecha apertura', 'B'], ['tipo', 'Tipo', 'C'],
      ['activo', 'Activo', 'D'], ['direccion', 'Dirección', 'E'], ['cuentas', 'Cuentas', 'F'],
      ['entrada', 'Entrada', 'G'], ['stop', 'Stop', 'H'], ['tp1', 'TP1', 'I'],
      ['ratio', 'Ratio TP1', 'J'], ['riesgo', 'Riesgo %', 'K'],
      ['c1', 'C1 fin de ciclo', 'L'], ['c2', 'C2 zona repetida', 'M'], ['c3', 'C3 gatillo', 'N'],
      ['c4', 'C4 contexto', 'O'], ['c5', 'C5 ratio ≥1:3', 'P'], ['checklist', 'Checklist OK', 'Q'],
      ['gestion', 'Gestión', 'R'], ['fechaCierre', 'Fecha cierre', 'S'],
      ['resultadoR', 'Resultado (R)', 'T'], ['dentroReglas', 'Dentro de reglas', 'U'],
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
      ['fecha', 'Fecha', 'A'], ['semana', 'Semana', 'B'], ['activo', 'Activo', 'C'],
      ['direccion', 'Dirección', 'D'], ['zona', 'Zona de entrada', 'E'], ['stop', 'Stop', 'F'],
      ['tp1', 'TP1', 'G'], ['ratio', 'Ratio', 'H'], ['estado', 'Estado', 'I'], ['notas', 'Notas', 'J']
    ]
  },
  cuentas: {
    nombre: 'Cuentas',
    formulas: [],
    cols: [
      ['cuenta', 'Cuenta', 'A'], ['firma', 'Firma', 'B'], ['producto', 'Producto', 'C'],
      ['balance', 'Balance inicial ($)', 'D'], ['fase', 'Fase', 'E'],
      ['perdidaDiaria', 'Pérdida diaria ($)', 'F'], ['perdidaMaxima', 'Pérdida máxima ($)', 'G'],
      ['objetivo', 'Objetivo ($)', 'H'], ['fechaLimite', 'Fecha límite', 'I'],
      ['estado', 'Estado', 'J'], ['uso', 'Uso', 'K'], ['notas', 'Notas', 'L']
    ]
  },
  estado: {
    nombre: 'Estado semanal',
    formulas: ['semana'],                                      // B
    preparadas: 301,
    claveLibre: 'fecha',
    cols: [
      ['fecha', 'Fecha', 'A'], ['semana', 'Semana', 'B'], ['cuenta', 'Cuenta', 'C'],
      ['balance', 'Balance', 'D'], ['drawdown', 'Drawdown usado (%)', 'E'],
      ['diasRentables', 'Días rentables', 'F'], ['proximoRetiro', 'Próximo retiro (fecha)', 'G'],
      ['progreso', 'Progreso objetivo (%)', 'H'], ['notas', 'Notas', 'I']
    ]
  },
  backtest: {
    nombre: 'Backtest',
    formulas: [],
    preparadas: 401,               // de la 404 en adelante hay resúmenes: nunca se pasa de aquí
    tope: true,
    claveLibre: 'fecha',
    cols: [
      ['fecha', 'Fecha del caso', 'A'], ['estrategia', 'Estrategia', 'B'], ['activo', 'Activo', 'C'],
      ['direccion', 'Dirección', 'D'], ['checklist', 'Checklist OK', 'E'],
      ['resultadoR', 'Resultado (R)', 'F'], ['notas', 'Notas', 'G']
    ]
  }
};

// Columnas que llevan fecha y se escriben siempre como texto AAAA-MM-DD.
var COLS_FECHA = ['fecha', 'fechaApertura', 'fechaCierre', 'proximoRetiro'];

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

// La celda de fecha, como texto AAAA-MM-DD, valga como Date o como texto.
function fechaTexto(v) {
  // Duck typing en vez de "instanceof Date": vale para cualquier Date venga de donde venga.
  if (v && typeof v.getTime === 'function') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var s = texto(v);
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);            // por si alguna celda quedó como 14/09/2026
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return s;
}

function hojaDe(def) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(def.nombre);
  if (!sh) throw new Error('falta la hoja "' + def.nombre + '"');
  return sh;
}

/**
 * Mapa clave → número de columna. Primero cabeceras idénticas, después las que
 * empiezan igual o contienen el texto, y por último la letra de respaldo.
 */
function columnas(sh, def) {
  var ancho = Math.max(sh.getLastColumn(), def.cols.length);
  var cab = ancho > 0 ? sh.getRange(1, 1, 1, ancho).getValues()[0].map(normaliza) : [];
  var out = {}, usadas = {}, pendientes = [];
  def.cols.forEach(function (c) {
    var i = cab.indexOf(normaliza(c[1]));
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

// Escribe respetando el tipo: las fechas siempre como texto AAAA-MM-DD.
function escribir(sh, fila, col, clave, valor) {
  var r = sh.getRange(fila, col);
  if (COLS_FECHA.indexOf(clave) >= 0) {
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
  (def.formulas || []).forEach(function (clave) {
    var c = cols[clave];
    sh.getRange(nueva - 1, c).copyTo(sh.getRange(nueva, c));   // arrastra la fórmula a la fila nueva
  });
  return nueva;
}

// Escribe en una fila los campos que vengan definidos, saltándose las fórmulas.
function escribirFila(sh, def, cols, fila, datos) {
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
    fila = filaLibre(sh, def, cols);
    nueva = true;
    if (!definido(d.fechaApertura) || fechaTexto(d.fechaApertura) === '') {
      return responder({ ok: false, error: 'falta la fecha de apertura' });
    }
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
      filas = leerHoja(HOJAS.cuentas, function (o) { return texto(o.cuenta) !== ''; });
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
    estadoSemanal: guardarEstadoSemanal, backtest: guardarBacktest
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
    if (!sh) { lineas.push('✗ FALTA la hoja "' + def.nombre + '"'); problemas++; return; }
    var ancho = Math.max(sh.getLastColumn(), def.cols.length);
    var cab = sh.getRange(1, 1, 1, ancho).getValues()[0];
    var mapa = columnas(sh, def);
    var fallos = [];
    def.cols.forEach(function (c) {
      var esperada = letraACol(c[2]);
      var real = mapa[c[0]];
      var textoReal = texto(cab[esperada - 1]);
      if (normaliza(textoReal) !== normaliza(c[1])) {
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
  lineas.push(PropertiesService.getScriptProperties().getProperty('TOKEN')
    ? '✓ La propiedad TOKEN está puesta.'
    : '✗ FALTA la propiedad del script TOKEN (Configuración del proyecto → Propiedades del script).');
  lineas.push(problemas ? '\n' + problemas + ' diferencia(s). Revísalas arriba.' : '\nTodo correcto.');

  var informe = lineas.join('\n');
  Logger.log(informe);
  try { SpreadsheetApp.getUi().alert(informe); } catch (err) { /* sin interfaz: basta el registro */ }
  return informe;
}
