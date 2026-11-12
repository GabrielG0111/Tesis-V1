/* Interfaz: controles de la sesión, panel del equipo seleccionado (con su anatomía)
 * y pestañas de resultados. */
(() => {
  const $ = (s) => document.querySelector(s);
  const f = Pruebas.f;
  Escena.iniciar($('#vista'));

  const condiciones = () => ({
    franja: $('#franja').value, punto: $('#punto').value, medio: $('#medio').value, destino: $('#destino').value,
    psm: $('#psm').checked, icmpFiltrado: $('#icmpfiltrado').checked, quic: $('#quic').checked,
  });

  /* ---------- pestañas ---------- */
  function pestana(id) {
    document.querySelectorAll('#pestanas button').forEach((b) => b.classList.toggle('activo', b.dataset.tab === id));
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('activo', t.id === 'tab-' + id));
  }
  document.querySelectorAll('#pestanas button[data-tab]').forEach((b) => b.addEventListener('click', () => {
    pestana(b.dataset.tab);
    if ($('#panel-resultados').classList.contains('plegado')) plegar();
  }));
  function plegar() {
    const p = $('#panel-resultados');
    p.classList.toggle('plegado');
    $('#plegar').textContent = p.classList.contains('plegado') ? '▴ Desplegar' : '▾ Plegar';
    Escena.redimensionar();
  }
  $('#plegar').addEventListener('click', plegar);

  /* ---------- salida de las pruebas ---------- */
  const salida = {
    estado(txt) { const e = $('#estado'); e.style.display = txt ? 'block' : 'none'; if (txt) e.textContent = txt; },
    resultados(html) { $('#tab-res').innerHTML = html; pestana('res'); },
    captura(tramas) {
      const c = condiciones();
      let t = 0;
      const filas = tramas.map((x, i) => { t += Math.random() * 0.03 + 0.001; return `<tr><td class="num">${i + 1}</td><td class="num">${t.toFixed(6)}</td><td>${x[1]}</td><td>${x[2]}</td><td>${x[0]}</td><td>${x[3]}</td></tr>`; }).join('');
      $('#tab-cap').innerHTML = `<p class="nota">Interfaz <b>${c.medio === 'wifi' ? 'wlp2s0' : 'enp1s0'}</b> · sin modo promiscuo (tcpdump <code>-p</code>) · filtro de captura <code>host 10.20.34.57</code> · solo tráfico propio.</p>
        <table><tr><th class="num">No.</th><th class="num">Tiempo</th><th>Origen</th><th>Destino</th><th>Protocolo</th><th>Información</th></tr>${filas}</table>`;
    },
    wifi(w, c) {
      if (!w) {
        $('#tab-wifi').innerHTML = '<p><b>Cable de control (enp1s0, 1000BASE-T).</b> No hay indicadores de radio. Compare el RTT y el goodput con una sesión Wi-Fi en el mismo destino y franja: la diferencia aproxima la contribución del tramo inalámbrico.</p>';
        return;
      }
      const reintentos = Math.round(w.reint * 18000);
      const ins = (ok, aviso) => ok ? 'ok' : (aviso ? 'aviso' : 'mal');
      $('#tab-wifi').innerHTML = `<div class="columnas"><table>
        <tr><th>Indicador (registrado en el cliente)</th><th class="num">Valor</th><th></th></tr>
        <tr><td>Intensidad de señal (RSSI)</td><td class="num">${w.rssi} dBm</td><td><span class="insignia ${ins(w.rssi >= -67, w.rssi >= -75)}">${w.rssi >= -67 ? 'Buena' : w.rssi >= -75 ? 'Aceptable' : 'Débil'}</span></td></tr>
        <tr><td>Ruido del canal</td><td class="num">${w.ruido} dBm</td><td></td></tr>
        <tr><td>Relación señal-ruido (SNR)</td><td class="num">${w.snr} dB</td><td><span class="insignia ${ins(w.snr >= 25, w.snr >= 20)}">${w.snr >= 25 ? 'Holgada' : w.snr >= 20 ? 'Justa' : 'Baja'}</span></td></tr>
        <tr><td>Canal y ancho de canal</td><td class="num">${w.canal} (5180 MHz), ${w.ancho} MHz</td><td>${w.banda}</td></tr>
        <tr><td>MCS negociado</td><td class="num">VHT-MCS ${w.mcs}, 2 flujos</td><td></td></tr>
        <tr><td>Tasa nominal de capa física</td><td class="num">${f(w.phy, 1)} Mbit/s</td><td>${w.estandar}</td></tr>
        <tr><td>Capacidad útil estimada</td><td class="num">${f(w.capacidad, 0)} Mbit/s</td><td>${f(w.capacidad / w.phy * 100, 0)} % de la nominal</td></tr>
        <tr><td>Tasa de reintentos</td><td class="num">${f(w.reint * 100, 1)} %</td><td><span class="insignia ${ins(w.reint < 0.1, w.reint < 0.2)}">${w.reint < 0.1 ? 'Baja' : w.reint < 0.2 ? 'Moderada' : 'Alta'}</span></td></tr>
        <tr><td>Utilización del canal (contienda)</td><td class="num">${f(w.util * 100, 0)} %</td><td>${c.franja === 'alta' ? 'franja de alta ocupación' : 'franja de baja ocupación'}</td></tr>
        <tr><td>Ahorro de energía</td><td class="num">${c.psm ? 'activado' : 'desactivado'}</td><td><span class="insignia ${c.psm ? 'mal' : 'ok'}">${c.psm ? 'Infla el RTT' : 'Correcto para medir'}</span></td></tr>
      </table>
      <pre>$ iw dev wlp2s0 station dump
Station 3c:84:6a:1f:20:b4 (on wlp2s0)
	signal:  	${w.rssi} [${w.rssi - 1}, ${w.rssi + 2}] dBm
	tx bitrate:	${f(w.phy, 1).replace(',', '.')} MBit/s VHT-MCS ${w.mcs} 80MHz short GI VHT-NSS 2
	tx packets:	180000
	tx retries:	${reintentos}
	tx failed:	${Math.round(reintentos * 0.004)}
$ iw dev wlp2s0 survey dump | grep -A1 "in use"
	frequency:	5180 MHz [in use]
	noise:		${w.ruido} dBm
$ iw dev wlp2s0 get power_save
Power save: ${c.psm ? 'on' : 'off'}</pre></div>
      <p class="nota">En GNU/Linux, <code>wavemon</code> muestra los mismos indicadores en tiempo real durante la sesión. En Windows, <code>netsh wlan show interfaces</code> ofrece un conjunto más reducido (calidad de señal en %, canal y tasas); la disponibilidad de cada indicador debe verificarse con el adaptador concreto.</p>`;
    },
    y1541() {
      const sesiones = Object.values(Pruebas.historial).filter((m) => m.rttMedia !== undefined);
      if (!sesiones.length) return;
      const veredicto = (r) => {
        const v = [r.iptd, r.ipdv, r.iplr];
        if (v.some((x) => x[1] === 'mal')) return ['No cumple', 'mal'];
        if (v.some((x) => x[1] === 'aviso')) return ['No concluyente', 'aviso'];
        return ['Cumple', 'ok'];
      };
      const filas = sesiones.map((m) => {
        const ev = Pruebas.evaluarY1541(m);
        const celdas = ev.map((r) => { const [t, k] = veredicto(r); return `<td title="IPTD: ${r.iptd[0]} · IPDV: ${r.ipdv[0]} · IPLR: ${r.iplr[0]}"><span class="insignia ${k}">${t}</span></td>`; }).join('');
        return `<tr><td>${m.hora}</td><td>${m.prueba}</td><td>${m.c.destino === 'publico' ? 'Público' : 'Interno'}</td><td>${m.c.franja}</td><td>${m.c.medio === 'wifi' ? m.c.punto : 'cable'}${m.c.psm ? ' · PSM' : ''}</td>
          <td class="num">${f(m.rttMedia, 1)}</td><td class="num">${m.ipdv === null ? '—' : f(m.ipdv, 1)}</td><td class="num">${m.iplr === null ? '—' : f(m.iplr * 100, 2) + ' %'}</td><td class="num">${m.n}</td>${celdas}</tr>`;
      }).join('');
      $('#tab-y1541').innerHTML = `<table><tr><th>Hora</th><th>Prueba</th><th>Destino</th><th>Franja</th><th>Punto</th><th class="num">RTT medio (ms)</th><th class="num">IPDV (ms)</th><th class="num">IPLR</th><th class="num">n</th>
        <th>Clase 0</th><th>Clase 1</th><th>Clase 2</th><th>Clase 3</th><th>Clase 4</th></tr>${filas}</table>
        <p class="nota">Parámetros definidos en ITU-T Y.1540 (IPTD, IPDV, IPLR); objetivos por clase de ITU-T Y.1541. Contraste conservador: el RTT acota por exceso el retardo en un sentido, así que un RTT bajo el umbral de IPTD garantiza el cumplimiento y uno por encima es «no concluyente». IPDV = cuantil 1−10⁻³ menos el mínimo, y exige n ≥ 1000. Los resultados se separan por tipo de destino: frente al servidor público, la ruta incluye redes externas. Pase el cursor sobre cada celda para ver el detalle.</p>`;
    },
  };

  /* ---------- controles ---------- */
  const desc = () => { $('#desc-escenario').textContent = Pruebas.ESCENARIOS[$('#escenario').value].desc; };
  $('#escenario').addEventListener('change', desc); desc();
  $('#ejecutar').addEventListener('click', () => Pruebas.ejecutar($('#escenario').value, condiciones(), salida));
  $('#detener').addEventListener('click', () => { Pruebas.detener(); salida.estado(null); });
  $('#velocidad').addEventListener('input', (e) => { Pruebas.velocidad = parseFloat(e.target.value); });
  $('#punto').addEventListener('change', (e) => { Escena.moverPortatil(e.target.value); salida.wifi(condiciones().medio === 'wifi' ? Red.wifi(condiciones()) : null, condiciones()); });
  $('#medio').addEventListener('change', (e) => { Escena.medio(e.target.value); salida.wifi(e.target.value === 'wifi' ? Red.wifi(condiciones()) : null, condiciones()); });
  ['#franja', '#psm'].forEach((s) => $(s).addEventListener('change', () => { const c = condiciones(); salida.wifi(c.medio === 'wifi' ? Red.wifi(c) : null, c); }));
  $('#ver-etiquetas').addEventListener('change', (e) => Escena.verEtiquetas(e.target.checked));
  $('#ver-gestion').addEventListener('change', (e) => Escena.mostrarGestion(e.target.checked));
  document.querySelectorAll('#camaras button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('#camaras button').forEach((x) => x.classList.toggle('activo', x === b));
    if (Escena.anatomiaActiva) alternarDespiece3D();
    Escena.camaraPreset(b.dataset.cam);
  }));

  /* ---------- panel del equipo ---------- */
  Escena.alSeleccionar = (id, parteTocada) => {
    const g = Escena.equipos[id], info = Red.INFO[id] || {};
    const [plano, clase] = Red.PLANO[info.plano] || ['—', ''];
    $('#info-titulo').textContent = g.userData.nombre;
    $('#info-rol').textContent = info.rol || '';
    $('#info-datos').innerHTML = `<table>
      <tr><td>Plano</td><td><span class="insignia ${clase}">${plano}</span></td></tr>
      <tr><td>Dirección IP</td><td>${info.ip || '—'}</td></tr>
      <tr><td>Capa</td><td>${info.capa || '—'}</td></tr>
      <tr><td>Interfaces</td><td>${info.ifaces || '—'}</td></tr>
      <tr><td>Visible en mtr</td><td>${info.salto ? 'Sí (salto IP)' : 'No'}</td></tr></table>`;
    $('#info-partes').innerHTML = g.userData.partes.map((p) => `<li${p.nombre === parteTocada ? ' style="background:#16324a"' : ''}><b>${p.nombre}.</b> ${p.desc}</li>`).join('');
    const figura = window.ANATOMIA && ANATOMIA.equipos[id];
    $('#anatomia').disabled = !figura && g.userData.partes.length < 2;
    $('#despiece3d').disabled = g.userData.partes.length < 2;
    $('#despiece3d').textContent = 'Despiece 3D';
  };

  /* ---------- anatomía: figura de la skill anatomy en una capa sobre la escena ---------- */
  let figuraViva = null;
  function datosVivos(fid) {
    const c = condiciones(), w = Red.wifi(c);
    const punto = { cerca: 'P1', medio: 'P2', lejos: 'P3' }[c.punto];
    if (fid === 'portatil') return { wifi: `tarjeta Wi-Fi 2×2 · en ${punto} recibe ${w.rssi} dBm · MCS ${w.mcs} · ${w.phy} Mbit/s de PHY` };
    if (fid === 'ap') return { radio5: `radio de 5 GHz · canal 36, 80 MHz · ocupación ${Math.round(w.util * 100)} % · reintentos ${Math.round(w.reint * 100)} %` };
    return {};
  }
  function abrirAnatomia(id) {
    const fid = window.ANATOMIA && ANATOMIA.equipos[id];
    if (!fid) { alternarDespiece3D(); return; }
    cerrarAnatomia();
    const fig = ANATOMIA.figuras[fid];
    $('#anatomia-figura').innerHTML = fig.html;
    $('#capa-equipo').textContent = Escena.equipos[id].userData.nombre;
    const plano = (Red.INFO[id] || {}).plano;
    $('#capa-nota').textContent = ['infra', 'proveedor', 'gestion'].includes(plano)
      ? 'Ilustración didáctica: el trabajo no accede a este equipo ni lo diagnostica; su efecto solo se infiere desde el extremo.' : '';
    $('#capa-anatomia').hidden = false;
    figuraViva = Anatomia.montar($('#anatomia-figura .an-fig'), fig.datos, { dice: datosVivos(fid), despiezado: true, esperaInicial: 0.8 });
    $('#anatomia-figura .an-escenario').focus({ preventScroll: true });
  }
  function cerrarAnatomia() {
    if (figuraViva) { figuraViva.destruir(); figuraViva = null; }
    $('#capa-anatomia').hidden = true;
    $('#anatomia-figura').innerHTML = '';
  }
  function alternarDespiece3D() {
    const activa = !Escena.anatomiaActiva;
    Escena.anatomiaVista(activa);
    $('#despiece3d').textContent = activa ? 'Cerrar despiece' : 'Despiece 3D';
  }
  $('#anatomia').addEventListener('click', () => abrirAnatomia(Escena.seleccionado));
  $('#despiece3d').addEventListener('click', alternarDespiece3D);
  $('#cerrar-anatomia').addEventListener('click', cerrarAnatomia);
  $('#capa-anatomia').addEventListener('click', (e) => { if (e.target.id === 'capa-anatomia') cerrarAnatomia(); });
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (figuraViva) cerrarAnatomia();
    else if (Escena.anatomiaActiva) alternarDespiece3D();
  });

  /* ---------- campaña muestral y análisis ---------- */
  function pintarAnalisis() {
    $('#tab-base').innerHTML = Analisis.htmlLineaBase();
    $('#tab-corr').innerHTML = Analisis.htmlCorrelacion();
    $('#tab-hall').innerHTML = Analisis.htmlHallazgos();
    $('#tab-prot').innerHTML = Analisis.htmlProtocolo();
  }
  function ejecutarCampana() {
    salida.estado('Campaña muestral en curso…');
    return new Promise((ok) => setTimeout(() => {
      Analisis.campana({ repeticiones: parseInt($('#repeticiones').value, 10), icmpFiltrado: $('#icmpfiltrado').checked });
      salida.estado(null);
      pintarAnalisis();
      if ($('#panel-resultados').classList.contains('plegado')) plegar();
      pestana('base');
      ok();
    }, 40));
  }
  $('#campana').addEventListener('click', ejecutarCampana);
  $('#tab-prot').addEventListener('click', (e) => {
    if (e.target.id === 'bajar-datos') Analisis.descargar('campana_sesiones.csv', Analisis.csvDatos());
    if (e.target.id === 'bajar-base') Analisis.descargar('linea_base.csv', Analisis.csvLineaBase());
  });
  pintarAnalisis();

  salida.wifi(Red.wifi(condiciones()), condiciones());
  Escena.seleccionar('portatil');

  /* Parámetros opcionales en la URL, p. ej. index.html?prueba=mtr&destino=interno&cam=aula&equipo=swacc&anatomia=1 */
  const q = new URLSearchParams(location.search);
  ['franja', 'punto', 'medio', 'destino'].forEach((k) => { if (q.get(k)) { $('#' + k).value = q.get(k); $('#' + k).dispatchEvent(new Event('change')); } });
  [['psm', 'psm'], ['icmp', 'icmpfiltrado'], ['quic', 'quic']].forEach(([k, id]) => { if (q.get(k) === '1') $('#' + id).checked = true; });
  if (q.get('vel')) { $('#velocidad').value = q.get('vel'); Pruebas.velocidad = parseFloat(q.get('vel')); }
  if (q.get('cam')) Escena.camaraPreset(q.get('cam'));
  if (q.get('equipo')) { Escena.seleccionar(q.get('equipo')); if (q.get('anatomia') === '1') setTimeout(() => abrirAnatomia(q.get('equipo')), 300); if (q.get('anatomia') === '3d') setTimeout(alternarDespiece3D, 300); }
  if (q.get('repeticiones')) $('#repeticiones').value = q.get('repeticiones');
  if (q.get('campana') === '1') ejecutarCampana().then(() => { if (q.get('pestana')) pestana(q.get('pestana')); });
  if (q.get('prueba')) { $('#escenario').value = q.get('prueba'); desc(); if (q.get('pestana')) setTimeout(() => pestana(q.get('pestana')), 100); Pruebas.ejecutar(q.get('prueba'), condiciones(), salida).then(() => { if (q.get('pestana')) pestana(q.get('pestana')); }); }
})();
