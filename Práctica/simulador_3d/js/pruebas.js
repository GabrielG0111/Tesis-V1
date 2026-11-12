/* Escenarios de prueba: animan los paquetes sobre la escena y generan resultados
 * con el mismo formato que las herramientas reales (mtr, iperf3, fping, tracepath, dig, curl, tcpdump). */
const Pruebas = (() => {
  const AMARILLO = 0xffe066, AZUL = 0x4dd4ff, ROJO = 0xff5c5c, GRIS = 0x7d8794, VIOLETA = 0xc77dff;
  const IP = { portatil: '10.20.34.57', core: '10.20.32.1', dns: '10.20.1.53', labpc: '10.20.60.10', borde: '10.20.255.1',
    pe: '198.51.100.1', ispcore: '198.51.100.9', transito: '203.0.113.1', srv: '203.0.113.50' };
  const f = (x, d = 1) => (x === null || x === undefined || isNaN(x)) ? '—' : x.toFixed(d).replace('.', ',');
  let velocidad = 1, token = 0, vuelo = [];
  const historial = {};

  class Cancelado extends Error {}
  const comprobar = (t) => { if (t !== token) throw new Cancelado(); };

  /* Animación de paquetes */
  Escena.alCuadro((dt) => {
    for (let i = vuelo.length - 1; i >= 0; i--) {
      const p = vuelo[i];
      p.d += dt * p.vel * velocidad;
      if (p.perdido !== null && p.d >= p.perdido) {
        p.malla.material.color.setHex(ROJO); p.desv += dt;
        p.malla.position.y -= dt * 2; p.malla.scale.multiplyScalar(1 - dt * 1.2);
        if (p.desv > 0.8) { Escena.quitar(p.malla); vuelo.splice(i, 1); p.fin(false); }
        continue;
      }
      if (p.d >= p.total) { Escena.quitar(p.malla); vuelo.splice(i, 1); p.fin(true); continue; }
      let resto = p.d, k = 0;
      while (k < p.tramos.length - 1 && resto > p.tramos[k].e.longitud) { resto -= p.tramos[k].e.longitud; k++; }
      p.malla.position.copy(Escena.puntoEnTramo(p.tramos[k], Math.min(1, resto / p.tramos[k].e.longitud)));
    }
  });

  /* Envía un paquete por una secuencia de equipos; «perder» = fracción del recorrido donde se pierde. */
  function enviar(nodos, { color = AMARILLO, perder = null, radio = 0.14, texto = null } = {}) {
    const tramos = Escena.ruta(nodos);
    const total = tramos.reduce((s, t) => s + t.e.longitud, 0);
    return new Promise((fin) => {
      const malla = Escena.paquete(color, radio);
      malla.position.copy(Escena.puntoEnTramo(tramos[0], 0));
      const vel = total / Math.min(1.6, Math.max(0.6, total / 40));   // cada recorrido dura entre 0,6 y 1,6 s
      vuelo.push({ malla, tramos, total, vel, d: 0, perdido: perder === null ? null : perder * total, desv: 0, fin });
      if (texto) Escena.etiquetaFlotante(texto, malla.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 1.6);
    });
  }
  const ida = (r, i) => r.slice(0, i + 1);
  const vuelta = (r, i) => r.slice(0, i + 1).reverse();
  const pausa = (ms, t) => new Promise((ok) => setTimeout(ok, ms / velocidad)).then(() => comprobar(t));

  function limpiar() { token++; vuelo.forEach((p) => Escena.quitar(p.malla)); vuelo = []; }

  function pantalla(lineas) { Modelos.escribirPantalla(lineas); }

  /* ---------------- Contraste con ITU-T Y.1541 ---------------- */
  const CLASES = [
    { c: 0, iptd: 100, ipdv: 50, uso: 'VoIP, videoconferencia (alta interacción)' },
    { c: 1, iptd: 400, ipdv: 50, uso: 'VoIP, videoconferencia' },
    { c: 2, iptd: 100, ipdv: null, uso: 'Transacciones muy interactivas' },
    { c: 3, iptd: 400, ipdv: null, uso: 'Transacciones interactivas' },
    { c: 4, iptd: 1000, ipdv: null, uso: 'Datos masivos, video en flujo' },
  ];
  function evaluarY1541(m) {
    return CLASES.map((k) => {
      const iptd = m.rttMedia <= k.iptd ? ['Cumple', 'ok'] : ['No concluyente', 'aviso'];
      let ipdv = ['No especificado', ''];
      if (k.ipdv !== null) ipdv = m.n < 1000 ? ['Muestra < 1000', 'aviso'] : (m.ipdv <= k.ipdv ? ['Cumple', 'ok'] : ['Excede', 'mal']);
      const iplr = m.n < 1000 ? ['Muestra < 1000', 'aviso'] : (m.iplr <= 1e-3 ? ['Cumple', 'ok'] : ['Excede', 'mal']);
      return { ...k, iptd, ipdv, iplr };
    });
  }
  function registrar(c, m) {
    const clave = `${c.destino}|${c.franja}|${c.punto}|${c.medio}|${c.psm ? 'psm' : ''}`;
    historial[clave] = { ...m, c: { ...c }, hora: new Date().toLocaleTimeString('es-EC') };
  }

  /* ---------------- Escenarios ---------------- */

  async function mtr(c, s, t) {
    const ruta = Red.nodos(c);
    const destino = ruta[ruta.length - 1];
    pantalla([`$ mtr -n -r -c 30 ${IP[destino]}`, 'Start: midiendo...']);
    const saltos = ruta.map((id, i) => ({ id, i })).filter((x) => Red.INFO[x.id].salto);
    // como mtr, se sondean todos los saltos a la vez, con un TTL distinto para cada uno
    await Promise.all(saltos.map(async (h, n) => {
      await pausa(n * 280, t);
      const rtt = Red.muestraRTT(c, ruta, h.i, { icmp: true, intervalo: 1000 });
      const ok = await enviar(ida(ruta, h.i), { texto: `TTL=${n + 1}` });
      comprobar(t);
      if (ok) await enviar(vuelta(ruta, h.i), { color: rtt === null ? GRIS : AZUL, perder: rtt === null ? 0.08 : null, radio: 0.11 });
    }));
    const filas = [], cap = [];
    let numero = 1;
    ruta.slice(1).forEach((id, j) => {
      const i = j + 1;
      if (!Red.INFO[id].salto) { filas.push({ l2: true, id }); return; }
      const m = []; let perdidas = 0;
      for (let k = 0; k < 30; k++) { const r = Red.muestraRTT(c, ruta, i, { icmp: true, intervalo: 1000 }); if (r === null) perdidas++; else m.push(r); }
      filas.push({ n: numero++, id, ip: IP[id], loss: perdidas / 30 * 100, snt: 30, last: m[m.length - 1], avg: Red.media(m), best: Math.min(...m), wrst: Math.max(...m), sd: Red.desv(m), muestras: m });
    });
    const dst = filas[filas.length - 1];
    let html = `<table><tr><th>#</th><th>Equipo</th><th>Host</th><th class="num">Loss%</th><th class="num">Snt</th><th class="num">Last</th><th class="num">Avg</th><th class="num">Best</th><th class="num">Wrst</th><th class="num">StDev</th></tr>`;
    filas.forEach((r) => {
      if (r.l2) { html += `<tr class="l2"><td>—</td><td>${Escena.equipos[r.id].userData.nombre}</td><td colspan="8">capa 2: no decrementa el TTL, invisible para mtr</td></tr>`; return; }
      html += `<tr class="${r.loss > 0 ? 'perdida' : ''}"><td>${r.n}</td><td>${Escena.equipos[r.id].userData.nombre}</td><td>${r.ip}</td><td class="num">${f(r.loss)}%</td><td class="num">${r.snt}</td><td class="num">${f(r.last)}</td><td class="num">${f(r.avg)}</td><td class="num">${f(r.best)}</td><td class="num">${f(r.wrst)}</td><td class="num">${f(r.sd)}</td></tr>`;
    });
    html += '</table>';
    const falsa = filas.find((r) => r.id === 'ispcore' && r.loss > 0);
    if (falsa && dst.loss === 0) html += `<p class="nota">El salto ${falsa.n} muestra ${f(falsa.loss)} % de «pérdida», pero el destino no pierde nada: el enrutador limita sus respuestas ICMP. No es pérdida real.</p>`;
    if (c.psm && c.medio === 'wifi') html += '<p class="nota">El ahorro de energía está activo: las respuestas esperan la baliza del punto de acceso y el RTT se infla hasta en 102,4 ms desde el primer salto.</p>';
    s.resultados(html);
    pantalla([`$ mtr -n -r -c 30 ${IP[destino]}`, ...filas.filter((r) => !r.l2).map((r) => `${String(r.n).padStart(2)}. ${r.ip.padEnd(14)} ${f(r.loss).padStart(5)}% ${f(r.avg).padStart(6)} ms`)]);
    registrar(c, { prueba: 'mtr', rttMedia: dst.avg, ipdv: Red.percentil(dst.muestras, 0.999) - dst.best, iplr: dst.loss / 100, n: 30 });
    saltos.slice(0, 3).forEach((h, k) => cap.push(['ICMP', IP.portatil, IP[destino], `Echo (ping) request ttl=${k + 1}`], ['ICMP', IP[h.id], IP.portatil, 'Time-to-live exceeded']));
    s.captura(cap);
  }

  async function tcp(c, s, t) {
    const ruta = Red.nodos(c), dst = ruta[ruta.length - 1];
    const rtts = []; for (let k = 0; k < 40; k++) { const r = Red.muestraRTT(c, ruta, ruta.length - 1, { intervalo: 200 }); if (r !== null) rtts.push(r); }
    const rttBase = Math.min(...rtts);
    const { mtu } = Red.mtuRuta(c.destino);
    const mss = mtu - 52;
    const { bb, limita } = Red.cuelloBotella(c);
    const bufPct = (c.franja === 'alta' ? (c.destino === 'publico' ? 85 : 35) : 9) + (c.medio === 'wifi' && c.punto === 'lejos' ? 20 : 0) + Red.U(-3, 3);
    const rttCarga = rttBase * (1 + bufPct / 100);
    // pérdida aleatoria en el sentido de los datos (la congestión del enlace ya está en BB)
    const p = Math.max(1e-6, (c.medio === 'wifi' ? Red.perdidaTramo(c, 'ap', 'portatil') : 0) + 0.00001);
    const ventanaMax = 6 * 1048576;
    const rttS = rttCarga / 1000;
    const porVentana = ventanaMax * 8 / rttS / 1e6;
    // respuesta de CUBIC (RFC 9438): ventana media 1,054·RTT^0,75/p^0,75 segmentos, nunca peor que Reno (Mathis)
    const reno = (mss * 8 / rttS) * (1.22 / Math.sqrt(p)) / 1e6;
    const cubic = 1.054 * Math.pow(rttS, 0.75) / Math.pow(p, 0.75) * mss * 8 / rttS / 1e6;
    const mathis = Math.max(reno, cubic);
    const ideal = bb * (mss / (mtu + 38));
    const goodput = Math.min(ideal, porVentana, mathis) * Red.U(0.92, 0.98);
    const minimo = Math.min(ideal, porVentana, mathis);
    const causa = minimo === ideal ? limita : (minimo === porVentana ? 'ventana de recepción' : 'pérdida aleatoria (control de congestión CUBIC)');
    const bdp = bb * 1e6 / 8 * rttBase / 1000;
    const retx = Math.round(goodput * 1e6 / 8 / mss * 10 * p * 1.1 + (c.medio === 'wifi' ? Red.U(0, 4) : 0));
    const enviados = Math.round(goodput * 1e6 / 8 * 10);
    const eficiencia = 100 * (1 - retx * mss / Math.max(1, enviados));
    pantalla([`$ tracepath -n ${IP[dst]}   # paso 1: MTU`, `pmtu ${mtu}`, `$ ping -c 40 ${IP[dst]}   # paso 2: RTT base`, `rtt min ${f(rttBase, 2)} ms`, `$ iperf3 -c ${IP[dst]} -R -t 10 -O 2`]);

    s.estado('RFC 6349 · paso 3: flujo TCP (descarga)');
    await enviar(ruta, { texto: 'SYN' }); comprobar(t);
    await enviar([...ruta].reverse(), { color: AZUL, texto: 'SYN-ACK' }); comprobar(t);
    const tren = [], inv = [...ruta].reverse();
    const perdidaVisible = retx > 0 ? 5 : -1;
    for (let k = 0; k < 18; k++) {
      tren.push(enviar(inv, { radio: 0.12, perder: k === perdidaVisible ? Red.U(0.3, 0.7) : null }));
      if (k % 3 === 2) tren.push(enviar(ruta, { color: AZUL, radio: 0.08 }));
      await pausa(110, t);
    }
    if (perdidaVisible >= 0) { await pausa(500, t); Escena.etiquetaFlotante('Retransmisión', Escena.equipos.portatil.position.clone().add(new THREE.Vector3(0, 2, 0)), 2); await enviar(inv, { color: VIOLETA, radio: 0.14 }); }
    await Promise.all(tren); comprobar(t);

    let lineas = '[ ID] Intervalo        Transferido   Tasa            Retr\n';
    for (let k = 0; k < 10; k++) {
      const rampa = k < 2 ? 0.35 + k * 0.3 : 1;
      const tasa = goodput * rampa * Red.U(0.93, 1.06);
      lineas += `[  5] ${String(k).padStart(2)},00-${String(k + 1).padStart(2)},00 s  ${f(tasa / 8, 1).padStart(6)} MBytes  ${f(tasa, 1).padStart(7)} Mbits/s  ${k < 2 ? '(omitido)' : Math.round(retx / 8 * Red.U(0.5, 1.5))}\n`;
    }
    const ttr = ideal / goodput;
    s.resultados(`<div class="columnas"><div><pre>${lineas}</pre></div><div><table>
      <tr><th>Paso / métrica RFC 6349</th><th class="num">Valor</th><th>Desde el extremo</th></tr>
      <tr><td>MTU de la ruta</td><td class="num">${mtu} B</td><td><span class="insignia ok">Medible</span></td></tr>
      <tr><td>RTT de referencia (mínimo)</td><td class="num">${f(rttBase, 2)} ms</td><td><span class="insignia ok">Medible</span></td></tr>
      <tr><td>Cuello de botella (BB)</td><td class="num">${f(bb, 0)} Mbit/s</td><td><span class="insignia aviso">Estimado</span> ${limita}</td></tr>
      <tr><td>BDP = BB × RTT</td><td class="num">${f(bdp / 1024, 0)} KiB</td><td>ventana necesaria</td></tr>
      <tr><td>Goodput medido</td><td class="num">${f(goodput, 1)} Mbit/s</td><td>limitado por: ${causa}</td></tr>
      <tr><td>TCP Transfer Time Ratio</td><td class="num">${f(ttr, 2)}</td><td><span class="insignia aviso">Depende de BB</span></td></tr>
      <tr><td>Eficiencia TCP</td><td class="num">${f(eficiencia, 2)} %</td><td><span class="insignia ok">Medible</span> (Retr y captura)</td></tr>
      <tr><td>Retardo por búfer</td><td class="num">${f(bufPct, 0)} %</td><td><span class="insignia ok">Medible</span> RTT con carga ${f(rttCarga, 1)} ms</td></tr>
    </table></div></div>`);
    registrar(c, { prueba: 'iperf3 TCP', rttMedia: Red.media(rtts), goodput, n: rtts.length, ipdv: null, iplr: null });
    s.captura([
      ['TCP', IP.portatil, IP[dst], `52814 → 5201 [SYN] Win=64240 MSS=1460 WS=128`],
      ['TCP', IP[dst], IP.portatil, `5201 → 52814 [SYN, ACK] MSS=${mss + 12}`],
      ['TCP', IP[dst], IP.portatil, `5201 → 52814 [ACK] Len=${mss}`],
      ...(retx > 0 ? [['TCP', IP.portatil, IP[dst], '[TCP Dup ACK 412#1] 52814 → 5201 [ACK]'], ['TCP', IP.portatil, IP[dst], '[TCP Dup ACK 412#2]'], ['TCP', IP.portatil, IP[dst], '[TCP Dup ACK 412#3]'], ['TCP', IP[dst], IP.portatil, '[TCP Fast Retransmission] 5201 → 52814']] : []),
      ...(causa.startsWith('ventana') ? [['TCP', IP[dst], IP.portatil, '[TCP Window Full] 5201 → 52814']] : []),
    ]);
  }

  async function udp(c, s, t) {
    const ruta = Red.nodos(c), dst = ruta[ruta.length - 1];
    pantalla([`$ fping -c 1000 -p 60 ${IP[dst]}`, '(1000 sondas, una cada 60 ms ≈ 1 minuto)', `$ iperf3 -c ${IP[dst]} -u -b 5M -t 60`]);
    const vis = [];
    for (let k = 0; k < 24; k++) {
      const r = Red.muestraRTT(c, ruta, ruta.length - 1, { intervalo: 60 });
      vis.push(enviar(ruta, { radio: 0.1 }).then((ok) => ok && enviar([...ruta].reverse(), { color: r === null ? GRIS : AZUL, radio: 0.08, perder: r === null ? 0.5 : null })));
      await pausa(140, t);
    }
    await Promise.all(vis); comprobar(t);
    const muestras = []; let perdidas = 0;
    for (let k = 0; k < 1000; k++) { const r = Red.muestraRTT(c, ruta, ruta.length - 1, { intervalo: 60 }); if (r === null) perdidas++; else muestras.push(r); }
    const min = Math.min(...muestras), q999 = Red.percentil(muestras, 0.999);
    // iperf3: variación suavizada (RFC 3550) sobre tiempos de tránsito en un sentido
    let J = 0, prev = null, perdUdp = 0; const N = 5000;
    for (let k = 0; k < N; k++) {
      let d = 0, perdido = false;
      for (let i = 0; i < ruta.length - 1; i++) { if (Math.random() < Red.perdidaTramo(c, ruta[i], ruta[i + 1])) perdido = true; d += Red.retardoTramo(c, ruta[i], ruta[i + 1], 'subida', { intervalo: 2 }); }
      if (perdido) { perdUdp++; continue; }
      if (prev !== null) J += (Math.abs(d - prev) - J) / 16;
      prev = d;
    }
    const m = { prueba: 'fping + iperf3 UDP', rttMedia: Red.media(muestras), ipdv: q999 - min, iplr: perdidas / 1000, n: 1000 };
    registrar(c, m);
    const pct = [0.5, 0.9, 0.99, 0.999].map((q) => Red.percentil(muestras, q));
    const maxBar = Math.max(...pct);
    const barras = pct.map((v, i) => `<div style="display:flex;align-items:center;gap:6px;margin:2px 0"><span style="width:52px">${['p50', 'p90', 'p99', 'p99,9'][i]}</span><span style="height:12px;background:#3fa9f5;width:${Math.max(2, v / maxBar * 220)}px"></span><span>${f(v, 1)} ms</span></div>`).join('');
    s.resultados(`<div class="columnas"><div><table>
      <tr><th>Parámetro (fping, n = 1000)</th><th class="num">Valor</th></tr>
      <tr><td>RTT mínimo / medio</td><td class="num">${f(min, 2)} / ${f(m.rttMedia, 2)} ms</td></tr>
      <tr><td>IPDV Y.1541 = q(1−10⁻³) − mín. (sobre RTT)</td><td class="num">${f(m.ipdv, 2)} ms</td></tr>
      <tr><td>Pérdida ida y vuelta (IPLR)</td><td class="num">${perdidas} / 1000 = ${f(m.iplr * 100, 2)} %</td></tr>
      <tr><td>Jitter iperf3 (RFC 3550, suavizado)</td><td class="num">${f(J, 3)} ms</td></tr>
      <tr><td>Pérdida UDP iperf3 (un sentido)</td><td class="num">${f(perdUdp / N * 100, 3)} %</td></tr>
      </table><p class="nota">El jitter de iperf3 y la IPDV de Y.1541 miden cosas distintas: solo la segunda se compara con la tabla de clases.</p></div>
      <div><b>Distribución del RTT (cola larga)</b>${barras}</div></div>`);
    s.y1541();
    s.captura([['ICMP', IP.portatil, IP[dst], 'Echo (ping) request id=0x2a1f, seq=1/256'], ['ICMP', IP[dst], IP.portatil, 'Echo (ping) reply seq=1/256'],
      ['UDP', IP.portatil, IP[dst], '41523 → 5201 Len=1448 (iperf3)'], ['UDP', IP.portatil, IP[dst], '41523 → 5201 Len=1448 (iperf3)']]);
  }

  async function mtu(c, s, t) {
    const ruta = Red.nodos(c), dst = ruta[ruta.length - 1];
    const info = Red.mtuRuta(c.destino);
    const lineas = [`$ tracepath -n ${IP[dst]}`, ' 1?: [LOCALHOST]          pmtu 1500'];
    const saltos = ruta.map((id, i) => ({ id, i })).filter((x) => Red.INFO[x.id].salto);
    const iPE = ruta.indexOf('pe');
    let n = 1;
    for (const h of saltos) {
      comprobar(t);
      const cruzaPE = info.donde && h.i > iPE;
      if (cruzaPE && n === saltos.findIndex((x) => x.i > iPE) + 1 && !lineas.some((l) => l.includes('1492'))) {
        s.estado('Paquete de 1500 B con DF: no cabe en el enlace del proveedor (MTU 1492)');
        await enviar(ruta.slice(0, iPE + 1), { radio: 0.22, texto: '1500 B, DF' });
        if (c.icmpFiltrado) {
          const iBorde = ruta.indexOf('borde');
          await enviar(ruta.slice(iBorde, iPE + 1).reverse(), { color: AZUL, perder: 0.95, texto: 'ICMP «frag. necesaria»' });
          Escena.etiquetaFlotante('Cortafuegos descarta el ICMP: agujero negro', Escena.equipos.borde.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 3.5);
          lineas.push(` ${n}:  no reply  (agujero negro de PMTUD)`);
          s.estado('PLPMTUD: sondas de tamaño creciente sin depender de ICMP');
          for (const tam of [1200, 1400, 1492, 1500]) {
            const ok = await enviar(ruta, { radio: 0.1 + tam / 9000, texto: `${tam} B`, perder: tam > 1492 ? 0.55 : null });
            comprobar(t);
            if (ok) await enviar([...ruta].reverse(), { color: AZUL, radio: 0.1 });
          }
          lineas.push('     PLPMTUD: 1492 OK, 1500 sin respuesta → pmtu 1492');
        } else {
          await enviar(ruta.slice(0, iPE + 1).reverse(), { color: AZUL, texto: 'ICMP: MTU 1492' });
          lineas.push(` ${n}:  ${IP.pe.padEnd(16)}    pmtu 1492`);
        }
      }
      const rtt = Red.muestraRTT(c, ruta, h.i, { icmp: true });
      await enviar(ida(ruta, h.i), { radio: 0.18 });
      await enviar(vuelta(ruta, h.i), { color: AZUL, radio: 0.11 });
      lineas.push(` ${n}:  ${IP[h.id].padEnd(16)} ${rtt === null ? 'no reply' : f(rtt, 3) + 'ms'}`);
      n++;
    }
    lineas.push(`     Resume: pmtu ${info.mtu} hops ${saltos.length} back ${saltos.length}`);
    pantalla(lineas);
    s.resultados(`<div class="columnas"><pre>${lineas.join('\n')}</pre><div>
      <p><b>MTU efectiva:</b> ${info.mtu} bytes${info.donde ? ` (${info.motivo})` : ' (Ethernet en toda la ruta)'}.</p>
      <p><b>MSS TCP resultante:</b> ${info.mtu - 40} bytes (${info.mtu - 52} con marcas de tiempo).</p>
      <p><b>PMTUD clásico (RFC 1191/8201):</b> ${info.donde ? (c.icmpFiltrado ? '<span class="insignia mal">Falla</span> el ICMP no llega; las conexiones con paquetes grandes se detienen sin error.' : '<span class="insignia ok">Operativo</span>') : '<span class="insignia ok">No requerido</span>'}</p>
      <p class="nota">Es el primer paso de la RFC 6349. Luckie y Stasiewicz midieron fallas de PMTUD en el 5–18 % de los sitios.</p></div></div>`);
    s.captura([['ICMP', IP.portatil, IP[dst], 'Echo request, 1500 bytes, DF'], ...(info.donde && !c.icmpFiltrado ? [['ICMP', IP.pe, IP.portatil, 'Destination unreachable (Fragmentation needed) MTU 1492']] : [])]);
  }

  async function fases(c, s, t) {
    const ruta = Red.nodos(c), dst = ruta[ruta.length - 1];
    const rutaDNS = Red.nodos(c, 'dns');
    const rttDNS = Red.muestraRTT(c, rutaDNS, rutaDNS.length - 1) ?? 5;
    const rtt = () => Red.muestraRTT(c, ruta, ruta.length - 1, { intervalo: 5 }) ?? 80;
    const fallo = Math.random() < (c.franja === 'alta' ? 0.35 : 0.2);
    const tDNS = rttDNS + 0.2 + (fallo ? Red.U(25, 70) : 0);
    const host = c.destino === 'interno' ? 'web.lab.ies.edu.ec' : 'www.example.org';
    pantalla([`$ dig ${host} @${IP.dns}`, `;; Query time: ${Math.round(tDNS)} msec`, `$ curl --http2 -o /dev/null -s -w '...' https://${host}/`]);
    s.estado('Fase 1: resolución DNS');
    await enviar(rutaDNS, { texto: 'DNS consulta' });
    if (fallo) {
      const sal = ['dns', 'core', 'borde', 'pe', 'ispcore'];
      Escena.etiquetaFlotante('Fallo de caché: recursión', Escena.equipos.dns.position.clone().add(new THREE.Vector3(0, 1.2, 0)), 2);
      await enviar(sal, { color: VIOLETA }); await enviar([...sal].reverse(), { color: VIOLETA });
    }
    await enviar([...rutaDNS].reverse(), { color: AZUL, texto: 'DNS respuesta' }); comprobar(t);
    const rConn = rtt(), rTls = rtt(), rReq = rtt();
    const proc = Red.U(12, 45);
    const { bb } = Red.cuelloBotella(c);
    const tam = 1.6;                                                        // MB transferidos
    const rondas = Math.ceil(Math.log2(tam * 1e6 / (10 * 1448)));
    const tTransf = Math.min(rondas * rReq, rondas * rReq * 0.6) + tam * 8 / (bb * 0.85) * 1000;
    let tt;
    if (c.quic) {
      s.estado('QUIC: conexión y TLS 1.3 en un solo RTT (UDP 443)');
      await enviar(ruta, { texto: 'QUIC Initial (ClientHello)' }); await enviar([...ruta].reverse(), { color: AZUL, texto: 'Initial + Handshake' });
      tt = { dns: tDNS, conn: 0, tls: Math.max(rConn, rTls) + 2, ttfb: rReq + proc, transf: tTransf };
    } else {
      s.estado('Fase 2: conexión TCP');
      await enviar(ruta, { texto: 'SYN' }); await enviar([...ruta].reverse(), { color: AZUL, texto: 'SYN-ACK' });
      s.estado('Fase 3: negociación TLS 1.3');
      await enviar(ruta, { texto: 'ACK + ClientHello' }); await enviar([...ruta].reverse(), { color: AZUL, texto: 'ServerHello … Finished' });
      tt = { dns: tDNS, conn: rConn, tls: rTls + 1.5, ttfb: rReq + proc, transf: tTransf };
    }
    comprobar(t);
    s.estado('Fases 4 y 5: primer byte y transferencia');
    await enviar(ruta, { texto: 'GET /' });
    const datos = [];
    for (let k = 0; k < 8; k++) { datos.push(enviar([...ruta].reverse(), { color: AZUL, radio: 0.11, texto: k === 0 ? 'Primer byte' : null })); await pausa(120, t); }
    await Promise.all(datos);
    const acum = { namelookup: tt.dns, connect: tt.dns + tt.conn, appconnect: tt.dns + tt.conn + tt.tls };
    acum.starttransfer = acum.appconnect + tt.ttfb; acum.total = acum.starttransfer + tt.transf;
    const seg = [['DNS', tt.dns, '#ffd166'], ['TCP', tt.conn, '#06d6a0'], [c.quic ? 'QUIC+TLS' : 'TLS', tt.tls, '#4dd4ff'], ['Primer byte', tt.ttfb, '#c77dff'], ['Transferencia', tt.transf, '#ff9f1c']].filter((x) => x[1] > 0);
    const barra = seg.map(([n, v, col]) => `<div style="flex:${v};background:${col}" title="${n}: ${f(v)} ms">${v / acum.total > 0.07 ? n : ''}</div>`).join('');
    s.resultados(`<div class="linea-tiempo">${barra}</div><div class="columnas"><table>
      <tr><th>Variable de curl (acumulada)</th><th class="num">s</th><th>Fase</th><th class="num">ms</th></tr>
      <tr><td>time_namelookup</td><td class="num">${f(acum.namelookup / 1000, 4)}</td><td>Resolución DNS${fallo ? ' (sin caché)' : ''}</td><td class="num">${f(tt.dns)}</td></tr>
      <tr><td>time_connect</td><td class="num">${f(acum.connect / 1000, 4)}</td><td>${c.quic ? 'No aplica a QUIC' : 'Conexión TCP'}</td><td class="num">${f(tt.conn)}</td></tr>
      <tr><td>time_appconnect</td><td class="num">${f(acum.appconnect / 1000, 4)}</td><td>${c.quic ? 'QUIC + TLS 1.3 (1 RTT)' : 'TLS 1.3'}</td><td class="num">${f(tt.tls)}</td></tr>
      <tr><td>time_starttransfer</td><td class="num">${f(acum.starttransfer / 1000, 4)}</td><td>Espera del primer byte</td><td class="num">${f(tt.ttfb)}</td></tr>
      <tr><td>time_total</td><td class="num">${f(acum.total / 1000, 4)}</td><td>Transferencia (${tam} MB)</td><td class="num">${f(tt.transf)}</td></tr>
      </table><p class="nota">${c.quic ? 'Con HTTP/3 la conexión y TLS no se separan y la captura no muestra retransmisiones: estas sesiones se analizan aparte. curl se fija sobre TCP con --http2 o --http1.1.' : 'Cada fase apunta a una causa distinta: servicio de nombres, retardo de la ruta, servidor o tasa disponible.'}</p></div>`);
    s.captura([
      ['DNS', IP.portatil, IP.dns, `Standard query 0x5c1e A ${host}`], ['DNS', IP.dns, IP.portatil, `Standard query response A ${IP[dst]}`],
      ...(c.quic ? [['QUIC', IP.portatil, IP[dst], 'Initial, DCID=8f3c…, CRYPTO (ClientHello)'], ['QUIC', IP[dst], IP.portatil, 'Initial, Handshake'], ['QUIC', IP.portatil, IP[dst], 'Protected Payload (KP0)']]
        : [['TCP', IP.portatil, IP[dst], '50122 → 443 [SYN]'], ['TCP', IP[dst], IP.portatil, '443 → 50122 [SYN, ACK]'], ['TLSv1.3', IP.portatil, IP[dst], 'Client Hello (SNI=' + host + ')'],
          ['TLSv1.3', IP[dst], IP.portatil, 'Server Hello, Change Cipher Spec, Application Data'], ['TLSv1.3', IP.portatil, IP[dst], 'Application Data (GET /)']]),
    ]);
  }

  async function captura(c, s, t) {
    pantalla(['$ sudo tcpdump -i wlp2s0 -p -w sesion.pcapng host 10.20.34.57', 'tcpdump: listening on wlp2s0 (sin modo promiscuo)']);
    const burbuja = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7ae582, transparent: true, opacity: 0.12, depthWrite: false }));
    burbuja.position.copy(Escena.equipos.portatil.position).add(new THREE.Vector3(0, 0.5, 0));
    Escena.escena.add(burbuja);
    try {
      s.estado('DHCP: descubrimiento, oferta, solicitud y confirmación');
      const acc = c.medio === 'wifi' ? ['portatil', 'ap', 'swacc', 'core'] : ['portatil', 'roseta', 'swacc', 'core'];
      for (const [txt, sube] of [['DHCP Discover', true], ['DHCP Offer', false], ['DHCP Request', true], ['DHCP ACK', false]]) {
        await enviar(sube ? acc : [...acc].reverse(), { color: sube ? AMARILLO : AZUL, texto: txt }); comprobar(t);
      }
      s.estado('Tráfico de terceros: comparte el medio, pero no se captura');
      const terc = [];
      for (let k = 0; k < 6; k++) { terc.push(enviarTercero()); await pausa(200, t); }
      await Promise.all(terc);
      Escena.etiquetaFlotante('Fuera del filtro «host 10.20.34.57»', Escena.equipos.tel1.position.clone().add(new THREE.Vector3(0, 1.4, 0)), 3);
      await fases(c, { ...s, resultados: () => {}, captura: () => {} }, t);
    } finally { Escena.quitar(burbuja); }
    const ruta = Red.nodos(c), dst = ruta[ruta.length - 1];
    s.captura([
      ['DHCP', '0.0.0.0', '255.255.255.255', 'DHCP Discover - Transaction ID 0x3d1f'], ['DHCP', IP.core, IP.portatil, 'DHCP Offer'],
      ['DHCP', '0.0.0.0', '255.255.255.255', 'DHCP Request'], ['DHCP', IP.core, IP.portatil, 'DHCP ACK (router 10.20.32.1, DNS 10.20.1.53)'],
      ['DNS', IP.portatil, IP.dns, 'Standard query A'], ['DNS', IP.dns, IP.portatil, 'Standard query response'],
      ...(c.quic ? [['QUIC', IP.portatil, IP[dst], 'Initial (ClientHello)'], ['QUIC', IP[dst], IP.portatil, 'Handshake']]
        : [['TCP', IP.portatil, IP[dst], '[SYN]'], ['TCP', IP[dst], IP.portatil, '[SYN, ACK]'], ['TLSv1.3', IP.portatil, IP[dst], 'Client Hello']]),
    ]);
    s.resultados(`<p><b>Captura propia:</b> interfaz ${c.medio === 'wifi' ? 'wlp2s0' : 'enp1s0'}, sin modo promiscuo (<code>-p</code>), filtro de captura <code>host 10.20.34.57</code>.</p>
      <p>Se registran el intercambio DHCP, la resolución DNS, ${c.quic ? 'la sesión QUIC (tratada por separado)' : 'la conexión TCP y la negociación TLS'}. Los paquetes de los dispositivos de terceros (grises) comparten el canal, pero no entran en la captura.</p>
      <p class="nota">Vea la pestaña «Captura» para la lista de tramas.</p>`);
  }

  function enviarTercero() {
    const id = Math.random() < 0.5 ? 'tel1' : 'tel2';
    const a = Escena.equipos[id].position.clone().add(new THREE.Vector3(0, 0.2, 0));
    const b = new THREE.Vector3(-24, 4.75, -2);
    return new Promise((fin) => {
      const m = Escena.paquete(GRIS, 0.1);
      let k = 0, baja = null;
      const paso = (dt) => { k += dt * 0.9 * velocidad; m.position.lerpVectors(a, b, Math.min(1, k)); if (k >= 1) { Escena.quitar(m); baja(); fin(); } };
      baja = Escena.alCuadro(paso);
    });
  }

  const ESCENARIOS = {
    mtr: { fn: mtr, desc: 'Sondas ICMP con TTL creciente: cada salto IP responde «tiempo excedido». Muestra retardo, pérdida y qué equipos son invisibles por ser de capa 2.' },
    tcp: { fn: tcp, desc: 'Los tres pasos de la RFC 6349 (MTU, RTT base y BB, flujo TCP) y sus métricas, indicando cuáles son medibles desde el extremo y cuáles solo estimables.' },
    udp: { fn: udp, desc: '1000 sondas en ~1 minuto, como exige Y.1541 para el cuantil 1−10⁻³. Compara la IPDV con el jitter suavizado de iperf3.' },
    mtu: { fn: mtu, desc: 'Paquetes con DF de tamaño creciente. Active «El cortafuegos de borde descarta ICMP» para ver el agujero negro de PMTUD y su solución con PLPMTUD.' },
    fases: { fn: fases, desc: 'Descompone el tiempo de carga en DNS, TCP, TLS, primer byte y transferencia, con las variables de curl. Active HTTP/3 para ver QUIC.' },
    captura: { fn: captura, desc: 'Captura en la interfaz propia sin modo promiscuo: DHCP, DNS, TCP y TLS del estudiante; el tráfico de terceros queda fuera.' },
  };

  async function ejecutar(nombre, c, salida) {
    limpiar();
    const t = token;
    salida.estado('Ejecutando…');
    salida.wifi(c.medio === 'wifi' ? Red.wifi(c) : null, c);
    try {
      await ESCENARIOS[nombre].fn(c, salida, t);
      salida.estado(null);
      salida.y1541();
    } catch (e) {
      if (!(e instanceof Cancelado)) { console.error(e); salida.estado('Error: ' + e.message); } else salida.estado(null);
    }
  }

  return { ejecutar, detener: () => { limpiar(); }, ESCENARIOS, historial, evaluarY1541, f,
    set velocidad(v) { velocidad = v; } };
})();
