/* Finanzas Personales – resumen de la cuenta bancaria (extracto): lectura del PDF y asignación de cada
   ingreso (sueldo, alquileres, Alveon...) y de cada débito a un concepto. */
'use strict';

const RE_EXT_SALDO_ANT = /saldo (anterior|inicial)|saldo al inicio/i;
const RE_EXT_SALDO_FIN = /saldo (final|actual)|saldo al cierre|saldo al \d/i;
// Textos de encabezado o pie de página que no forman parte del concepto de un movimiento.
const RE_EXT_BASURA = /banco bbva|iva responsable|\bcuit\b|p[aá]gina|hoja \d|consolidado|caja de ahorros?|cuenta corriente|saldo|sobre de|compras visa d[eé]bito|^total|detalle de movimientos/i;
const RE_EXT_OMITIR = /^(fecha|concepto|descripci[oó]n|detalle|movimientos?)\b|total(es)? (de )?(d[eé]bitos|cr[eé]ditos|movimientos)|p[aá]gina \d/i;

/* Interpreta las líneas del extracto. Cada movimiento de la cuenta tiene: fecha, concepto, importe (débito o crédito) y saldo.
   El signo se deduce del saldo: si el saldo sube, es un crédito; si baja, un débito.
   Resúmenes con secciones (por ejemplo, BBVA): sólo se toman como movimientos los de la sección de la cuenta (con saldo).
   Las secciones de detalle sirven para completar los conceptos:
   - "Compras Visa Débito": nombre del comercio de cada "PAGO CON VISA DEBITO".
   - "Transferencias recibidas / enviadas": nombre o CUIT de la otra parte.
   - "Intervinientes": titulares de la cuenta (las transferencias entre ellos no son ingresos ni gastos). */
function interpretarExtracto(lineas, opciones = {}) {
  // Algunos PDF pegan caracteres extraños antes de la fecha ("Ëijg´¦ÁgÌ04/11 ..."): se quitan.
  lineas = lineas.map(l => ({ ...l, texto: l.texto.replace(/^[^\s\d]+(?=\d{1,2}\/\d{1,2})/, '') }));
  const todo = lineas.map(l => l.texto).join('\n');
  // Año de referencia: el de la última fecha completa del texto.
  const completas = [...todo.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{4}|\d{2})\b/g)].map(m => fechaDe(m[1], m[2], m[3], 0)).filter(Boolean).sort();
  const anio = completas.length ? Number(completas[completas.length - 1].slice(0, 4)) : Number(opciones.anio || new Date().getFullYear());

  // Columnas de débito, crédito y saldo, si el extracto tiene encabezado.
  let colDeb = null, colCred = null;
  for (const l of lineas) {
    const d = (l.partes || []).find(x => /d[eé]bito/i.test(x.s));
    const c = (l.partes || []).find(x => /cr[eé]dito/i.test(x.s));
    if (d && c && d !== c) { colDeb = (d.x + d.x2) / 2; colCred = (c.x + c.x2) / 2; }
  }
  const esEncabezadoMovs = t => /concepto|descripci[oó]n|detalle/i.test(t) && /saldo/i.test(t) && /d[eé]bito/i.test(t);
  const conSecciones = lineas.some(l => esEncabezadoMovs(l.texto));

  let saldoInicial = null, saldoFinal = null, previo = null;
  /* Cada cuenta del resumen tiene su moneda: "CA $ 000-000000/0" (pesos) o "CA U$S 000-000000/0" (dólares).
     Los movimientos y saldos se leen por cuenta; nunca se mezclan pesos con dólares. */
  const cuentas = [], saldos = {};
  let monedaCuenta = null;
  const RE_CUENTA = /^(?:CA|CC|CAJA DE AHORROS?|CUENTA CORRIENTE)\s*(U\$S|USD|D[OÓ]LARES|\$|PESOS)\s*([\d][\d/-]*)/i;
  const movs = [], compras = [], recibidas = [], enviadas = [], titulares = [];
  let ultimo = null, modo = conSecciones ? 'otro' : 'movimientos', esperarTitulares = false;
  for (const l of lineas) {
    const texto = l.texto.replace(/\s+/g, ' ').trim();
    if (!texto) continue;
    // Encabezado de una cuenta: fija la moneda de los movimientos que siguen.
    const mc = modo !== 'compras' && modo !== 'recibidas' && modo !== 'enviadas' ? texto.match(RE_CUENTA) : null;
    if (mc) {
      const mon = /u\$s|usd|d[oó]lar/i.test(mc[1]) ? 'USD' : 'ARS';
      if (!cuentas.some(c => c.numero === mc[2])) cuentas.push({ moneda: mon, numero: mc[2], texto: mc[0] });
      if (monedaCuenta !== mon) previo = null; // otra cuenta: su propio saldo
      monedaCuenta = mon;
    }
    if (/comercio/i.test(texto) && /compbte|comprobante/i.test(texto)) { modo = 'compras'; ultimo = null; continue; }
    if (esEncabezadoMovs(texto)) { modo = 'movimientos'; ultimo = null; continue; }
    if (/^recibidas\b/i.test(texto)) { modo = 'recibidas'; continue; }
    if (/^enviadas\b/i.test(texto)) { modo = 'enviadas'; continue; }
    if (/^(otros productos|legales|pr[eé]stamos y adelantos|cuentas$)/i.test(texto)) { modo = 'otro'; ultimo = null; continue; }
    if (/^intervinientes/i.test(texto)) { esperarTitulares = true; continue; }
    if (esperarTitulares) {
      esperarTitulares = false;
      texto.split('|').forEach(x => {
        const cuit = (x.match(/\(([\d-]{11,13})\)/) || [])[1];
        titulares.push({ nombre: x.replace(/\(.*$/, '').trim().toUpperCase(), cuit: cuit ? cuit.replace(/\D/g, '') : '' });
      });
      continue;
    }
    if (modo === 'compras') {
      const m = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(?:\*+\s+)+(\d{4})\s+(.+?)\s+(\d{4,8})\s+\$?\s*(-?[\d.]*\d,\d{2})/);
      if (m) {
        const c = { fecha: fechaDe(m[1], m[2], m[3], anio), tarjeta: m[4], comercio: m[5].replace(/[(\s]+$/, '').trim(), comp: m[6], monto: Math.abs(parseMonto(m[7])) };
        // Al cortar de página, el banco repite el último renglón: no se duplica.
        if (!compras.some(x => x.fecha === c.fecha && x.comp === c.comp && x.monto === c.monto)) compras.push(c);
      }
      continue;
    }
    if (modo === 'recibidas' || modo === 'enviadas') {
      const imp = (texto.match(/\$\s*(-?[\d.]*\d,\d{2})/) || [])[1];
      const m = modo === 'recibidas'
        ? texto.match(/^(\d{1,2})\/(\d{1,2})\s+\S+\s+(\d{8,12})\s+(.*?)\s+(?:TR\.|VARIOS)/i)
        : texto.match(/^(\d{1,2})\/(\d{1,2})\s+(\d{8,12})\s+(.*?)\s*\b0{6,}\s+VARIOS\s*(.*?)\s*\$/i);
      if (m && imp) (modo === 'recibidas' ? recibidas : enviadas).push({ fecha: fechaDe(m[1], m[2], '', anio), cuit: m[3], nombre: m[4].trim(),
        referencia: modo === 'enviadas' ? (m[5] || '').replace(/^TR\..*/i, '').trim() : '', monto: Math.abs(parseMonto(imp)) });
      continue;
    }
    if (modo !== 'movimientos') continue;
    if (RE_EXT_OMITIR.test(texto)) { ultimo = null; continue; }
    const imps = [...texto.matchAll(RE_IMPORTE)].filter(m => !/^\s*%/.test(texto.slice(m.index + m[0].length)));
    if (RE_EXT_SALDO_ANT.test(texto) && imps.length) {
      const v = parseMonto(imps[imps.length - 1][0]), mon = monedaCuenta || 'ARS';
      (saldos[mon] = saldos[mon] || {}).inicial = v; previo = v; ultimo = null; continue;
    }
    if (RE_EXT_SALDO_FIN.test(texto) && imps.length) {
      (saldos[monedaCuenta || 'ARS'] = saldos[monedaCuenta || 'ARS'] || {}).final = parseMonto(imps[imps.length - 1][0]); ultimo = null; continue;
    }
    const f = leerFechaInicial(texto, anio);
    if (!f || !f.fecha) {
      // Renglón de continuación: completa el concepto del movimiento anterior (por ejemplo, el nombre de quien transfiere).
      if (ultimo && !imps.length && texto.length < 60 && ultimo.descripcion.length < 70 && !RE_EXT_BASURA.test(texto)) ultimo.descripcion += ' ' + texto;
      else if (RE_EXT_BASURA.test(texto)) ultimo = null;
      continue;
    }
    const resto = texto.slice(f.largo);
    const encontrados = [...resto.matchAll(RE_IMPORTE)].filter(m => !/^\s*%/.test(resto.slice(m.index + m[0].length)));
    if (!encontrados.length) { ultimo = null; continue; }
    // Importes finales consecutivos (importe y saldo; a veces también una columna vacía).
    const finales = [];
    for (let i = encontrados.length - 1; i >= 0 && finales.length < 3; i--) {
      const m = encontrados[i];
      const sig = i === encontrados.length - 1 ? resto.slice(m.index + m[0].length) : resto.slice(m.index + m[0].length, encontrados[i + 1].index);
      if (sig.trim().length > (i === encontrados.length - 1 ? 3 : 0)) break;
      finales.unshift(m);
    }
    if (!finales.length) continue;
    let desc = resto.slice(0, finales[0].index).replace(/\b\d{6,}\b/g, ' ').replace(/^\s*\d{2,4}\s+/, '').replace(/\s{2,}/g, ' ').trim() || 'Movimiento';
    const valores = finales.map(m => parseMonto(m[0]));
    let importe, saldo = null;
    if (valores.length >= 2) { saldo = valores[valores.length - 1]; importe = valores[valores.length - 2]; }
    else importe = valores[0];
    let tipo = null, verificado = false;
    const abs = Math.abs(importe);
    if (saldo != null && previo != null) {
      if (Math.abs(previo + abs - saldo) < 0.02) { tipo = 'credito'; verificado = true; }
      else if (Math.abs(previo - abs - saldo) < 0.02) { tipo = 'debito'; verificado = true; }
    }
    if (!tipo && colDeb != null && l.partes) {
      const txt = finales[valores.length >= 2 ? valores.length - 2 : 0][0].replace(/^-?\(?\$?\s?/, '').replace(/\)?-?$/, '');
      const parte = [...l.partes].reverse().find(p => p.s.includes(txt) && (saldo == null || p !== l.partes[l.partes.length - 1]));
      if (parte) { const c = (parte.x + parte.x2) / 2; tipo = Math.abs(c - colCred) < Math.abs(c - colDeb) ? 'credito' : 'debito'; }
    }
    if (!tipo) tipo = importe < 0 ? 'debito' : (saldo != null && previo != null && saldo > previo ? 'credito' : 'debito');
    if (saldo != null) previo = saldo;
    if (!abs) continue;
    ultimo = { id: uid(), fecha: f.fecha, descripcion: desc, original: desc, monto: redondear(abs), tipo, saldo, verificado, moneda: monedaCuenta || '' };
    movs.push(ultimo);
  }
  // Fechas sin año en resúmenes que cruzan el fin de año (diciembre en un resumen de enero).
  const tope = completas.length ? sumarDias(completas[completas.length - 1], 45) : '';
  if (tope) [movs, compras, recibidas, enviadas].forEach(l => l.forEach(x => {
    if (x.fecha && x.fecha > tope) x.fecha = `${Number(x.fecha.slice(0, 4)) - 1}${x.fecha.slice(4)}`;
  }));
  completarConceptos(movs, compras, recibidas, enviadas, titulares);
  // Moneda: la de la cuenta detectada; si el resumen no la indica, se pregunta en pantalla (pesos por defecto).
  const detectada = cuentas.length > 0;
  const moneda = detectada ? (cuentas.every(c => c.moneda === 'USD') ? 'USD' : 'ARS') : 'ARS';
  movs.forEach(m => { if (!m.moneda) m.moneda = moneda; m.descripcion = m.descripcion.replace(/\s{2,}/g, ' ').trim(); });
  // Saldo final de cada moneda: el informado o el de su último movimiento.
  const ultimaFecha = movs.map(m => m.fecha).sort().pop() || '';
  for (const mon of MONEDAS) {
    const ult = [...movs].reverse().find(m => m.moneda === mon && m.saldo != null);
    if (!ult && !(saldos[mon] && saldos[mon].final != null)) continue;
    saldos[mon] = saldos[mon] || {};
    // Saldo informado por el banco ("SALDO AL 20 DE NOVIEMBRE"): vale a la fecha de cierre del resumen.
    if (saldos[mon].final != null) saldos[mon].fecha = ultimaFecha;
    else { saldos[mon].final = ult.saldo; saldos[mon].fecha = ult.fecha; }
  }
  saldoInicial = (saldos[moneda] || {}).inicial ?? null;
  saldoFinal = (saldos[moneda] || {}).final ?? null;
  const fechas = movs.map(m => m.fecha).sort();
  return { movimientos: movs, saldoInicial, saldoFinal, saldos, cuentas, monedaDetectada: detectada, desde: fechas[0] || '', hasta: fechas[fechas.length - 1] || '', moneda,
    titulares: titulares.map(t => t.nombre), compras: compras.length, transferencias: recibidas.length + enviadas.length };
}

/* Completa los conceptos genéricos con el detalle de otras secciones del resumen. */
function completarConceptos(movs, compras, recibidas, enviadas, titulares) {
  const usadas = new Set();
  // Las devoluciones (créditos) pueden corresponder a una compra ya usada por su débito.
  const cerca = (lista, m, maxDias, antes) => lista.map((c, k) => ({ c, k }))
    .filter(({ c, k }) => (m.tipo === 'credito' || !usadas.has(k)) && Math.abs(c.monto - m.monto) < 0.005 && c.fecha &&
      (antes ? c.fecha <= m.fecha && diasEntre(c.fecha, m.fecha) <= maxDias : Math.abs(diasEntre(c.fecha, m.fecha)) <= maxDias))
    .sort((a, b) => Math.abs(diasEntre(a.c.fecha, m.fecha)) - Math.abs(diasEntre(b.c.fecha, m.fecha)))[0];
  const palabrasTitulares = titulares.map(t => t.nombre.split(/\s+/).filter(w => w.length > 3));
  const esPropia = (cuit, nombre) => titulares.some((t, i) => (t.cuit && cuit && cuit.includes(t.cuit)) ||
    (nombre && palabrasTitulares[i].filter(w => nombre.toUpperCase().includes(w)).length >= 2));
  const usadasTr = new Set();
  for (const m of movs) {
    if (/pago con visa d[eé]bito|compra.*d[eé]bito/i.test(m.descripcion)) {
      // Débito: la compra del mismo importe hecha hasta 10 días antes. Crédito: devolución de una compra anterior.
      const r = m.tipo === 'debito' ? cerca(compras, m, 10, true) : cerca(compras, m, 60, true);
      if (r) {
        if (m.tipo === 'debito') usadas.add(r.k);
        m.comercio = r.c.comercio;
        m.tarjetaDebito = r.c.tarjeta;
        m.titular = titularDeTarjeta(r.c.tarjeta);
        m.descripcion = (m.tipo === 'credito' ? 'Devolución Visa Débito: ' : 'Visa Débito: ') + r.c.comercio;
      }
    }
    if (/transferencia|transf\b|\btr\.? ?ne\b/i.test(m.descripcion)) {
      const lista = m.tipo === 'credito' ? recibidas : enviadas;
      const r = lista.map((c, k) => ({ c, k })).filter(({ c, k }) => !usadasTr.has(lista === recibidas ? 'r' + k : 'e' + k) &&
        c.fecha === m.fecha && Math.abs(c.monto - m.monto) < 0.005)[0];
      if (r) {
        usadasTr.add((lista === recibidas ? 'r' : 'e') + r.k);
        const quien = r.c.nombre || ('CUIT ' + r.c.cuit);
        m.contraparte = quien; m.cuit = r.c.cuit;
        m.clave = 'TRANSF ' + (r.c.nombre ? claveBanco(r.c.nombre) : r.c.cuit);
        m.descripcion = (m.tipo === 'credito' ? 'Transferencia de ' : 'Transferencia a ') + quien + (r.c.referencia ? ` (${r.c.referencia})` : '');
        m.propia = esPropia(r.c.cuit, r.c.nombre);
      }
    }
  }
}

/* ---------- Sugerencias de concepto ---------- */
// Clave para recordar la asignación: el concepto completo sin números (incluye el nombre de quien transfiere).
const claveBanco = desc => String(desc || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^A-Z ]+/g, ' ').split(/\s+/).filter(w => w.length > 1).slice(0, 10).join(' ').slice(0, 70);
const claveMov = m => m.clave || claveBanco(m.descripcion);
const reglaBanco = m => (buscar('reglas', 'banco:' + claveMov(m)) || {}).categoria;
/* Valor sugerido para un movimiento del extracto:
   - créditos: id de un concepto de ingreso, 'no' (no es ingreso) o '' (sin asignar);
   - débitos: 'cat:<cuenta>' (gasto en esa cuenta), id de un gasto habitual, 'tarjeta' (pago de un resumen de tarjeta de crédito),
     'no' (no es gasto: transferencia propia, ahorro, compra de dólares) o '' (sin asignar). */
const RE_NO_GASTO = /compra ?venta mon|mon\.? ?extranjera|plazo fijo|\bfci\b|suscripci[oó]n|rescate|inversi[oó]n/i;
const RE_TRANSFERENCIA = /transferencia|\btransf\b|\btr\.? ?ne\b|debin|\bcoe\b|\bcvu\b|\bcbu\b/i;
const catValida = c => 'cat:' + (db.config.categorias.includes(c) ? c : 'Consumo');
function conceptoSugerido(m) {
  const regla = reglaBanco(m);
  if (regla) return regla;
  if (m.propia) return 'no'; // transferencia entre los titulares de la cuenta
  const d = m.descripcion;
  if (m.tipo === 'credito') {
    const sueldo = conceptosDe('ingreso').find(c => c.activo && c.grupo === 'Sueldos');
    if (/haber(es)?|sueldo|remunerac|acred.*hab/i.test(d) && sueldo) return sueldo.id;
    if (RE_NO_GASTO.test(d)) return 'no';
    // Devoluciones y reintegros: restan del gasto de su cuenta (no son ingresos).
    if (m.comercio) return catValida(categoriaSugerida(m.comercio, reglasMapa()));
    if (/reintegro seg|seg\.? ?inc/i.test(d)) return catValida('Servicios');
    if (/reintegro|devoluci[oó]n|bonificaci[oó]n|contracargo/i.test(d)) return catValida('Consumo');
    if (/intereses ganados/i.test(d) && buscar('conceptos', 'ing-otros')) return 'ing-otros';
    return '';
  }
  if (m.comercio) return catValida(categoriaSugerida(m.comercio, reglasMapa()));
  if (/d[eé]bito cuota|p\.? ?hipotec/i.test(d) && buscar('conceptos', 'egr-hipoteca')) return 'egr-hipoteca';
  if (/pago (de )?(tarjeta|visa|master|amex)/i.test(d) && !/d[eé]bito/i.test(d)) return 'tarjeta';
  if (/ecogas|metrogas|naturgy|camuzzi|\bgas\b/i.test(d) && buscar('conceptos', 'egr-gas')) return 'egr-gas';
  if (/epec|edenor|edesur|edelap|electric|energ[ií]a/i.test(d) && buscar('conceptos', 'egr-electricidad')) return 'egr-electricidad';
  if (/hipotec|pr[eé]stamo|cuota pr[eé]st/i.test(d) && buscar('conceptos', 'egr-hipoteca')) return 'egr-hipoteca';
  if (/alveon/i.test(d) && buscar('conceptos', 'egr-alveon-gastos')) return 'egr-alveon-gastos';
  if (/servicio dom[eé]stico|casas particulares|personal dom[eé]stico|empleada dom[eé]stica/i.test(d) && buscar('conceptos', 'egr-servicio-domestico')) return 'egr-servicio-domestico';
  if (RE_NO_GASTO.test(d)) return 'no';
  // "CR/DB DEBIN": extracciones de efectivo en el cajero.
  if (/debin/i.test(d)) return 'cat:Consumo';
  if (RE_TRANSFERENCIA.test(d)) return ''; // puede ser un pago (alquiler, servicio) o un pase entre cuentas propias: decide el usuario
  if (/extracci[oó]n|efectivo|\bcash\b|cajero/i.test(d)) return 'cat:Consumo';
  if (/seg\.? ?inc|seguro/i.test(d)) return 'cat:Servicios';
  return catValida(categoriaSugerida(d, reglasMapa()));
}
const refMovimiento = m => `${m.fecha}|${num(m.monto).toFixed(2)}|${claveBanco(m.descripcion)}`;
// Fecha, importe y tipo: detecta lo ya importado aunque el concepto se haya leído distinto en otra versión.
const refSimple = m => `${m.fecha}|${num(m.monto).toFixed(2)}|${m.tipo === 'credito' ? 'ingreso' : 'egreso'}`;
function movimientoExistente(m) {
  const tipo = m.tipo === 'credito' ? 'ingreso' : 'egreso';
  return vigentes('movimientos').find(x => !x.agrupado && (x.ref === refMovimiento(m) ||
    (x.origen === 'banco' && x.fecha === m.fecha && x.tipo === tipo && Math.abs(num(x.monto) - m.monto) < 0.005))) || null;
}
function refsImportadas() {
  const set = new Set();
  for (const x of vigentes('movimientos')) {
    if (x.ref) set.add(x.ref);
    (x.refs || []).forEach(r => set.add(r));
    if (x.origen === 'banco' && !x.agrupado) set.add(`${x.fecha}|${num(x.monto).toFixed(2)}|${x.tipo}`);
  }
  return set;
}

/* ---------- Interfaz ---------- */
async function importarExtracto(archivo, volver) {
  toast('Leyendo el PDF…', 4000);
  try {
    const lineas = await lineasDePDF(archivo, incorrecta => prompt(incorrecta ? 'Clave incorrecta. Ingrese nuevamente la clave del PDF:' : 'El PDF está protegido. Ingrese la clave:'));
    const r = interpretarExtracto(lineas);
    if (!r.movimientos.length) toast('No se reconocieron movimientos en el PDF. Envíe el resumen para adaptar la lectura a ese formato.', 8000);
    const yaImportados = refsImportadas();
    r.movimientos.forEach(m => {
      m.importado = yaImportados.has(refMovimiento(m)) || yaImportados.has(refSimple(m));
      m.sugerido = conceptoSugerido(m);
      // Si ya se registró como un movimiento individual, se muestra su asignación actual y se puede corregir.
      const x = m.importado ? movimientoExistente(m) : null;
      m.existente = x ? x.id : '';
      m.asignado = x ? x.conceptoId : m.importado ? 'no' : m.sugerido;
      m.inicial = m.asignado;
    });
    renderExtracto({ ...r, archivo: archivo.name, actualizarSaldo: r.saldoFinal != null }, lineas, volver);
  } catch (e) {
    toast(e && e.name === 'PasswordException' ? 'No se pudo abrir el PDF sin la clave.' : 'No se pudo leer el PDF: ' + (e.message || e), 8000);
  }
}

let filtroExtracto = 'creditos';
function renderExtracto(ext, lineasPDF, volver) {
  const ingresos = conceptosDe('ingreso').filter(c => c.activo);
  const egresos = conceptosDe('egreso').filter(c => c.activo);
  const nombreOpcion = v => (v === 'no' ? 'No registrar' : v === 'tarjeta' ? 'Pago de tarjeta' : v ? nombreConcepto(v) : 'Sin asignar');
  function pintar() {
    const monDe = m => m.moneda || ext.moneda;
    const $$ = (v, mon = ext.moneda) => fmtMon(v, mon, true);
    const cred = ext.movimientos.filter(m => m.tipo === 'credito'), deb = ext.movimientos.filter(m => m.tipo === 'debito');
    const tarjetasSinTitular = [...new Set(ext.movimientos.filter(m => m.tarjetaDebito && !titularDeTarjeta(m.tarjetaDebito)).map(m => m.tarjetaDebito))];
    const monedasExt = MONEDAS.filter(mon => ext.movimientos.some(m => monDe(m) === mon) || (ext.saldos[mon] || {}).final != null);
    if (!monedasExt.length) monedasExt.push(ext.moneda);
    const sinAsignar = cred.filter(m => !m.asignado).length;
    const sinAsignarDeb = deb.filter(m => !m.asignado).length;
    const opcionesDebito = [
      ['', 'Sin asignar'],
      ...db.config.categorias.map(c => ['cat:' + c, 'Gasto: ' + c]),
      ...egresos.filter(c => !c.eventual).map(c => [c.id, c.nombre]),
      ['tarjeta', 'Pago de resumen de tarjeta de crédito'],
      ['no', 'No es gasto (transferencia propia, ahorro, compra de dólares)']
    ];
    const visibles = ext.movimientos.map((m, k) => ({ m, k })).filter(({ m }) =>
      filtroExtracto === 'creditos' ? m.tipo === 'credito' : filtroExtracto === 'debitos' ? m.tipo === 'debito' : true);
    const suma = l => l.reduce((s, m) => s + m.monto, 0);
    const noVerif = ext.movimientos.filter(m => !m.verificado).length;
    setHeader('Resumen del banco', () => { if (confirm('Los movimientos no se guardaron. ¿Salir?')) volver(); });
    view.innerHTML = `
      <div class="card" id="fres">
        <p class="hint" style="margin-top:0">Leído de: <b>${esc(ext.archivo)}</b> · del ${fmtFecha(ext.desde)} al ${fmtFecha(ext.hasta)}</p>
        ${ext.monedaDetectada
          ? `<p class="value" style="margin:0 0 10px">${ext.cuentas.map(c => `<b>${esc(c.texto)}</b> (${c.moneda === 'USD' ? 'dólares' : 'pesos'})`).join('<br>')}</p>`
          : `<div class="form-row"><label>Moneda de la cuenta</label>${segmentado('x-moneda', [['ARS', 'Pesos'], ['USD', 'Dólares']], ext.moneda)}
              <p class="hint" style="margin:6px 0 0">El resumen no indica la moneda de la cuenta: elíjala.</p></div>`}
        ${monedasExt.map(mon => {
          const c = cred.filter(m => monDe(m) === mon), d = deb.filter(m => monDe(m) === mon), sd = ext.saldos[mon] || {};
          return `${monedasExt.length > 1 ? `<p class="moneda-titulo">${mon === 'USD' ? 'Cuenta en dólares' : 'Cuenta en pesos'}</p>` : ''}
          <div class="grid2">
            <div><div class="label">Créditos (${c.length})</div><div class="value pos">${$$(suma(c), mon)}</div></div>
            <div><div class="label">Débitos (${d.length})</div><div class="value">${$$(suma(d), mon)}</div></div>
            ${sd.inicial != null ? `<div><div class="label">Saldo inicial</div><div class="value">${$$(sd.inicial, mon)}</div></div>` : ''}
            ${sd.final != null ? `<div><div class="label">Saldo final</div><div class="value">${$$(sd.final, mon)}</div></div>` : ''}
          </div>`;
        }).join('')}
        ${monedasExt.some(mon => (ext.saldos[mon] || {}).final != null) ? `<label class="check"><input type="checkbox" id="x-saldo" ${ext.actualizarSaldo ? 'checked' : ''}> Usar ${esc(monedasExt.filter(mon => (ext.saldos[mon] || {}).final != null).map(mon => $$(ext.saldos[mon].final, mon)).join(' y '))} como saldo del banco al ${fmtFecha(ext.hasta)}</label>` : ''}
        ${ext.compras || ext.transferencias ? `<p class="hint" style="margin:6px 0 0">Se completaron los conceptos con ${ext.compras} compra(s) con débito y ${ext.transferencias} transferencia(s) del detalle del resumen${ext.titulares && ext.titulares.length ? `. Titulares: ${esc(ext.titulares.join(' y '))} (las transferencias entre ellos no se cuentan)` : ''}.</p>` : ''}
        ${tarjetasSinTitular.length ? `<div class="form-row" style="margin-top:10px"><label>¿De quién es cada tarjeta de débito?</label>
          ${tarjetasSinTitular.map(n => `<p class="hint" style="margin:6px 0 4px">Tarjeta terminada en <b>${esc(n)}</b></p>
            <div class="choice" data-tarjeta="${esc(n)}">${titulares().map(t => `<button type="button" data-titular="${esc(t.nombre)}">${esc(t.nombre)}</button>`).join('')}</div>`).join('')}
          <p class="hint" style="margin:6px 0 0">Se recuerda para los próximos resúmenes (se puede cambiar en Ajustes → Titulares).</p></div>` : ''}
        ${noVerif ? `<p class="hint" style="margin:6px 0 0">${noVerif} movimiento(s) sin saldo para comprobar si son crédito o débito: revise el tipo indicado.</p>` : ''}
        <p class="hint" style="margin:6px 0 0">Asigne cada crédito a su fuente de ingreso. Lo asignado se registra como cobrado o pagado en el mes de su fecha
          y reemplaza al movimiento previsto del mismo concepto. Los débitos se clasifican por cuenta (Consumo, Servicios, Impuestos...)
          y se suman en un gasto por cuenta en el mes. La aplicación recuerda los cambios que haga para los próximos resúmenes.</p>
      </div>
      <div class="chips filtro">
        ${[['creditos', `Ingresos (${cred.length})${sinAsignar ? ' · ' + sinAsignar + ' sin asignar' : ''}`], ['debitos', `Débitos (${deb.length})${sinAsignarDeb ? ' · ' + sinAsignarDeb + ' sin asignar' : ''}`], ['todos', 'Todos']].map(([v, l]) =>
          `<button type="button" class="chip ${filtroExtracto === v ? 'on' : ''}" data-filtro="${v}">${esc(l)}</button>`).join('')}
      </div>
      ${filtroExtracto === 'debitos' && sinAsignarDeb ? `<div class="masivo"><span>Asignar los ${sinAsignarDeb} sin asignar a:</span>
        ${[...db.config.categorias.map(c => ['cat:' + c, c]), ['no', 'No es gasto']].map(([v, l]) => `<button type="button" class="chip" data-masivo="${esc(v)}">${esc(l)}</button>`).join('')}</div>` : ''}
      <div id="items">${visibles.map(({ m, k }) => `
        <div class="item ${m.asignado === 'no' ? 'excluido' : ''}" data-k="${k}">
          <div class="item-cab">
            <div class="info"><div class="name">${esc(m.descripcion)}</div>
              <div class="sub">${fmtFecha(m.fecha)}${m.titular ? ' · ' + esc(m.titular) : ''}${m.existente ? (m.asignado === m.inicial ? ' · ya registrado' : ' · se corregirá') : m.importado ? ' · ya registrado' : ''}${m.verificado ? '' : ' · tipo sin comprobar'}</div></div>
            <b class="${m.tipo === 'credito' ? 'pos' : ''}">${m.tipo === 'credito' ? '+' : '−'}${esc($$(m.monto, monDe(m)))}</b>
            <button type="button" class="icon-btn mini" data-tipo="${k}" aria-label="Cambiar entre crédito y débito" title="Cambiar entre crédito y débito">&#8645;</button>
          </div>
          ${m.tipo === 'credito'
            ? `<div class="cats">${[...ingresos.map(c => [c.id, c.nombre]),
                ...(m.asignado && m.asignado.startsWith('cat:') ? [[m.asignado, 'Devolución (resta de ' + m.asignado.slice(4) + ')']] : [['cat:Consumo', 'Devolución de una compra']]),
                ['no', 'No es ingreso']].map(([v, l]) =>
                `<button type="button" class="${m.asignado === v ? 'on' : ''}" data-asig="${esc(v)}">${esc(l)}</button>`).join('')}</div>`
            : `<select class="field chico ${m.asignado ? '' : 'sin-asignar'}" data-sel="${k}">${opciones(opcionesDebito, m.asignado || '')}</select>`}
        </div>`).join('') || '<p class="hint vacio-lista">Sin movimientos en esta vista.</p>'}</div>
      <div class="barra-guardar"><button class="btn primary" id="x-guardar">Registrar movimientos</button></div>
      <details class="card"><summary>Texto leído del PDF (para revisar)</summary><pre class="texto-pdf">${esc(lineasPDF.map(l => l.texto).join('\n'))}</pre></details>`;
    view.querySelectorAll('[data-filtro]').forEach(b => (b.onclick = () => { filtroExtracto = b.dataset.filtro; pintar(); }));
    view.querySelectorAll('[data-tarjeta] [data-titular]').forEach(b => (b.onclick = () => {
      asignarTarjetaDebito(b.closest('[data-tarjeta]').dataset.tarjeta, b.dataset.titular);
      ext.movimientos.forEach(m => { if (m.tarjetaDebito) m.titular = titularDeTarjeta(m.tarjetaDebito); });
      pintar();
    }));
    view.querySelectorAll('[data-masivo]').forEach(b => (b.onclick = () => {
      ext.movimientos.forEach(m => { if (m.tipo === 'debito' && !m.asignado && !m.importado) m.asignado = b.dataset.masivo; });
      pintar();
    }));
    view.querySelectorAll('[data-asig]').forEach(b => (b.onclick = () => {
      const it = b.closest('.item'); const m = ext.movimientos[it.dataset.k];
      m.asignado = b.dataset.asig;
      it.classList.toggle('excluido', m.asignado === 'no');
      b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    }));
    view.querySelectorAll('[data-sel]').forEach(s => (s.onchange = () => {
      const m = ext.movimientos[s.dataset.sel]; m.asignado = s.value;
      s.closest('.item').classList.toggle('excluido', m.asignado === 'no');
      s.classList.toggle('sin-asignar', !m.asignado);
    }));
    view.querySelectorAll('[data-tipo]').forEach(b => (b.onclick = () => {
      const m = ext.movimientos[b.dataset.tipo];
      m.tipo = m.tipo === 'credito' ? 'debito' : 'credito'; m.sugerido = conceptoSugerido(m); m.asignado = m.sugerido; m.verificado = true; pintar();
    }));
    // Sólo si el resumen no indica la moneda: se aplica a todos los movimientos y al saldo.
    activarSegmentados((_, v) => {
      const ant = ext.moneda; ext.moneda = v;
      ext.movimientos.forEach(m => (m.moneda = v));
      if (ext.saldos[ant]) { ext.saldos = { [v]: ext.saldos[ant] }; }
      pintar();
    });
    if ($('#x-saldo')) $('#x-saldo').onchange = e => (ext.actualizarSaldo = e.target.checked);
    $('#x-guardar').onclick = () => {
      const pendientes = ext.movimientos.filter(m => !m.asignado && !m.importado).length;
      if (pendientes && !confirm(`Hay ${pendientes} movimiento(s) sin asignar: no se registrarán. ¿Continuar?`)) return;
      const r = registrarExtracto(ext);
      save();
      toast(`Registrados: ${r.ingresos} ingreso(s), ${r.egresos} gasto(s)${r.tarjetas ? `, ${r.tarjetas} pago(s) de tarjeta` : ''}${r.corregidos ? ` · ${r.corregidos} corregido(s)` : ''}${r.repetidos ? ` · ${r.repetidos} ya estaban` : ''}.`, 5000);
      mesVista = mesDeFecha(ext.hasta || hoy());
      volver();
    };
  }
  pintar();
}

/* Registra los movimientos asignados. Un movimiento previsto del mismo concepto y mes se completa con el dato real;
   si no hay, se crea uno nuevo. Los débitos asignados a una cuenta se suman en un gasto por mes y cuenta ("Débitos del banco – Consumo"),
   con el detalle en las notas. Los ya importados no se duplican. */
function registrarExtracto(ext) {
  const res = { ingresos: 0, egresos: 0, tarjetas: 0, repetidos: 0, corregidos: 0 };
  // Movimientos registrados antes que el usuario reasignó: se reemplazan por la nueva asignación.
  for (const m of ext.movimientos) {
    if (m.existente && m.asignado !== m.inicial) {
      borrarRegistro('movimientos', m.existente);
      m.importado = false; m.existente = ''; res.corregidos++;
    }
  }
  const refs = refsImportadas();
  const grupos = new Map();
  for (const m of ext.movimientos) {
    const clave = claveMov(m);
    // Se recuerda sólo lo que el usuario cambió respecto de la sugerencia.
    if (clave && m.asignado !== m.sugerido && !m.importado) {
      if (m.asignado) guardarRegistro('reglas', { id: 'banco:' + clave, categoria: m.asignado });
      else if (buscar('reglas', 'banco:' + clave)) borrarRegistro('reglas', 'banco:' + clave);
    }
    if (!m.asignado || m.asignado === 'no' || m.importado) continue;
    const ref = refMovimiento(m);
    if (refs.has(ref) || refs.has(refSimple(m))) { res.repetidos++; continue; }
    const mes = mesDeFecha(m.fecha);
    const moneda = m.moneda || ext.moneda || 'ARS';
    refs.add(ref);
    if (m.asignado === 'tarjeta') {
      // El resumen cuyo pago coincide con el importe y vence cerca de la fecha del débito; se registra la fecha real de pago.
      const candidatos = vigentes('resumenes').filter(r => Math.abs(pagoResumen(r, moneda) - m.monto) < 1 &&
          Math.abs(diasEntre(r.vencimiento || r.fechaPago || m.fecha, m.fecha)) <= 45)
        .sort((a, b) => (a.pagado - b.pagado) || Math.abs(diasEntre(a.vencimiento || m.fecha, m.fecha)) - Math.abs(diasEntre(b.vencimiento || m.fecha, m.fecha)));
      const r = candidatos[0] || resumenesMes(mes).filter(x => !x.pagado).sort((a, b) => Math.abs(pagoResumen(a, moneda) - m.monto) - Math.abs(pagoResumen(b, moneda) - m.monto))[0];
      if (r) { guardarRegistro('resumenes', { ...r, pagado: true, fechaPago: m.fecha, mes }); res.tarjetas++; }
      continue;
    }
    if (m.asignado.startsWith('cat:')) {
      const cat = m.asignado.slice(4), k = mes + '|' + cat + '|' + moneda;
      if (!grupos.has(k)) grupos.set(k, { mes, cat, moneda, items: [] });
      grupos.get(k).items.push({ ...m, ref });
      continue;
    }
    const c = buscar('conceptos', m.asignado);
    if (!c) continue;
    const previsto = movimientosMes(mes).find(x => x.conceptoId === c.id && x.estado !== 'realizado' && !x.ref && !x.agrupado);
    const datos = { monto: m.monto, moneda, fecha: m.fecha, estado: 'realizado', ref, origen: 'banco' };
    if (previsto) guardarRegistro('movimientos', { ...previsto, ...datos });
    else guardarRegistro('movimientos', { id: uid(), mes, conceptoId: c.id, tipo: c.tipo, descripcion: c.eventual ? m.descripcion : '',
      categoria: c.tipo === 'egreso' ? c.categoria : '', notas: 'Del resumen del banco: ' + m.descripcion, ...datos });
    if (c.tipo === 'ingreso') res.ingresos++; else res.egresos++;
  }
  // Gastos por cuenta: se suman a un movimiento agrupado del mes (o se crea uno).
  if (grupos.size && !buscar('conceptos', 'egr-otros')) guardarRegistro('conceptos', { ...CONCEPTOS_BASE.find(c => c.id === 'egr-otros') });
  for (const g of grupos.values()) {
    const moneda = g.moneda;
    const previo = movimientosMes(g.mes).find(x => x.agrupado && x.origen === 'banco' && x.categoria === g.cat && (x.moneda || 'ARS') === moneda);
    const items = g.items.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const firmado = i => (i.tipo === 'credito' ? -i.monto : i.monto);
    const lineas = items.map(i => `${fmtFechaCorta(i.fecha)} ${i.descripcion}${i.titular ? ' (' + i.titular + ')' : ''}: ${fmtMon(firmado(i), moneda, true)}`);
    // Compras con tarjeta de débito por titular (para "Consumos por titular").
    const porTitular = { ...(previo && previo.porTitular || {}) };
    items.filter(i => i.titular).forEach(i => { porTitular[i.titular] = redondear((porTitular[i.titular] || 0) + firmado(i)); });
    const base = previo || { id: uid(), mes: g.mes, conceptoId: 'egr-otros', tipo: 'egreso', descripcion: `Débitos del banco – ${g.cat}`,
      categoria: g.cat, moneda, estado: 'realizado', origen: 'banco', agrupado: true, monto: 0, refs: [], notas: '', cantidad: 0 };
    const fechas = [base.fecha, ...items.map(i => i.fecha)].filter(Boolean).sort();
    guardarRegistro('movimientos', { ...base,
      monto: redondear(num(base.monto) + items.reduce((s, i) => s + firmado(i), 0)),
      fecha: fechas[fechas.length - 1], refs: [...(base.refs || []), ...items.map(i => i.ref)],
      cantidad: num(base.cantidad) + items.length, porTitular,
      notas: [base.notas, ...lineas].filter(Boolean).join('\n') });
    res.egresos += items.length;
  }
  if (ext.actualizarSaldo) {
    for (const mon of MONEDAS) {
      const sd = ext.saldos[mon];
      if (!sd || sd.final == null) continue;
      const fecha = sd.fecha || ext.hasta, mes = mesDeFecha(fecha);
      const [kS, kF] = campoSaldo(mon);
      // No se reemplaza un saldo más reciente del mismo período (por ejemplo, al importar después un resumen anterior).
      const actual = datosMes(mes);
      if (tieneValor(actual[kS]) && actual[kF] && actual[kF] > fecha) continue;
      guardarRegistro('meses', { ...actual, id: mes, [kS]: redondear(sd.final), [kF]: fecha });
    }
  }
  return res;
}

/* Versión 1.5: las reglas guardadas antes registraban "No registrar" para cada débito (era la opción por defecto)
   y "Pago de tarjeta" para compras con tarjeta de débito. Se quitan una sola vez para que vuelva a sugerirse la cuenta. */
function corregirReglasBanco() {
  if (db.config.reglasBancoV15) return false;
  let n = 0;
  for (const r of vigentes('reglas')) {
    if (!r.id.startsWith('banco:')) continue;
    if (r.categoria === 'no' || (r.categoria === 'tarjeta' && /DEBITO/.test(r.id))) { borrarRegistro('reglas', r.id); n++; }
  }
  db.config.reglasBancoV15 = true; db.config.actualizado = ahora();
  return true;
}
