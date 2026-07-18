/**
 * POLLA FUTBOLERA — Backend de Google Apps Script
 * Sirve polla-futbolera.html y lee/escribe los datos en una Google Sheet.
 *
 * Hojas esperadas en el Spreadsheet activo:
 *
 * "Partidos"
 *   id | jornada | grupo | local | visitante | fecha (ISO) | estado (pendiente/vivo/final) | golesLocal | golesVisitante
 *
 * "Pronosticos"
 *   usuario | matchId | golesLocal | golesVisitante | timestamp
 *
 * Para desplegar:
 *   1. Crea un proyecto de Apps Script (script.google.com) o uno ligado a un Spreadsheet.
 *   2. Pega este archivo como Codigo.gs y polla-futbolera.html como archivo HTML
 *      (Apps Script no permite guiones en el nombre del archivo HTML: usa "index"
 *      o ajusta el nombre en HtmlService.createHtmlOutputFromFile abajo).
 *   3. Crea las hojas "Partidos" y "Pronosticos" con las columnas de arriba.
 *   4. Implementar > Nueva implementación > Aplicación web.
 */

const SHEET_PARTIDOS = 'Partidos';
const SHEET_PRONOSTICOS = 'Pronosticos';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('polla-futbolera')
    .setTitle('Polla Futbolera')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Devuelve todo lo que la interfaz necesita para pintarse:
 * torneo, partidos, ranking calculado y los pronósticos del usuario actual.
 */
function getDatosPolla(usuario) {
  const partidos = leerPartidos_();
  const pronosticosUsuario = leerPronosticosDeUsuario_(usuario);
  const ranking = calcularRanking_(partidos);

  return {
    torneo: 'Torneo Apertura 2026',
    partidos: partidos,
    pronosticos: pronosticosUsuario,
    ranking: ranking
  };
}

/**
 * Guarda (o actualiza) el pronóstico de un usuario para un partido,
 * siempre que el partido siga en estado "pendiente".
 */
function guardarPronostico(usuario, matchId, golesLocal, golesVisitante) {
  const partido = leerPartidos_().find(p => p.id === matchId);
  if (!partido) throw new Error('Partido no encontrado');
  if (partido.estado !== 'pendiente') throw new Error('El partido ya inició, no se puede pronosticar');

  const sheet = _sheet(SHEET_PRONOSTICOS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colUsuario = headers.indexOf('usuario');
  const colMatch = headers.indexOf('matchId');

  for (let i = 1; i < data.length; i++) {
    if (data[i][colUsuario] === usuario && data[i][colMatch] === matchId) {
      sheet.getRange(i + 1, headers.indexOf('golesLocal') + 1, 1, 3)
        .setValues([[golesLocal, golesVisitante, new Date()]]);
      return { ok: true };
    }
  }

  sheet.appendRow([usuario, matchId, golesLocal, golesVisitante, new Date()]);
  return { ok: true };
}

/* ---------------- Helpers internos ---------------- */

function _sheet(nombre) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!sheet) throw new Error('No existe la hoja "' + nombre + '"');
  return sheet;
}

function leerPartidos_() {
  const data = _sheet(SHEET_PARTIDOS).getDataRange().getValues();
  const headers = data.shift();
  return data.map(row => {
    const o = {};
    headers.forEach((h, i) => o[h] = row[i]);
    o.fecha = new Date(o.fecha).toISOString();
    o.golesLocal = o.golesLocal === '' ? null : Number(o.golesLocal);
    o.golesVisitante = o.golesVisitante === '' ? null : Number(o.golesVisitante);
    o.jornada = Number(o.jornada);
    return o;
  });
}

function leerPronosticosDeUsuario_(usuario) {
  const data = _sheet(SHEET_PRONOSTICOS).getDataRange().getValues();
  const headers = data.shift();
  const colUsuario = headers.indexOf('usuario');
  const colMatch = headers.indexOf('matchId');
  const colGL = headers.indexOf('golesLocal');
  const colGV = headers.indexOf('golesVisitante');

  const out = {};
  data.forEach(row => {
    if (row[colUsuario] === usuario) {
      out[row[colMatch]] = { golesLocal: row[colGL], golesVisitante: row[colGV] };
    }
  });
  return out;
}

function calcularRanking_(partidos) {
  const data = _sheet(SHEET_PRONOSTICOS).getDataRange().getValues();
  const headers = data.shift();
  const colUsuario = headers.indexOf('usuario');
  const colMatch = headers.indexOf('matchId');
  const colGL = headers.indexOf('golesLocal');
  const colGV = headers.indexOf('golesVisitante');

  const partidosPorId = {};
  partidos.forEach(p => partidosPorId[p.id] = p);

  const stats = {};
  data.forEach(row => {
    const usuario = row[colUsuario];
    const partido = partidosPorId[row[colMatch]];
    if (!partido || partido.estado !== 'final') return;

    stats[usuario] = stats[usuario] || { nombre: usuario, avatar: '⚽', puntos: 0, exactos: 0, resultados: 0, fallos: 0 };

    const predL = Number(row[colGL]), predV = Number(row[colGV]);
    const realL = partido.golesLocal, realV = partido.golesVisitante;

    if (predL === realL && predV === realV) {
      stats[usuario].puntos += 3;
      stats[usuario].exactos += 1;
    } else if (Math.sign(predL - predV) === Math.sign(realL - realV)) {
      stats[usuario].puntos += 1;
      stats[usuario].resultados += 1;
    } else {
      stats[usuario].fallos += 1;
    }
  });

  return Object.values(stats).sort((a, b) => b.puntos - a.puntos);
}
