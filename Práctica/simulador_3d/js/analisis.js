/* Campaña muestral y análisis: diseño por punto de asociación, franja horaria y destino,
 * criterios de descarte, línea base con tendencia central y dispersión, correlación entre
 * capas, aporte de cada segmento, matriz de hallazgos y protocolo de medición.
 * Usa las mismas medidas que los escenarios animados (Pruebas.medir*). Los datos son sintéticos. */
const Analisis = (() => {
  const f = Pruebas.f;
  const PUNTOS = ['cerca', 'medio', 'lejos'];
  const NOMBRE_PUNTO = { cerca: 'P1', medio: 'P2', lejos: 'P3', cable: 'Cable' };
  const FRANJAS = ['baja', 'alta'];
  const NOMBRE_FRANJA = { baja: 'Baja (07:00)', alta: 'Alta (10:00–14:00)' };
  const DESTINOS = ['interno', 'publico'];
  const NOMBRE_DESTINO = { interno: 'Interno', publico: 'Público' };
  const ESPACIADO_MIN = 10;          // minutos entre sesiones consecutivas
  const DERIVA_RSSI = 6;             // dB: si la señal se aparta más de esto de la mediana del punto, la sesión se descarta

  let datos = [];
  let config = { repeticiones: 5, icmpFiltrado: false };

  /* ---------- estadística ---------- */
  const orden = (a) => [...a].sort((x, y) => x - y);
  const cuantil = (a, q) => { const s = orden(a); if (!s.length) return NaN; const p = (s.length - 1) * q, i = Math.floor(p); return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i); };
  const mediana = (a) => cuantil(a, 0.5);
  const media = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const desv = (a) => { const m = media(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const rangos = (a) => { const idx = a.map((v, i) => [v, i]).sort((x, y) => x[0] - y[0]); const r = new Array(a.length); let i = 0;
    while (i < idx.length) { let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++; for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2 + 1; i = j + 1; } return r; };
  const pearson = (x, y) => { const mx = media(x), my = media(y); let a = 0, b = 0, c = 0; for (let i = 0; i < x.length; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return a / Math.sqrt(b * c); };
  const spearman = (x, y) => pearson(rangos(x), rangos(y));

  /* ---------- una sesión del protocolo ---------- */
  function sesion(c, dia, ordenDia, rep) {
    const ctx = { ...c, icmpFiltrado: config.icmpFiltrado, quic: false };
    // variables de contexto que el protocolo registra y que pueden invalidar la sesión
    const psmReactivado = c.medio === 'wifi' && Math.random() < 0.07;     // el sistema reactivó el ahorro de energía (batería)
    const deriva = c.medio === 'wifi' ? (Math.random() < 0.05 ? (Math.random() < 0.5 ? -1 : 1) * Red.U(7, 12) : Red.normal(0, 1.6)) : 0;
    const incompleta = Math.random() < 0.03;                              // iperf3 terminó antes de los 10 s
    ctx.psm = psmReactivado;
    const w = c.medio === 'wifi' ? Red.wifi(ctx) : null;
    const icmp = Pruebas.medirICMP(ctx, 1000, 60);
    const tcp = Pruebas.medirTCP(ctx);
    const udp = Pruebas.medirUDP(ctx);
    const fa = Pruebas.medirFases(ctx);
    const inicio = (c.franja === 'baja' ? 7 * 60 : 10 * 60) + ordenDia * ESPACIADO_MIN;
    const s = {
      id: datos.length + 1, dia, hora: `${String(Math.floor(inicio / 60)).padStart(2, '0')}:${String(inicio % 60).padStart(2, '0')}`, repeticion: rep,
      punto: c.medio === 'wifi' ? c.punto : 'cable', franja: c.franja, destino: c.destino, medio: c.medio,
      interfaz: c.medio === 'wifi' ? 'wlp2s0' : 'enp1s0', psm: psmReactivado,
      rssi: w ? w.rssi + Math.round(deriva) : null, ruido: w ? w.ruido : null, snr: w ? w.snr + Math.round(deriva) : null, canal: w ? 36 : null, ancho: w ? 80 : null,
      mcs: w ? w.mcs : null, phy: w ? w.phy : null, reintentos: w ? w.reint : null, ocupacion: w ? w.util : null, derivaRSSI: deriva,
      rttMin: icmp.min, rttMediana: icmp.mediana, rttMedia: icmp.media, rttP95: icmp.p95, ipdv: icmp.ipdv, iplr: icmp.iplr, n: icmp.n,
      goodput: incompleta ? tcp.goodput * Red.U(0.3, 0.6) : tcp.goodput, rwndKiB: tcp.rwnd / 1024, omitidoS: tcp.omitido, retx: tcp.retx, fueraOrdenTCP: tcp.fueraOrden,
      limitacion: tcp.limitacion, eficiencia: tcp.eficiencia, jitter: udp.jitter, perdidaUDP: udp.perdUdp, fueraOrdenUDP: udp.fueraOrden,
      dns: fa.dns, dnsSinCache: fa.fallo, tcpConexion: fa.conn, tls: fa.tls, primerByte: fa.ttfb, transferencia: fa.transf, cargaTotal: fa.total,
      mtu: tcp.mtu, volumenMB: icmp.volumenMB + tcp.volumenMB + udp.volumenMB + fa.volumenMB, incompleta,
      valida: true, motivo: '',
    };
    if (incompleta) descartar(s, 'iperf3 no completó los 10 s');
    else if (psmReactivado) descartar(s, 'ahorro de energía activo (iw get power_save: on)');
    else if (Math.abs(deriva) > DERIVA_RSSI) descartar(s, `señal apartada ${f(Math.abs(deriva), 0)} dB de la habitual del punto`);
    return s;
  }
  const descartar = (s, motivo) => { s.valida = false; s.motivo = motivo; };

  /* ---------- campaña: diseño muestral completo ---------- */
  function campana(opc = {}) {
    config = { ...config, ...opc };
    datos = [];
    for (let rep = 1; rep <= config.repeticiones; rep++) {
      // cada repetición se ejecuta en un día distinto, en las dos franjas
      for (const franja of FRANJAS) {
        let k = 0;
        for (const destino of DESTINOS) {
          for (const punto of PUNTOS) datos.push(sesion({ franja, punto, medio: 'wifi', destino }, rep, k++, rep));
          datos.push(sesion({ franja, punto: 'medio', medio: 'cable', destino }, rep, k++, rep));
        }
      }
    }
    // valores atípicos: regla de Tukey con 3·IQR dentro de cada estrato, sobre las sesiones aún válidas
    for (const grupo of Object.values(agrupar(datos.filter((s) => s.valida)))) {
      for (const v of ['goodput', 'rttMediana']) {
        const xs = grupo.map((s) => s[v]); const q1 = cuantil(xs, 0.25), q3 = cuantil(xs, 0.75), iqr = q3 - q1;
        grupo.forEach((s) => { if (s.valida && (s[v] < q1 - 3 * iqr || s[v] > q3 + 3 * iqr)) descartar(s, `valor atípico de ${v === 'goodput' ? 'goodput' : 'RTT'} (Tukey, 3·IQR)`); });
      }
    }
    return datos;
  }
  const clave = (s) => `${s.punto}|${s.franja}|${s.destino}`;
  function agrupar(lista) { const g = {}; lista.forEach((s) => { (g[clave(s)] = g[clave(s)] || []).push(s); }); return g; }
  const validas = () => datos.filter((s) => s.valida);

  /* ---------- línea base ---------- */
  function estratos() {
    const g = agrupar(validas());
    const filas = [];
    for (const destino of DESTINOS) for (const punto of [...PUNTOS, 'cable']) for (const franja of FRANJAS) {
      const l = g[`${punto}|${franja}|${destino}`] || [];
      if (!l.length) continue;
      const v = (k) => l.map((s) => s[k]);
      const enviados = l.reduce((a, s) => a + s.n, 0), perdidos = l.reduce((a, s) => a + s.iplr * s.n, 0);
      filas.push({ punto, franja, destino, n: l.length, total: datos.filter((s) => clave(s) === `${punto}|${franja}|${destino}`).length,
        rtt: mediana(v('rttMediana')), rttIQR: [cuantil(v('rttMediana'), 0.25), cuantil(v('rttMediana'), 0.75)], rttP95: mediana(v('rttP95')), rttMedia: media(v('rttMedia')),
        ipdv: mediana(v('ipdv')), ipdvMax: Math.max(...v('ipdv')), iplr: perdidos / enviados,
        goodput: mediana(v('goodput')), goodputIQR: [cuantil(v('goodput'), 0.25), cuantil(v('goodput'), 0.75)], goodputCV: desv(v('goodput')) / media(v('goodput')),
        dns: mediana(v('dns')), carga: mediana(v('cargaTotal')), rssi: punto === 'cable' ? null : mediana(v('rssi')), phy: punto === 'cable' ? null : mediana(v('phy')),
        reint: punto === 'cable' ? null : mediana(v('reintentos')) });
    }
    return filas;
  }
  /* Contraste conservador con Y.1541 por estrato (IPTD sobre RTT medio, IPDV e IPLR con n ≥ 1000). */
  function clasesY1541(e) {
    const ev = Pruebas.evaluarY1541({ rttMedia: e.rttMedia, ipdv: e.ipdv, iplr: e.iplr, n: 1000 * e.n });
    return ev.map((r) => { const v = [r.iptd, r.ipdv, r.iplr]; return v.some((x) => x[1] === 'mal') ? 'mal' : (v.some((x) => x[1] === 'aviso') ? 'aviso' : 'ok'); });
  }

  function htmlLineaBase() {
    if (!datos.length) return '<p class="nota">Ejecute la campaña muestral (panel izquierdo) para construir la línea base por punto de asociación y franja horaria.</p>';
    const e = estratos();
    const desc = datos.filter((s) => !s.valida);
    const motivos = {}; desc.forEach((s) => { const m = s.motivo.replace(/apartada \d+ dB/, `apartada más de ${DERIVA_RSSI} dB`); motivos[m] = (motivos[m] || 0) + 1; });
    const sello = (k) => `<span class="insignia ${k}">${k === 'ok' ? '✓' : k === 'aviso' ? '?' : '✗'}</span>`;
    const filas = e.map((r) => { const cl = clasesY1541(r); return `<tr><td>${NOMBRE_DESTINO[r.destino]}</td><td>${NOMBRE_PUNTO[r.punto]}</td><td>${NOMBRE_FRANJA[r.franja]}</td><td class="num">${r.n}/${r.total}</td>
      <td class="num">${f(r.goodput, 1)}</td><td class="num">${f(r.goodputIQR[0], 0)}–${f(r.goodputIQR[1], 0)}</td><td class="num">${f(r.goodputCV * 100, 0)} %</td>
      <td class="num">${f(r.rtt, 1)}</td><td class="num">${f(r.rttIQR[0], 1)}–${f(r.rttIQR[1], 1)}</td><td class="num">${f(r.rttP95, 1)}</td>
      <td class="num">${f(r.ipdv, 1)}</td><td class="num">${f(r.iplr * 100, 3)} %</td><td class="num">${f(r.dns, 1)}</td><td class="num">${f(r.carga, 0)}</td>
      <td>${cl.slice(0, 2).map(sello).join(' ')}</td><td>${cl.slice(2).map(sello).join(' ')}</td></tr>`; }).join('');
    const volumen = datos.reduce((a, s) => a + s.volumenMB, 0);
    return `<p class="nota">${datos.length} sesiones en ${config.repeticiones} días (una repetición por día, en las dos franjas), espaciadas ${ESPACIADO_MIN} min; ${validas().length} válidas y ${desc.length} descartadas${desc.length ? ': ' + Object.entries(motivos).map(([m, k]) => `${k} por ${m}`).join('; ') : ''}. Volumen inyectado en toda la campaña: ${f(volumen / 1000, 2)} GB.</p>
      <div class="columnas"><div>${graficoLineaBase(e, 'interno')}</div><div>${graficoLineaBase(e, 'publico')}</div></div>
      <table><tr><th>Destino</th><th>Punto</th><th>Franja</th><th class="num">Válidas</th><th class="num">Goodput mediano (Mbit/s)</th><th class="num">RIC</th><th class="num">CV</th>
      <th class="num">RTT mediano (ms)</th><th class="num">RIC</th><th class="num">p95</th><th class="num">IPDV (ms)</th><th class="num">IPLR</th><th class="num">DNS (ms)</th><th class="num">Carga web (ms)</th><th>Y.1541 cl. 0–1</th><th>cl. 2–4</th></tr>${filas}</table>
      <p class="nota">Tendencia central: mediana entre sesiones. Dispersión: rango intercuartílico (RIC), percentil 95 y coeficiente de variación (CV). IPLR agrupa todas las sondas del estrato. Y.1541: ✓ cumple, ? no concluyente (el RTT acota por exceso el retardo de un sentido), ✗ excede. Los estratos se comparan solo dentro del mismo tipo de destino.</p>
      ${htmlTema2(e)}`;
  }

  /* Barras de goodput mediano con su rango intercuartílico, por punto y franja. */
  function graficoLineaBase(e, destino) {
    const W = 360, H = 170, iz = 40, ab = 30;
    const grupos = [...PUNTOS, 'cable'];
    const filas = e.filter((r) => r.destino === destino);
    if (!filas.length) return '';
    const tope = Math.max(...filas.map((r) => r.goodputIQR[1])) * 1.1;
    const ancho = (W - iz - 10) / grupos.length;
    const Y = (v) => H - ab - v / tope * (H - ab - 14);
    let barras = '';
    grupos.forEach((p, i) => FRANJAS.forEach((fr, j) => {
      const r = filas.find((x) => x.punto === p && x.franja === fr); if (!r) return;
      const x = iz + i * ancho + 8 + j * (ancho - 16) / 2, w = (ancho - 16) / 2 - 3, col = fr === 'baja' ? '#3fa9f5' : '#ff9f1c';
      barras += `<rect x="${x}" y="${Y(r.goodput)}" width="${w}" height="${H - ab - Y(r.goodput)}" fill="${col}" opacity=".85"><title>${NOMBRE_PUNTO[p]} · ${NOMBRE_FRANJA[fr]}: ${f(r.goodput, 1)} Mbit/s (RIC ${f(r.goodputIQR[0], 0)}–${f(r.goodputIQR[1], 0)})</title></rect>
        <line x1="${x + w / 2}" x2="${x + w / 2}" y1="${Y(r.goodputIQR[0])}" y2="${Y(r.goodputIQR[1])}" stroke="#e6edf3"/>
        <line x1="${x + w / 2 - 3}" x2="${x + w / 2 + 3}" y1="${Y(r.goodputIQR[1])}" y2="${Y(r.goodputIQR[1])}" stroke="#e6edf3"/>
        <line x1="${x + w / 2 - 3}" x2="${x + w / 2 + 3}" y1="${Y(r.goodputIQR[0])}" y2="${Y(r.goodputIQR[0])}" stroke="#e6edf3"/>`;
    }));
    const marcas = [0, 0.5, 1].map((q) => `<text x="${iz - 4}" y="${Y(tope / 1.1 * q) + 3}" fill="#8b98a8" font-size="10" text-anchor="end">${f(tope / 1.1 * q, 0)}</text><line x1="${iz}" x2="${W - 10}" y1="${Y(tope / 1.1 * q)}" y2="${Y(tope / 1.1 * q)}" stroke="#2b3644"/>`).join('');
    return `<b>Goodput mediano y RIC · destino ${NOMBRE_DESTINO[destino].toLowerCase()}</b>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block" role="img" aria-label="Goodput mediano por punto de asociación y franja horaria, destino ${NOMBRE_DESTINO[destino]}">
      ${marcas}${barras}
      ${grupos.map((p, i) => `<text x="${iz + i * ancho + ancho / 2}" y="${H - 14}" fill="#c9d1d9" font-size="11" text-anchor="middle">${NOMBRE_PUNTO[p]}</text>`).join('')}
      <text x="${iz}" y="${H - 2}" fill="#3fa9f5" font-size="10">■ franja baja</text><text x="${iz + 80}" y="${H - 2}" fill="#ff9f1c" font-size="10">■ franja alta</text>
      <text x="${W - 10}" y="${H - 2}" fill="#8b98a8" font-size="10" text-anchor="end">Mbit/s</text></svg>`;
  }

  /* Aporte de cada segmento, para el trabajo complementario de modelado (Tema 2). */
  function segmentos(e) {
    const de = (p, fr, d) => e.find((r) => r.punto === p && r.franja === fr && r.destino === d);
    const out = [];
    for (const fr of FRANJAS) {
      const ci = de('cable', fr, 'interno'), cp = de('cable', fr, 'publico');
      for (const p of PUNTOS) { const w = de(p, fr, 'interno'); if (w && ci) out.push({ seg: `Acceso inalámbrico ${NOMBRE_PUNTO[p]}`, fr, rtt: w.rtt - ci.rtt, ipdv: w.ipdv - ci.ipdv, cap: w.goodput, iplr: w.iplr, base: 'Wi-Fi − cable, destino interno' }); }
      if (ci) out.push({ seg: 'Campus (cable → laboratorio)', fr, rtt: ci.rtt, ipdv: ci.ipdv, cap: ci.goodput, iplr: ci.iplr, base: 'cable, destino interno' });
      if (ci && cp) out.push({ seg: 'Salida a Internet y red externa', fr, rtt: cp.rtt - ci.rtt, ipdv: cp.ipdv - ci.ipdv, cap: cp.goodput, iplr: Math.max(0, cp.iplr - ci.iplr), base: 'cable: público − interno' });
    }
    return out;
  }
  function htmlTema2(e) {
    const s = segmentos(e);
    return `<p style="margin-top:10px"><b>Aporte de cada segmento</b> (parámetros de entrada para el trabajo complementario de modelado)</p>
      <table><tr><th>Segmento</th><th>Franja</th><th class="num">Retardo añadido (RTT, ms)</th><th class="num">IPDV añadida (ms)</th><th class="num">Capacidad observada (Mbit/s)</th><th class="num">Pérdida</th><th>Cómo se obtiene</th></tr>
      ${s.map((r) => `<tr><td>${r.seg}</td><td>${NOMBRE_FRANJA[r.fr]}</td><td class="num">${f(r.rtt, 2)}</td><td class="num">${f(r.ipdv, 1)}</td><td class="num">${f(r.cap, 0)}</td><td class="num">${f(r.iplr * 100, 3)} %</td><td>${r.base}</td></tr>`).join('')}</table>
      <p class="nota">Las restas entre medianas acotan cada contribución sin acceder a la infraestructura: el cable de control aísla el tramo inalámbrico y el destino interno aísla la ruta externa. Describen el servicio entregado en el extremo, no el estado interno de los equipos.</p>`;
  }

  /* ---------- correlación entre capas ---------- */
  const FISICAS = [['rssi', 'RSSI'], ['snr', 'SNR'], ['mcs', 'MCS'], ['reintentos', 'Reintentos'], ['ocupacion', 'Ocupación']];
  const SUPERIORES = [['goodput', 'Goodput'], ['rttMediana', 'RTT mediano'], ['ipdv', 'IPDV'], ['iplr', 'IPLR'], ['cargaTotal', 'Carga web']];
  function matrizCorrelacion(destino = 'interno') {
    const l = validas().filter((s) => s.medio === 'wifi' && s.destino === destino);
    return { n: l.length, m: FISICAS.map(([a]) => SUPERIORES.map(([b]) => spearman(l.map((s) => s[a]), l.map((s) => s[b])))), l };
  }
  function htmlCorrelacion() {
    if (!datos.length) return '<p class="nota">Ejecute la campaña muestral para correlacionar los indicadores de capa física y de enlace con el desempeño de las capas superiores.</p>';
    const { n, m, l } = matrizCorrelacion('interno');
    const umbral = 2 / Math.sqrt(n);
    const celda = (r) => { const a = Math.abs(r), col = r < 0 ? '255,92,92' : '63,169,245'; return `<td class="num" style="background:rgba(${col},${(a * 0.55).toFixed(2)})">${f(r, 2)}${a >= umbral ? '' : '<sup>ns</sup>'}</td>`; };
    const tabla = `<p><b>ρ de Spearman</b> entre capa física y de enlace (filas) y desempeño (columnas). Wi-Fi, destino interno, n = ${n} sesiones válidas.</p>
      <table><tr><th></th>${SUPERIORES.map(([, t]) => `<th class="num">${t}</th>`).join('')}</tr>
      ${FISICAS.map(([, t], i) => `<tr><td>${t}</td>${m[i].map(celda).join('')}</tr>`).join('')}</table>`;
    return `<div class="fila-flex"><div class="corr-tabla">${tabla}<p class="nota">Azul: relación directa; rojo: inversa. <sup>ns</sup>: |ρ| menor que 2/√n (≈ ${f(umbral, 2)}), no se distingue del azar con esta muestra. Se usa el destino interno para que la ruta externa no enmascare el efecto del acceso; la correlación no prueba causalidad, por eso el cable de control acota el aporte inalámbrico.</p></div>
      <div>${dispersion(l)}</div></div>`;
  }
  function dispersion(l) {
    const W = 360, H = 190, iz = 44, ab = 30;
    const xs = l.map((s) => s.rssi), ys = l.map((s) => s.goodput);
    const x0 = Math.min(...xs) - 2, x1 = Math.max(...xs) + 2, y1 = Math.max(...ys) * 1.1;
    const X = (v) => iz + (v - x0) / (x1 - x0) * (W - iz - 10), Y = (v) => H - ab - v / y1 * (H - ab - 10);
    const pts = l.map((s) => `<circle cx="${X(s.rssi).toFixed(1)}" cy="${Y(s.goodput).toFixed(1)}" r="3.2" fill="${s.franja === 'baja' ? '#3fa9f5' : '#ff9f1c'}" opacity=".8"><title>${NOMBRE_PUNTO[s.punto]} · ${s.franja} · ${s.rssi} dBm · ${f(s.goodput, 1)} Mbit/s</title></circle>`).join('');
    const ticksX = [Math.ceil(x0 / 10) * 10, Math.ceil(x0 / 10) * 10 + 10, Math.ceil(x0 / 10) * 10 + 20, Math.ceil(x0 / 10) * 10 + 30].filter((v) => v <= x1);
    return `<b>RSSI frente a goodput</b> (cada punto es una sesión válida)
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;display:block" role="img" aria-label="Diagrama de dispersión de la potencia recibida frente al goodput">
      <line x1="${iz}" y1="${H - ab}" x2="${W - 10}" y2="${H - ab}" stroke="#2b3644"/><line x1="${iz}" y1="10" x2="${iz}" y2="${H - ab}" stroke="#2b3644"/>
      ${ticksX.map((v) => `<text x="${X(v)}" y="${H - ab + 13}" fill="#8b98a8" font-size="10" text-anchor="middle">${v}</text>`).join('')}
      ${[0, 0.5, 1].map((q) => `<text x="${iz - 4}" y="${Y(y1 / 1.1 * q) + 3}" fill="#8b98a8" font-size="10" text-anchor="end">${f(y1 / 1.1 * q, 0)}</text>`).join('')}
      ${pts}<text x="${W - 10}" y="${H - 3}" fill="#8b98a8" font-size="10" text-anchor="end">RSSI (dBm)</text><text x="4" y="12" fill="#8b98a8" font-size="10">Mbit/s</text>
      <text x="${iz + 4}" y="${H - 3}" fill="#3fa9f5" font-size="10">● baja</text><text x="${iz + 50}" y="${H - 3}" fill="#ff9f1c" font-size="10">● alta</text></svg>`;
  }

  /* ---------- matriz de hallazgos ---------- */
  function hallazgos() {
    if (!datos.length) return [];
    const e = estratos();
    const de = (p, fr, d) => e.find((r) => r.punto === p && r.franja === fr && r.destino === d);
    const H = [];
    const peor = de('lejos', 'alta', 'interno'), mejor = de('cerca', 'baja', 'interno');
    if (peor && mejor && peor.goodput < 0.5 * mejor.goodput) {
      const sinc = peor.ipdv > 50;
      H.push({ crit: sinc ? 'Alta' : 'Media', titulo: 'Degradación del acceso inalámbrico en P3', donde: 'P3, ambas franjas (peor en la alta)',
        impacto: sinc ? 'Voz y videoconferencia inestables; descargas lentas' : 'Descargas y carga de plataformas más lentas',
        evidencia: `Goodput mediano ${f(peor.goodput, 0)} Mbit/s frente a ${f(mejor.goodput, 0)} en P1 (destino interno); IPDV ${f(peor.ipdv, 1)} ms; RSSI ${f(peor.rssi, 0)} dBm; reintentos ${f(peor.reint * 100, 0)} %.`,
        rec: 'Revisar la cobertura del aula en P3 (ubicación o densidad de puntos de acceso, obstáculos) y comprobar la asociación a 5 GHz; repetir la sesión con el cable de control para confirmar que la causa es el tramo inalámbrico.' });
    }
    const pb = de('cable', 'baja', 'publico'), pa = de('cable', 'alta', 'publico'), ib = de('cable', 'baja', 'interno'), ia = de('cable', 'alta', 'interno');
    if (pb && pa && ib && ia && pa.goodput < 0.8 * pb.goodput && ia.goodput > 0.9 * ib.goodput) {
      H.push({ crit: pa.goodput < 0.6 * pb.goodput ? 'Alta' : 'Media', titulo: 'Cuello de botella en la salida a Internet en horas pico', donde: 'Toda la institución, franja alta',
        impacto: 'Servicios externos lentos (plataformas en la nube, videollamadas) aunque la red del campus esté holgada',
        evidencia: `Con cable, el goodput hacia el servidor público cae de ${f(pb.goodput, 0)} a ${f(pa.goodput, 0)} Mbit/s entre franjas (${f((1 - pa.goodput / pb.goodput) * 100, 0)} %); hacia el interno se mantiene (${f(ib.goodput, 0)} → ${f(ia.goodput, 0)}). RTT al público: ${f(pb.rtt, 1)} → ${f(pa.rtt, 1)} ms; IPDV: ${f(pb.ipdv, 1)} → ${f(pa.ipdv, 1)} ms.`,
        rec: 'Presentar la evidencia al área de infraestructura para que evalúe la capacidad del enlace de salida o la priorización del tráfico académico en la franja alta (decisión fuera del alcance de este trabajo, que no accede al plano de gestión).' });
    }
    const sinc = e.filter((r) => r.punto !== 'cable' && r.ipdv > 50);
    if (sinc.length) H.push({ crit: sinc.some((r) => r.franja === 'alta') ? 'Alta' : 'Media', titulo: 'Variación del retardo incompatible con las clases 0 y 1 de Y.1541', donde: sinc.map((r) => `${NOMBRE_PUNTO[r.punto]} ${r.franja}`).filter((v, i, a) => a.indexOf(v) === i).join(', '),
      impacto: 'Voz y videoconferencia: cortes y retardo variable', evidencia: `IPDV mediana de ${f(Math.min(...sinc.map((r) => r.ipdv)), 0)} a ${f(Math.max(...sinc.map((r) => r.ipdv)), 0)} ms (objetivo de 50 ms) en ${sinc.length} estratos Wi-Fi; con cable no se excede.`,
      rec: 'Para sesiones sincrónicas, recomendar cable o puntos con RSSI ≥ −67 dBm; sugerir al área de infraestructura revisar la priorización WMM del tráfico de voz y video en los puntos de acceso.' });
    const dnsLento = validas().filter((s) => s.dnsSinCache);
    if (dnsLento.length) H.push({ crit: 'Media', titulo: 'Consultas DNS sin caché', donde: 'Todos los puntos; más frecuente en la franja alta',
      impacto: 'Carga inicial de servicios web más lenta', evidencia: `${dnsLento.length} de ${validas().length} sesiones (${f(dnsLento.length / validas().length * 100, 0)} %) resolvieron sin caché, con ${f(mediana(dnsLento.map((s) => s.dns)), 0)} ms de mediana frente a ${f(mediana(validas().filter((s) => !s.dnsSinCache).map((s) => s.dns)), 1)} ms con caché.`,
      rec: 'Revisar el tamaño y la vida útil de la caché del resolutor institucional y la latencia de sus reenviadores.' });
    if (config.icmpFiltrado) H.push({ crit: 'Alta', titulo: 'Agujero negro de PMTUD en el borde', donde: 'Todo el tráfico hacia Internet',
      impacto: 'Conexiones que se cuelgan con paquetes grandes (VPN, descargas, algunos sitios)', evidencia: 'ping -M do -s 1472 sin respuesta ni aviso; con -s 1464 responde. tracepath no recibe el ICMP «fragmentación necesaria».',
      rec: 'Permitir en el cortafuegos de borde el ICMP tipo 3, código 4 (y el ICMPv6 «Packet Too Big»); mientras tanto, ajustar el MSS en el borde.' });
    else H.push({ crit: 'Baja', titulo: 'MTU de 1492 bytes hacia Internet', donde: 'Ruta hacia el servidor público', impacto: 'Ninguno apreciable: PMTUD opera',
      evidencia: 'tracepath reporta pmtu 1492 en el enlace del proveedor (encapsulación PPPoE); ping -M do con 1464 bytes de carga pasa y con 1472 recibe el aviso.', rec: 'Mantener permitido el ICMP «fragmentación necesaria»; documentar la MTU en el protocolo.' });
    const psm = datos.filter((s) => s.motivo.startsWith('ahorro'));
    if (psm.length) H.push({ crit: 'Media', titulo: 'Ahorro de energía del cliente reactivado', donde: 'Sesiones con batería', impacto: 'RTT inflado hasta 102 ms: falsearía la línea base',
      evidencia: `${psm.length} ${psm.length === 1 ? 'sesión descartada' : 'sesiones descartadas'} por el criterio de validez (iw get power_save: on).`, rec: 'Desactivar el ahorro de energía y conectar el cargador antes de cada sesión; verificarlo en la lista de comprobación del protocolo.' });
    H.push({ crit: 'Baja', titulo: 'Pérdida aparente en un salto del proveedor (mtr)', donde: '198.51.100.9', impacto: 'Ninguno: no afecta al tráfico que atraviesa el salto',
      evidencia: 'mtr muestra alrededor de 30 % de pérdida en ese salto y 0 % en el destino: el enrutador limita sus respuestas ICMP.', rec: 'No reportar esa cifra como pérdida; usar la pérdida extremo a extremo (fping, iperf3 UDP).' });
    const { m } = matrizCorrelacion('interno');
    const rReintGood = m[3][0], rReintPerd = m[3][3], rOcupIPDV = m[4][2];
    if (Math.abs(rReintGood) >= 0.5 || rOcupIPDV >= 0.5) H.push({ crit: 'Media', titulo: 'La capa física y de enlace explica la degradación inalámbrica', donde: 'Acceso inalámbrico, todos los puntos', impacto: 'Descargas (goodput) y servicios sincrónicos (IPDV)',
      evidencia: `ρ de Spearman: reintentos–goodput ${f(rReintGood, 2)}, reintentos–IPLR ${f(rReintPerd, 2)}, ocupación del canal–IPDV ${f(rOcupIPDV, 2)}, RSSI–goodput ${f(m[0][0], 2)}.`,
      rec: 'Atacar la cobertura (reintentos) para mejorar el goodput y la contienda del canal en la franja alta (ocupación) para reducir la variación del retardo, antes de ampliar la capacidad de los enlaces cableados.' });
    const peso = { Alta: 0, Media: 1, Baja: 2 };
    return H.sort((a, b) => peso[a.crit] - peso[b.crit]).map((h, i) => ({ ...h, id: `H${i + 1}` }));
  }
  function htmlHallazgos() {
    if (!datos.length) return '<p class="nota">Ejecute la campaña muestral para derivar la matriz de hallazgos.</p>';
    const clase = { Alta: 'mal', Media: 'aviso', Baja: 'ok' };
    return `<table class="envuelve"><tr><th>#</th><th>Criticidad</th><th>Hallazgo</th><th>Dónde / cuándo</th><th>Impacto en el usuario</th><th>Evidencia</th><th>Recomendación</th></tr>
      ${hallazgos().map((h) => `<tr><td>${h.id}</td><td><span class="insignia ${clase[h.crit]}">${h.crit}</span></td><td><b>${h.titulo}</b></td><td>${h.donde}</td><td>${h.impacto}</td><td>${h.evidencia}</td><td>${h.rec}</td></tr>`).join('')}</table>
      <p class="nota">Criticidad según el impacto sobre la experiencia del usuario y la extensión en el espacio y en el tiempo. Las recomendaciones se dirigen al área responsable de la infraestructura; su aplicación queda fuera del alcance.</p>`;
  }

  /* ---------- protocolo y conjunto de datos ---------- */
  function htmlProtocolo() {
    return `<div class="columnas protocolo"><div>
      <p><b>Plano de observación.</b> Todo se mide desde el portátil del estudiante, con privilegios de usuario. Se caracteriza el servicio entregado en el extremo, no el estado interno de la infraestructura.</p>
      <p><b>Diseño muestral.</b> 3 puntos de asociación (P1 cerca, P2 media distancia, P3 tras una pared) × 2 franjas (baja a las 07:00, alta de 10:00 a 14:00) × 2 destinos (servidor iperf3 interno del laboratorio y servidor público de referencia), más el cable de control en la roseta. ${config.repeticiones} repeticiones por estrato, una por día; sesiones espaciadas ${ESPACIADO_MIN} min.</p>
      <p><b>Secuencia de cada sesión</b> (unos 75 s de inyección; el volumen depende del goodput y se registra en cada sesión):</p>
      <pre>iw dev wlp2s0 get power_save        # debe decir off
iw dev wlp2s0 link; iw dev wlp2s0 station dump; iw dev wlp2s0 survey dump
tracepath -n DESTINO; ping -M do -s 1472 -c 3 DESTINO
fping -c 1000 -p 60 DESTINO                     # IPTD, IPDV, IPLR (Y.1540)
iperf3 -c DESTINO -R -t 10 -O 2 -J > tcp.json  # RFC 6349
iperf3 -c DESTINO -u -b 5M -t 60 -J > udp.json
dig SERVICIO @10.20.1.53
curl -so /dev/null -w @formato.txt https://SERVICIO/
mtr -n -r -c 30 DESTINO
tcpdump -i wlp2s0 -p -w sesion.pcapng host 10.20.34.57</pre>
      <p class="nota">En Windows: <code>netsh wlan show interfaces</code>; en GNU/Linux también <code>wavemon</code> para seguir la señal durante la sesión.</p>
    </div><div>
      <p><b>Criterios de validez y descarte</b></p>
      <ul><li>Ahorro de energía activo en la interfaz.</li><li>Señal (RSSI) apartada más de ${DERIVA_RSSI} dB de la habitual del punto.</li><li>iperf3 que no completa los 10 s.</li><li>Valores atípicos de goodput o RTT dentro del estrato (regla de Tukey, 3 × RIC).</li></ul>
      <p><b>Variables de contexto registradas:</b> interfaz, RSSI, ruido, SNR, canal y ancho de canal, MCS, tasa nominal, reintentos, ocupación del canal, ahorro de energía, MTU y volumen inyectado.</p>
      <p><b>Marcos normativos:</b> ITU-T Y.1540 (definición de IPTD, IPDV e IPLR), ITU-T Y.1541 (objetivos por clase), RFC 6349 (goodput TCP), RFC 2544 (procedimientos de prueba), IEEE 802.11 (tasas nominales por MCS).</p>
      <p><b>Ética y alcance:</b> captura solo de las interfaces propias, sin modo promiscuo y con filtro por la dirección propia; sin escaneo de hosts ni puertos, sin acceso al plano de gestión, sin descifrado.</p>
      <p><b>Carga sobre el medio compartido:</b> el flujo TCP ocupa el cuello de botella durante 10 s; con sesiones cada ${ESPACIADO_MIN} min la ocupación media que añade la medición queda por debajo del ${f(10 / (ESPACIADO_MIN * 60) * 100, 1)} %.</p>
      <p><b>Cronograma (PPDIOO, preparación y planificación):</b> semanas 1–2 preparación · 3–4 protocolo, instrumentación y piloto · 5–7 campaña · 8 procesamiento y disección · 9–10 contraste, hallazgos e informe.</p>
      <p><b>Procesamiento:</b> Python con pandas, SciPy y matplotlib, o LibreOffice Calc, sobre el conjunto de datos.</p>
      <div class="fila-botones"><button id="bajar-datos" ${datos.length ? '' : 'disabled'}>⬇ Conjunto de datos (CSV)</button><button id="bajar-base" ${datos.length ? '' : 'disabled'}>⬇ Línea base (CSV)</button></div>
      ${datos.length ? '' : '<p class="nota">Ejecute la campaña para generar los datos.</p>'}
    </div></div>`;
  }

  const COLUMNAS = ['id', 'dia', 'hora', 'repeticion', 'punto', 'franja', 'destino', 'medio', 'interfaz', 'psm', 'rssi', 'ruido', 'snr', 'canal', 'ancho', 'mcs', 'phy', 'reintentos', 'ocupacion',
    'rttMin', 'rttMediana', 'rttMedia', 'rttP95', 'ipdv', 'iplr', 'n', 'goodput', 'rwndKiB', 'omitidoS', 'retx', 'fueraOrdenTCP', 'limitacion', 'eficiencia', 'jitter', 'perdidaUDP', 'fueraOrdenUDP',
    'dns', 'dnsSinCache', 'tcpConexion', 'tls', 'primerByte', 'transferencia', 'cargaTotal', 'mtu', 'volumenMB', 'valida', 'motivo'];
  const celdaCSV = (v) => { if (v === null || v === undefined) return ''; if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(4); const s = String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function csvDatos() { return [COLUMNAS.join(','), ...datos.map((s) => COLUMNAS.map((k) => celdaCSV(s[k])).join(','))].join('\n'); }
  function csvLineaBase() {
    const cols = ['destino', 'punto', 'franja', 'n', 'goodput', 'goodputQ1', 'goodputQ3', 'goodputCV', 'rtt', 'rttQ1', 'rttQ3', 'rttP95', 'ipdv', 'iplr', 'dns', 'carga'];
    return [cols.join(','), ...estratos().map((r) => [r.destino, r.punto, r.franja, r.n, r.goodput, r.goodputIQR[0], r.goodputIQR[1], r.goodputCV, r.rtt, r.rttIQR[0], r.rttIQR[1], r.rttP95, r.ipdv, r.iplr, r.dns, r.carga].map(celdaCSV).join(','))].join('\n');
  }
  function descargar(nombre, texto) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + texto], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  return { campana, estratos, hallazgos, matrizCorrelacion, segmentos, htmlLineaBase, htmlCorrelacion, htmlHallazgos, htmlProtocolo,
    csvDatos, csvLineaBase, descargar, get datos() { return datos; }, get config() { return config; }, spearman, cuantil };
})();
