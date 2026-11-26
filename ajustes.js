/* Finanzas Personales – ajustes, conceptos, sincronización con Google Drive e instalación. */
'use strict';

/* ---------- Ajustes ---------- */
function renderAjustes() {
  setHeader('Ajustes', () => irInicio());
  const c = db.config;
  const cidFijo = !!(window.FIN_CONFIG || {}).googleClientId;
  const filaConcepto = x => `<button class="fila-simple" data-con="${esc(x.id)}">
    <span>${esc(x.nombre)}${x.activo ? '' : ' <span class="hint">(inactivo)</span>'}</span>
    <small>${x.montoHabitual !== '' && x.montoHabitual != null ? esc(monto(x.montoHabitual, x.moneda, false)) + ' · ' : ''}${x.eventual ? 'eventual' : 'día ' + esc(x.dia)}${x.tipo === 'egreso' ? ' · ' + esc(x.categoria) : ''}</small></button>`;
  view.innerHTML = `
    <div class="card">
      <div class="row-between"><h2 style="margin:0">Ingresos habituales</h2><button class="btn chico" id="c-ing">+ Agregar</button></div>
      <p class="hint" style="margin:6px 0 4px">Fuentes de ingreso. "Preparar el mes" las agrega como previstas con el monto y el día indicados.</p>
      ${conceptosDe('ingreso').map(filaConcepto).join('')}
    </div>
    <div class="card">
      <div class="row-between"><h2 style="margin:0">Gastos habituales</h2><button class="btn chico" id="c-egr">+ Agregar</button></div>
      <p class="hint" style="margin:6px 0 4px">Gastos fijos que se pagan desde el banco. Las tarjetas se cargan aparte, con su resumen.</p>
      ${conceptosDe('egreso').map(filaConcepto).join('')}
    </div>
    <div class="card" id="c-titulares">
      <h2>Titulares</h2>
      <p class="hint">Para saber quién hizo cada consumo. "Se lo reconoce por" son los textos con que el banco lo nombra en los resúmenes, separados por coma.</p>
      ${titulares().map((t, k) => `<div class="titular" data-k="${k}">
        <div class="grid2">
          <div class="form-row"><label>Nombre</label><input class="field" data-campo="nombre" value="${esc(t.nombre)}" autocomplete="off"></div>
          <div class="form-row"><label>Tarjetas de débito (últimos 4 dígitos)</label><input class="field" data-campo="debito" value="${esc(t.debito)}" inputmode="numeric" autocomplete="off"></div>
        </div>
        <div class="form-row"><label>Se lo reconoce por</label><input class="field" data-campo="claves" value="${esc(t.claves)}" autocomplete="off"></div>
      </div>`).join('')}
      <button class="btn" id="c-guardar-tit" type="button">Guardar titulares</button>
    </div>
    <div class="card">
      <h2>Cuentas de gasto</h2>
      <p class="hint">Cada gasto y cada consumo de tarjeta se asigna a una de estas cuentas.</p>
      <div class="chips">${c.categorias.map(x => `<button type="button" class="chip" data-quitar="${esc(x)}" title="Quitar">${esc(x)} ✕</button>`).join('')}</div>
      <div class="agregar-linea"><input class="field" id="c-nueva-cat" placeholder="Nueva cuenta" autocomplete="off"><button class="btn" id="c-add-cat" type="button">Agregar</button></div>
    </div>

    <form class="card" id="fcfg" novalidate>
      <h2>Período de cada mes</h2>
      <div class="form-row"><label for="c-cierre">Día de cierre del mes</label>
        <input class="field" id="c-cierre" type="number" inputmode="numeric" min="0" max="28" value="${esc(diaCierre())}">
        <p class="hint" style="margin:6px 0 0">Con 20, "Noviembre" va del 21/10 al 20/11, igual que el resumen del banco: el sueldo de fin de mes queda junto con los gastos que cubre. Con 0 se usan meses calendario.</p></div>
      <h2 style="margin-top:8px">Ahorro e inversiones</h2>
      <div class="form-row"><label for="c-res">Reserva mínima en el banco</label>${campoMonto('c-res', c.reserva)}
        <p class="hint" style="margin:6px 0 0">Dinero que siempre debe quedar en la cuenta. El remanente para ahorrar se calcula por encima de este monto.</p></div>
      <div class="grid2">
        <div class="form-row"><label for="c-meses">Fondo de emergencia (meses de gastos)</label>
          <input class="field" id="c-meses" type="number" inputmode="numeric" min="0" max="24" value="${esc(c.mesesEmergencia)}"></div>
        <div class="form-row"><label for="c-perfil">Perfil de inversión</label>
          <select class="field" id="c-perfil">${opciones(Object.entries(PERFILES).map(([k, p]) => [k, p.nombre]), c.perfil)}</select></div>
        <div class="form-row"><label for="c-min">Monto mínimo para invertir</label>${campoMonto('c-min', c.montoMinimo)}</div>
        <div class="form-row"><label for="c-minb">Mínimo para acciones o CEDEARs</label>${campoMonto('c-minb', c.montoMinimoBolsa)}</div>
      </div>
      <h2 style="margin-top:8px">Tasas vigentes</h2>
      <p class="hint">Cárguelas cada tanto: se usan para comparar el plazo fijo con la inflación y estimar intereses.</p>
      <div class="grid2">
        <div class="form-row"><label for="c-tpf">Plazo fijo: TNA (%)</label>${campoMonto('c-tpf', c.tnaPlazoFijo)}</div>
        <div class="form-row"><label for="c-tmm">Cuenta remunerada: TNA (%)</label>${campoMonto('c-tmm', c.tnaMoneyMarket)}</div>
        <div class="form-row"><label for="c-inf">Inflación mensual esperada (%)</label>${campoMonto('c-inf', c.inflacionMensual)}</div>
      </div>
      <div class="error" id="c-err"></div>
      <button class="btn primary" type="submit">Guardar</button>
    </form>

    <div class="card">
      <h2>Google Drive</h2>
      <p class="hint">Sincroniza los datos entre el iPhone, la Mac y la computadora con Linux, y guarda un respaldo diario en la carpeta <b>Finanzas familiares</b> de su Drive. La aplicación sólo puede ver los archivos que ella misma crea.</p>
      ${cidFijo ? '' : `<div class="form-row"><label for="c-cid">ID de cliente de Google</label>
        <input class="field" id="c-cid" value="${esc(local.clientId)}" placeholder="xxxxxxxx.apps.googleusercontent.com" autocomplete="off"></div>`}
      <p class="hint">${local.driveConectado
        ? `Conectado${local.cuenta ? ` como <b>${esc(local.cuenta)}</b>` : ''}. Última sincronización: ${local.ultimaSync ? new Date(local.ultimaSync).toLocaleString('es-AR') : '—'}.`
        : 'No conectado.'}</p>
      <p id="sync-estado" class="sync-estado${ultimoEstadoSync.error ? ' error' : ''}${ultimoEstadoSync.texto ? '' : ' vacio'}" role="status">${esc(ultimoEstadoSync.texto)}</p>
      <div class="actions">
        <button class="btn primary" id="c-sync">${local.driveConectado ? 'Sincronizar ahora' : 'Conectar Google Drive'}</button>
        ${local.driveConectado ? '<button class="btn danger" id="c-desc">Desconectar</button>' : '<button class="btn" id="c-popup">Conectar con ventana</button>'}
      </div>
      ${local.driveConectado ? `<button class="btn" id="c-cuenta">Cambiar de cuenta de Google</button>
        <p class="hint" style="margin-top:8px">${local.redireccionOk
          ? 'Conexión automática activa: el permiso de Google dura 1 hora y, al vencer, la aplicación lo renueva sola al abrirse.'
          : 'Para activar la conexión automática, toque la nube de la barra superior una vez (la aplicación pasa por Google y vuelve).'}</p>`
        : `<p class="hint">"Conectar Google Drive" pasa por la página de Google y vuelve; así la conexión queda automática en adelante.
        Requiere <b>${esc(direccionRetorno())}</b> en "URI de redireccionamiento autorizados" del ID de cliente en Google Cloud.
        "Conectar con ventana" usa una ventana emergente y no renueva el permiso automáticamente.</p>`}
    </div>

    <div class="card">
      <h2>Abrir en otros dispositivos</h2>
      <p class="hint">Finanzas Personales se usa desde el navegador (Chrome), sin instalar. En cada dispositivo abra esta dirección y guárdela en favoritos:</p>
      <p class="value"><b>${esc(direccionRetorno().replace(/index\.html$/, ''))}</b></p>
      <button class="btn" id="c-copiar" type="button">Copiar dirección</button>
    </div>

    <div class="card">
      <h2>Acerca de</h2>
      <p class="value" style="margin-top:0">Finanzas Personales · <b>versión ${esc(self.FIN_VERSION)}</b>
        <span class="hint">(${fmtFecha((self.FIN_NOVEDADES[0] || {}).fecha)})</span></p>
      <details class="novedades"><summary>Historial de versiones</summary>
        ${self.FIN_NOVEDADES.map(n => `<div class="visit"><div class="meta"><span>Versión ${esc(n.v)}</span><span class="hint">${fmtFecha(n.fecha)}</span></div>
          <ul>${n.cambios.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('')}
      </details>
    </div>

    <div class="card">
      <h2>Copia de seguridad manual</h2>
      <p class="hint">Archivo con todos los datos, para guardar o pasar a otro equipo.</p>
      <div class="actions">
        <button class="btn" id="exp">Exportar copia</button>
        <label class="btn" for="imp">Importar copia</label>
      </div>
      <input type="file" id="imp" accept="application/json,.json" hidden>
    </div>`;

  $('#c-guardar-tit').onclick = () => {
    db.config.titulares = [...view.querySelectorAll('.titular')].map((caja, k) => {
      const v = campo => caja.querySelector(`[data-campo="${campo}"]`).value.trim();
      return { ...(titulares()[k] || { id: uid() }), nombre: v('nombre'), debito: v('debito').replace(/[^\d,\s]/g, ''), claves: v('claves') };
    }).filter(t => t.nombre);
    db.config.actualizado = ahora(); save(); toast('Titulares guardados.');
  };
  $('#c-ing').onclick = () => renderConcepto(null, 'ingreso');
  $('#c-egr').onclick = () => renderConcepto(null, 'egreso');
  view.querySelectorAll('[data-con]').forEach(b => (b.onclick = () => renderConcepto(b.dataset.con)));
  view.querySelectorAll('[data-quitar]').forEach(b => (b.onclick = () => {
    const cat = b.dataset.quitar;
    if (c.categorias.length <= 1) return;
    if (!confirm(`¿Quitar la cuenta "${cat}"? Los gastos ya asignados conservan el nombre.`)) return;
    c.categorias = c.categorias.filter(x => x !== cat); c.actualizado = ahora(); save(); renderAjustes();
  }));
  $('#c-add-cat').onclick = () => {
    const n = $('#c-nueva-cat').value.trim();
    if (!n || c.categorias.includes(n)) return;
    c.categorias = [...c.categorias, n]; c.actualizado = ahora(); save(); renderAjustes();
  };
  $('#fcfg').onsubmit = e => {
    e.preventDefault();
    const v = { reserva: leerMonto('c-res'), montoMinimo: leerMonto('c-min'), montoMinimoBolsa: leerMonto('c-minb'),
      tnaPlazoFijo: leerMonto('c-tpf'), tnaMoneyMarket: leerMonto('c-tmm'), inflacionMensual: leerMonto('c-inf') };
    if (Object.values(v).some(x => Number.isNaN(x))) { $('#c-err').textContent = 'Revise los valores numéricos.'; return; }
    const tasasCambiaron = ['tnaPlazoFijo', 'tnaMoneyMarket', 'inflacionMensual'].some(k => num(v[k]) !== num(c[k]));
    Object.keys(v).forEach(k => (c[k] = num(v[k])));
    c.mesesEmergencia = Math.max(0, parseInt($('#c-meses').value, 10) || 0);
    c.perfil = $('#c-perfil').value;
    const cierre = Math.min(28, Math.max(0, parseInt($('#c-cierre').value, 10) || 0));
    const cambioCierre = cierre !== diaCierre();
    c.diaCierre = cierre;
    if (cambioCierre) { reubicarEnPeriodos(); mesVista = mesActual(); mesTarjetas = mesActual(); }
    if (tasasCambiaron) c.fechaTasas = hoy();
    c.actualizado = ahora();
    save(); toast('Ajustes guardados.'); irInicio();
  };
  $('#c-sync').onclick = async () => {
    if ($('#c-cid')) { local.clientId = $('#c-cid').value.trim(); guardarLocal(); }
    if (!clientId()) { toast('Primero ingrese el ID de cliente de Google.'); return; }
    if (!local.driveConectado || !Drive.tieneToken()) { conectarPorRedireccion(); return; }
    refrescarVista = renderAjustes;
    await sincronizar(true);
    refrescarVista = irInicio;
    renderAjustes();
  };
  if ($('#c-popup')) $('#c-popup').onclick = async () => {
    refrescarVista = renderAjustes;
    await sincronizar(true);
    refrescarVista = irInicio;
    renderAjustes();
  };
  if ($('#c-cuenta')) $('#c-cuenta').onclick = () => {
    Drive.olvidarToken();
    conectarPorRedireccion({ elegirCuenta: true });
  };
  if ($('#c-desc')) $('#c-desc').onclick = () => {
    if (!confirm('¿Desconectar Google Drive en este dispositivo? Los datos locales y los de Drive se conservan.')) return;
    Drive.desconectar(); Object.assign(local, { driveConectado: false, pendiente: false, cuenta: '' }); guardarLocal(); pintarNube(); renderAjustes();
  };
  $('#c-copiar').onclick = async () => {
    try { await navigator.clipboard.writeText(direccionRetorno().replace(/index\.html$/, '')); toast('Dirección copiada.'); }
    catch (_) { toast('No se pudo copiar. Mantenga presionada la dirección para copiarla.'); }
  };
  $('#exp').onclick = () => descargar(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }), `finanzas-respaldo-${hoy()}.json`);
  $('#imp').onchange = async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.movimientos)) throw new Error();
      if (!confirm(`El archivo contiene ${d.movimientos.filter(m => !m.borrado).length} movimiento(s) y ${(d.resumenes || []).filter(r => !r.borrado).length} resumen(es) de tarjeta. Se combinará con los datos actuales. ¿Continuar?`)) return;
      db = combinar(db, d);
      save(); toast('Copia importada.'); irInicio();
    } catch (_) { toast('El archivo no es una copia válida.'); }
  };
}

function renderConcepto(id, tipoNuevo) {
  const c0 = id ? buscar('conceptos', id) : null;
  const tipo = c0 ? c0.tipo : tipoNuevo;
  const x = c0 ? { ...c0 } : { id: uid(), tipo, nombre: '', grupo: '', categoria: tipo === 'egreso' ? 'Consumo' : '', montoHabitual: '', moneda: 'ARS', dia: 1, activo: true, eventual: false, orden: 50 };
  const grupos = [...new Set(conceptosDe('ingreso').map(c => c.grupo).filter(Boolean))];
  setHeader(c0 ? x.nombre : tipo === 'ingreso' ? 'Nuevo ingreso habitual' : 'Nuevo gasto habitual', renderAjustes);
  view.innerHTML = `
    <form class="card" id="fedit" novalidate>
      <div class="form-row"><label for="k-nombre">Nombre</label><input class="field" id="k-nombre" value="${esc(x.nombre)}" autocomplete="off"><div class="error" id="err-nombre"></div></div>
      ${tipo === 'ingreso'
        ? `<div class="form-row"><label for="k-grupo">Grupo</label><input class="field" id="k-grupo" value="${esc(x.grupo)}" list="k-grupos" autocomplete="off">
            <datalist id="k-grupos">${grupos.map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>`
        : `<div class="form-row"><label for="k-cat">Cuenta</label><select class="field" id="k-cat">${opciones(db.config.categorias, x.categoria)}</select></div>`}
      <div class="grid2">
        <div class="form-row"><label for="k-monto">Monto habitual</label>${campoMonto('k-monto', x.montoHabitual)}</div>
        <div class="form-row"><label for="k-mon">Moneda</label><select class="field" id="k-mon">${opciones([['ARS', 'Pesos'], ['USD', 'Dólares']], x.moneda)}</select></div>
        <div class="form-row"><label for="k-dia">Día del mes</label><input class="field" id="k-dia" type="number" inputmode="numeric" min="1" max="31" value="${esc(x.dia)}"></div>
      </div>
      <p class="hint">Si el monto habitual queda vacío, al preparar el mes se usa el monto del mes anterior.</p>
      <label class="check"><input type="checkbox" id="k-activo" ${x.activo ? 'checked' : ''}> Activo</label>
      <label class="check"><input type="checkbox" id="k-event" ${x.eventual ? 'checked' : ''}> Eventual (no se agrega solo al preparar el mes)</label>
      <button class="btn primary" type="submit" style="margin-top:8px">Guardar</button>
      ${c0 ? '<button class="btn danger" type="button" id="k-borrar" style="margin-top:10px">Eliminar</button>' : ''}
    </form>`;
  $('#fedit').onsubmit = e => {
    e.preventDefault();
    const nombre = $('#k-nombre').value.trim();
    if (!nombre) { $('#err-nombre').textContent = 'Ingrese el nombre.'; return; }
    const m = leerMonto('k-monto');
    guardarRegistro('conceptos', { ...x, nombre, grupo: $('#k-grupo') ? $('#k-grupo').value.trim() : '', categoria: $('#k-cat') ? $('#k-cat').value : '',
      montoHabitual: Number.isNaN(m) ? '' : m, moneda: $('#k-mon').value, dia: Math.min(31, Math.max(1, parseInt($('#k-dia').value, 10) || 1)),
      activo: $('#k-activo').checked, eventual: $('#k-event').checked });
    save(); toast('Guardado.'); renderAjustes();
  };
  if ($('#k-borrar')) $('#k-borrar').onclick = () => {
    if (!confirm('¿Eliminar este concepto? Los movimientos ya cargados se conservan. Para dejar de usarlo sin perder el nombre, conviene desmarcar "Activo".')) return;
    borrarRegistro('conceptos', x.id); save(); renderAjustes();
  };
}

/* ---------- Sincronización con Google Drive ---------- */
const clientId = () => (window.FIN_CONFIG || {}).googleClientId || local.clientId;
let syncTimer = null, sincronizando = false;
function programarSync() {
  clearTimeout(syncTimer);
  if (Drive.tieneToken()) syncTimer = setTimeout(() => sincronizar(false), 2000);
}
async function sincronizar(interactivo, opciones = {}) {
  if (sincronizando) return;
  if (!navigator.onLine) { if (interactivo) toast('Sin conexión. Se sincronizará más tarde.'); return; }
  sincronizando = true; pintarNube();
  try {
    if (!Drive.tieneToken()) {
      if (!interactivo) return;
      estadoSync('Esperando la autorización en la ventana de Google…');
      await Drive.autorizar(clientId(), { consentimiento: !local.driveConectado && !local.cuenta, cuenta: local.cuenta, elegirCuenta: !!opciones.elegirCuenta });
      estadoSync('Autorización recibida.');
    }
    const respaldo = local.ultimoRespaldo !== hoy() ? hoy() : null;
    const inicio = ahora();
    const datos = await Drive.sincronizar(db, async (loc, remoto) => combinar(loc, remoto), respaldo, estadoSync);
    db = normalizar(datos);
    escribir(STORAGE_KEY, db);
    Object.assign(local, { driveConectado: true, ultimaSync: inicio, pendiente: false });
    if (!local.cuenta || opciones.elegirCuenta) { try { local.cuenta = await Drive.cuenta(); } catch (_) { /* se intentará la próxima vez */ } }
    if (respaldo) local.ultimoRespaldo = respaldo;
    guardarLocal();
    estadoSync('');
    if (interactivo) toast('Datos sincronizados con Google Drive.');
    // No se redibuja la pantalla si el usuario está completando un formulario.
    if (!$('#fedit') && !$('#fres') && !document.querySelector('.modal-capa')) refrescarVista();
  } catch (e) {
    const msg = e.message || 'No se pudo sincronizar.';
    estadoSync(msg, true);
    if (interactivo) toast(msg, 8000);
  } finally {
    sincronizando = false; pintarNube();
  }
}
let refrescarVista = () => irInicio();

const direccionRetorno = () => new URL('index.html', location.href.split('#')[0].split('?')[0]).href;
/* Conexión por redirección: la página va a Google y Google la devuelve con el permiso (#access_token=…).
   Con silencioso, Google no muestra nada si la sesión sigue abierta; así el permiso se renueva solo al abrir la aplicación. */
const CLAVE_OAUTH = 'finanzas-oauth-estado';
function conectarPorRedireccion(op = {}) {
  if (!clientId()) { toast('Primero ingrese el ID de cliente de Google.'); return; }
  const pedido = { estado: uid(), silencioso: !!op.silencioso, seccion, t: Date.now() };
  // Se guarda también en localStorage: en algunas aplicaciones instaladas sessionStorage no sobrevive al paso por Google.
  try { sessionStorage.setItem(CLAVE_OAUTH, JSON.stringify(pedido)); } catch (_) { /* sin almacenamiento */ }
  try { localStorage.setItem(CLAVE_OAUTH, JSON.stringify(pedido)); } catch (_) { /* sin almacenamiento */ }
  location.href = Drive.urlRedireccion(clientId(), direccionRetorno(), pedido.estado, op.elegirCuenta ? '' : local.cuenta, pedido.silencioso);
}
function leerPedidoOAuth() {
  for (const almacen of [() => sessionStorage, () => localStorage]) {
    try { const p = JSON.parse(almacen().getItem(CLAVE_OAUTH)); if (p && p.estado) return p; } catch (_) { /* sin datos */ }
  }
  return null;
}
function procesarRetornoGoogle() {
  const pedido = leerPedidoOAuth() || {};
  const r = Drive.leerRedireccion(location.hash, pedido.estado || '');
  if (!r) return false;
  try { sessionStorage.removeItem(CLAVE_OAUTH); localStorage.removeItem(CLAVE_OAUTH); } catch (_) { /* sin almacenamiento */ }
  history.replaceState(null, '', location.pathname + location.search);
  if (pedido.silencioso) {
    if (pedido.seccion && PANTALLAS[pedido.seccion]) seccion = pedido.seccion;
    if (r.error) {
      // Google necesita que el usuario intervenga (por ejemplo, volver a ingresar la contraseña): no se reintenta solo por un rato.
      local.autoFallo = Date.now(); guardarLocal();
      estadoSync('Toque la nube de la barra superior para reconectar Google Drive.', true);
      irInicio();
      return true;
    }
    Object.assign(local, { redireccionOk: true, autoFallo: 0 }); guardarLocal();
    irInicio();
    sincronizar(false);
    return true;
  }
  renderAjustes();
  if (r.error) { estadoSync(r.error, true); toast(r.error, 8000); return true; }
  Object.assign(local, { redireccionOk: true, autoFallo: 0 }); guardarLocal();
  refrescarVista = renderAjustes;
  sincronizar(true).then(() => { refrescarVista = irInicio; renderAjustes(); });
  return true;
}

/* Renueva el permiso de Google sin intervención si venció. Devuelve true si la página se va a Google.
   Sólo si ya hubo una conexión por redirección exitosa (eso confirma que la dirección de retorno está autorizada). */
function renovarAutomatico() {
  if (!local.driveConectado || !local.redireccionOk || Drive.tieneToken() || !navigator.onLine || !clientId()) return false;
  if (local.autoFallo && Date.now() - local.autoFallo < 30 * 60000) return false;
  if ($('#fedit') || $('#fres') || document.querySelector('.modal-capa')) return false; // no interrumpir un formulario
  const previo = leerPedidoOAuth();
  if (previo && Date.now() - previo.t < 60000) return false; // evita repetir si el regreso de Google falló
  conectarPorRedireccion({ silencioso: true });
  return true;
}
// Botón de la nube: si el permiso venció, reconecta pasando por Google; si no, sincroniza.
function tocarNube() {
  if (!Drive.tieneToken() && navigator.onLine) { conectarPorRedireccion(); return; }
  sincronizar(true);
}
window.addEventListener('drive-token', () => {
  refrescarVista = $('#sync-estado') ? renderAjustes : irInicio;
  sincronizar(true).then(() => { refrescarVista = irInicio; });
});
window.addEventListener('drive-error', e => { estadoSync(e.detail, true); toast(e.detail, 8000); });

let ultimoEstadoSync = { texto: '', error: false };
function estadoSync(texto, error = false) {
  ultimoEstadoSync = { texto, error };
  const el = $('#sync-estado');
  if (el) { el.textContent = texto; el.className = 'sync-estado' + (error ? ' error' : '') + (texto ? '' : ' vacio'); }
}
function pintarNube() {
  const b = $('#btn-sync');
  if (!local.driveConectado) { b.hidden = true; return; }
  b.hidden = false;
  b.classList.toggle('girando', sincronizando);
  b.dataset.estado = local.pendiente ? 'pendiente' : Drive.tieneToken() ? 'ok' : 'inactivo';
  b.title = local.pendiente ? 'Hay cambios sin sincronizar. Toque para sincronizar.' :
    `Última sincronización: ${local.ultimaSync ? new Date(local.ultimaSync).toLocaleString('es-AR') : '—'}`;
}
