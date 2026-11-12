/* Modelo de la red: metadatos de cada equipo y generación de valores sintéticos
 * (retardo, pérdida, capacidad, indicadores Wi-Fi). Los números son ilustrativos:
 * reproducen el comportamiento esperado, no mediciones reales de la institución. */
const Red = (() => {
  const INFO = {
    portatil: { ip: '10.20.34.57 (DHCP)', capa: 'Extremo (capas 1–7)', plano: 'extremo',
      rol: 'Equipo del estudiante. Es el único punto de observación del proyecto: desde aquí se ejecutan la medición activa y la captura pasiva, con privilegios de usuario.',
      ifaces: 'wlp2s0 (Wi-Fi 802.11ac 2×2), enp1s0 (Ethernet 1 GbE)' },
    ap: { ip: 'Sin IP en la ruta (puente de capa 2)', capa: 'Capas 1–2', plano: 'infra',
      rol: 'Asocia al portátil a la red inalámbrica. Su contribución al retardo se estima por diferencia con el cable de control, no se observa directamente.',
      ifaces: 'Radio 2,4 GHz, radio 5 GHz (canal 36, 80 MHz), Ethernet PoE' },
    roseta: { ip: '—', capa: 'Capa 1 (pasivo)', plano: 'infra',
      rol: 'Toma de red del aula usada para las mediciones cableadas de control.', ifaces: 'RJ45 Cat 6' },
    tel1: { ip: 'Desconocida', capa: '—', plano: 'tercero',
      rol: 'Dispositivo de otro usuario. Comparte el medio inalámbrico (contienda), pero su tráfico no se captura: la interfaz opera sin modo promiscuo y con filtro «host 10.20.34.57».', ifaces: '—' },
    tel2: { ip: 'Desconocida', capa: '—', plano: 'tercero', rol: 'Dispositivo de otro usuario.', ifaces: '—' },
    patch: { ip: '—', capa: 'Capa 1 (pasivo)', plano: 'infra',
      rol: 'Termina el cableado horizontal que llega del aula; los cables de parcheo lo unen al switch.', ifaces: '24 conectores keystone' },
    swacc: { ip: 'Sin IP en la ruta (capa 2)', capa: 'Capa 2', plano: 'infra',
      rol: 'Agrega los puntos de acceso y las rosetas del piso. Como no decrementa el TTL, no aparece en mtr ni en tracepath.',
      ifaces: '24 × RJ45 PoE+, 4 × SFP+ 10 GbE' },
    core: { ip: '10.20.32.1 (puerta de enlace)', capa: 'Capa 3', plano: 'infra', salto: true,
      rol: 'Primer salto IP. Enruta entre las VLAN del campus, el centro de datos, el laboratorio y el borde.',
      ifaces: '24 × SFP+ 10 GbE, supervisora' },
    dns: { ip: '10.20.1.53', capa: 'Capa 7 (DNS recursivo)', plano: 'infra',
      rol: 'Resolutor DNS institucional entregado por DHCP. dig mide su tiempo de respuesta, desde caché o con recursión.', ifaces: 'NIC 10 GbE' },
    swlab: { ip: 'Sin IP en la ruta (capa 2)', capa: 'Capa 2', plano: 'infra', rol: 'Switch del laboratorio de la carrera.', ifaces: '16 × RJ45, 4 × SFP+' },
    labpc: { ip: '10.20.60.10', capa: 'Extremo remoto', plano: 'extremo', salto: true,
      rol: 'Destino interno: un equipo del laboratorio que ejecuta «iperf3 -s» con autorización de su responsable. Acota la contribución de la ruta externa.',
      ifaces: 'NIC 1 GbE' },
    gestion: { ip: '10.20.250.10', capa: 'Plano de gestión', plano: 'gestion',
      rol: 'Consulta contadores SNMP y flujos IPFIX con credenciales administrativas. Está FUERA del alcance: el proyecto no la usa ni la necesita.',
      ifaces: 'Ethernet de gestión' },
    borde: { ip: '10.20.255.1 / 198.51.100.2', capa: 'Capas 3–7', plano: 'infra', salto: true,
      rol: 'Cortafuegos con NAT entre el campus y el proveedor. Si descarta el ICMP «fragmentación necesaria», el PMTUD clásico falla en silencio.',
      ifaces: '8 × RJ45 LAN, 2 × SFP WAN' },
    pe: { ip: '198.51.100.1', capa: 'Capa 3 (proveedor)', plano: 'proveedor', salto: true,
      rol: 'Enrutador de borde del proveedor. Su enlace de acceso (1 Gbit/s contratado) es el cuello de botella hacia Internet en la franja alta.',
      ifaces: 'Fibra hacia el cliente y la red troncal' },
    ispcore: { ip: '198.51.100.9', capa: 'Capa 3 (proveedor)', plano: 'proveedor', salto: true,
      rol: 'Red troncal del proveedor. Limita la tasa de sus respuestas ICMP, lo que en mtr se ve como una «pérdida» que no es real.', ifaces: 'Fibra' },
    transito: { ip: '203.0.113.1', capa: 'Capa 3 (tránsito)', plano: 'proveedor', salto: true,
      rol: 'Red de tránsito o punto de intercambio hacia el centro de datos externo.', ifaces: 'Fibra' },
    srv: { ip: '203.0.113.50', capa: 'Extremo remoto', plano: 'extremo', salto: true,
      rol: 'Servidor público de referencia: atiende «iperf3 -s» y un sitio web para curl. Su ruta incluye la red del proveedor y redes externas.',
      ifaces: 'NIC 10 GbE' },
  };

  const PLANO = { extremo: ['Plano del extremo', 'ok'], infra: ['Infraestructura (sin acceso)', 'aviso'], gestion: ['Plano de gestión: excluido', 'mal'],
    proveedor: ['Red externa', 'aviso'], tercero: ['Tráfico de terceros: no se captura', 'mal'] };

  /* ---------- utilidades aleatorias ---------- */
  const U = (a, b) => a + Math.random() * (b - a);
  const expo = (media) => -Math.log(1 - Math.random()) * media;
  const normal = (m, s) => m + s * Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());

  /* ---------- acceso inalámbrico ---------- */
  const TASAS_VHT80_2SS = { 9: 866.7, 8: 780, 7: 650, 6: 585, 5: 520, 4: 390, 3: 260, 2: 195, 1: 130, 0: 65 };
  const PERFIL = {
    cerca: { rssi: -48, reint: 0.04, perd: 0.00002 },
    medio: { rssi: -63, reint: 0.09, perd: 0.00008 },
    lejos: { rssi: -76, reint: 0.21, perd: 0.0008 },
  };
  function wifi(c) {
    const p = PERFIL[c.punto], alta = c.franja === 'alta';
    const ruido = alta ? -90 : -92;
    const rssi = Math.round(normal(p.rssi, 1.5));
    const snr = rssi - ruido;
    const mcs = snr >= 38 ? 9 : snr >= 34 ? 8 : snr >= 29 ? 7 : snr >= 26 ? 6 : snr >= 23 ? 5 : snr >= 19 ? 4 : snr >= 15 ? 3 : snr >= 12 ? 2 : snr >= 9 ? 1 : 0;
    const reint = Math.min(0.6, p.reint * (alta ? 1.8 : 1) + (c.psm ? 0.01 : 0));
    const util = alta ? 0.68 : 0.22;                      // utilización del canal (contienda)
    const phy = TASAS_VHT80_2SS[mcs];
    const capacidad = phy * 0.62 * (1 - reint) * (1 - util * 0.85);
    return { rssi, ruido, snr, mcs, phy, reint, util, capacidad, banda: '5 GHz', canal: 36, ancho: 80, estandar: '802.11ac (Wi-Fi 5), 2 flujos' };
  }

  /* ---------- rutas ---------- */
  function acceso(c) { return c.medio === 'wifi' ? ['portatil', 'ap', 'swacc'] : ['portatil', 'roseta', 'swacc']; }
  function nodos(c, destino = c.destino) {
    const a = acceso(c);
    if (destino === 'interno') return [...a, 'core', 'swlab', 'labpc'];
    if (destino === 'dns') return [...a, 'core', 'dns'];
    return [...a, 'core', 'borde', 'pe', 'ispcore', 'transito', 'srv'];
  }

  /* Retardo en un sentido de cada enlace o equipo (ms). */
  function retardoTramo(c, de, a, sentido, opc = {}) {
    const alta = c.franja === 'alta';
    const k = [de, a].sort().join('|');
    switch (k) {
      case 'ap|portatil': {
        const w = PERFIL[c.punto];
        let d = 0.5 + expo(alta ? 3.2 : 0.7);
        if (Math.random() < w.reint * (alta ? 1.8 : 1)) d += expo(1.6);
        if (alta && Math.random() < 0.03) d += U(15, 70);   // ráfagas de contienda: cola larga
        if (c.psm && sentido === 'bajada' && (opc.intervalo || 1000) >= 100 && Math.random() < 0.85) d += U(0, 102.4);
        return d;
      }
      case 'portatil|roseta': return 0.03 + expo(0.01);
      case 'ap|swacc': case 'roseta|swacc': return 0.03 + expo(0.01);
      case 'core|swacc': return 0.02 + expo(alta ? 0.12 : 0.02);
      case 'core|dns': case 'core|swlab': case 'labpc|swlab': return 0.03 + expo(0.01);
      case 'borde|core': return 0.05 + (alta ? 0.8 + expo(0.6) : 0.25 + expo(0.05));
      case 'borde|pe': return alta ? 1.5 + expo(4) : 0.8 + expo(0.2);
      case 'ispcore|pe': return 3.5 + expo(0.3);
      case 'ispcore|transito': return 28 + expo(0.5);
      case 'srv|transito': return 1.2 + expo(0.2);
      default: return 0.05;
    }
  }

  function perdidaTramo(c, de, a) {
    const alta = c.franja === 'alta';
    const k = [de, a].sort().join('|');
    if (k === 'ap|portatil') return PERFIL[c.punto].perd * (alta ? 3 : 1);   // pérdida residual tras los reintentos MAC
    if (k === 'borde|pe') return alta ? 0.0003 : 0.00001;                      // descartes por congestión del enlace contratado
    return 0.000005;
  }

  /* Una muestra de RTT hasta el nodo de índice «hasta» de la ruta; null si se pierde. */
  function muestraRTT(c, ruta, hasta, opc = {}) {
    let total = 0;
    for (let i = 0; i < hasta; i++) {
      const de = ruta[i], a = ruta[i + 1];
      if (Math.random() < perdidaTramo(c, de, a) || Math.random() < perdidaTramo(c, a, de)) return null;
      total += retardoTramo(c, de, a, 'subida', opc) + retardoTramo(c, de, a, 'bajada', opc);
    }
    const nodo = ruta[hasta];
    if (opc.icmp && nodo !== 'srv' && nodo !== 'labpc' && nodo !== 'dns') {
      total += U(0.2, 1.5);                                   // generación del ICMP en el plano de control
      if (nodo === 'ispcore') { if (Math.random() < 0.3) return null; total += U(3, 12); }
    }
    return total;
  }

  function perdidaRuta(c, ruta) {
    let p = 0;
    for (let i = 0; i < ruta.length - 1; i++) p += perdidaTramo(c, ruta[i], ruta[i + 1]) + perdidaTramo(c, ruta[i + 1], ruta[i]);
    return p;
  }

  /* Ancho de banda del cuello de botella de la ruta (Mbit/s). */
  function cuelloBotella(c, destino = c.destino) {
    const accesoMbps = c.medio === 'wifi' ? wifi(c).capacidad : 1000;
    const resto = destino === 'interno' ? 1000 : (c.franja === 'alta' ? 95 : 520);
    return { bb: Math.min(accesoMbps, resto), limita: accesoMbps < resto ? (c.medio === 'wifi' ? 'acceso inalámbrico' : 'interfaz Ethernet') : (destino === 'interno' ? 'NIC del servidor interno' : 'enlace contratado al proveedor') };
  }

  function mtuRuta(destino) {
    return destino === 'publico' ? { mtu: 1492, donde: 'pe', motivo: 'túnel con encapsulación PPPoE dentro de la red del proveedor' } : { mtu: 1500, donde: null };
  }

  const percentil = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
  const media = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const desv = (arr) => { const m = media(arr); return Math.sqrt(media(arr.map((x) => (x - m) ** 2))); };

  return { INFO, PLANO, wifi, nodos, retardoTramo, perdidaTramo, muestraRTT, perdidaRuta, cuelloBotella, mtuRuta,
    percentil, media, desv, U, expo, normal };
})();
