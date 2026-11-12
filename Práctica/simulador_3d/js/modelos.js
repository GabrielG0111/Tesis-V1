/* Modelos 3D de los equipos, construidos por partes para la vista anatómica.
 * Cada equipo es un THREE.Group con userData.partes = [{nombre, desc, obj, base, ex}],
 * donde «ex» es el desplazamiento de la parte en la vista explosionada.
 * Escala no real: los equipos se agrandan para que se distingan en la escena. */
const Modelos = (() => {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.15 }, o));
  const led = (color) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.6 });
  const M = {
    aluminio: std(0xb9c1c9, { metalness: 0.6, roughness: 0.35 }),
    metal: std(0x8e98a2, { metalness: 0.7, roughness: 0.35 }),
    negro: std(0x1c2026),
    grafito: std(0x2d343c),
    blanco: std(0xe8ecef, { roughness: 0.5 }),
    pcb: std(0x1e6b3c, { roughness: 0.75 }),
    chip: std(0x101214, { roughness: 0.4 }),
    oro: std(0xd8a822, { metalness: 0.9, roughness: 0.3 }),
    cobre: std(0xb87333, { metalness: 0.8, roughness: 0.35 }),
    puerto: std(0x050607, { roughness: 0.9 }),
    sfp: std(0xa7b0b8, { metalness: 0.85, roughness: 0.25 }),
    ventilador: std(0x23282e),
    dimm: std(0x234e9a),
    madera: std(0x8b6b4a, { roughness: 0.8 }),
    gestion: std(0x7a2a35, { roughness: 0.7 }),
    ledVerde: led(0x33ff66), ledAmbar: led(0xffaa00), ledAzul: led(0x3399ff), ledRojo: led(0xff3344),
  };

  const caja = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  const cil = (rt, rb, h, m, s = 28) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), m);
  const en = (o, x, y, z) => { o.position.set(x, y, z); return o; };
  const grupo = (...hijos) => { const g = new THREE.Group(); hijos.forEach((h) => g.add(h)); return g; };

  function instancias(geo, mat, pos) {
    const im = new THREE.InstancedMesh(geo, mat, pos.length);
    const o = new THREE.Object3D();
    pos.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(p[3] || 0, p[4] || 0, p[5] || 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    return im;
  }

  function equipo(id, tipo) {
    const g = new THREE.Group();
    g.name = id;
    g.userData = { equipo: id, tipo, partes: [] };
    return g;
  }

  function parte(g, obj, nombre, desc, ex = [0, 0, 0]) {
    g.add(obj);
    obj.traverse((o) => { o.userData.nombreParte = nombre; });
    g.userData.partes.push({ nombre, desc, obj, base: obj.position.clone(), ex: new THREE.Vector3(...ex) });
    return obj;
  }

  /* Puertos RJ45 en filas sobre una cara frontal (z = zf), con un LED por puerto. */
  function panelRJ45(n, filas, x0, paso, y0, dy, zf, ledMat = M.ledVerde) {
    const pos = [], leds = [];
    const porFila = Math.ceil(n / filas);
    for (let i = 0; i < n; i++) {
      const c = i % porFila, f = Math.floor(i / porFila);
      const x = x0 + c * paso, y = y0 + f * dy;
      pos.push([x, y, zf]);
      if (Math.random() < 0.7) leds.push([x + 0.032, y + 0.016, zf + 0.012]);
    }
    return grupo(
      instancias(new THREE.BoxGeometry(paso * 0.78, 0.042, 0.03), M.puerto, pos),
      instancias(new THREE.BoxGeometry(0.014, 0.01, 0.01), ledMat, leds),
    );
  }

  function jaulasSFP(n, x0, paso, y, zf) {
    const pos = [];
    for (let i = 0; i < n; i++) pos.push([x0 + i * paso, y, zf]);
    return instancias(new THREE.BoxGeometry(paso * 0.8, 0.035, 0.05), M.sfp, pos);
  }

  function ventiladores(n, x0, paso, y, z, r) {
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const v = en(cil(r, r, 0.04, M.ventilador, 20), x0 + i * paso, y, z);
      v.rotation.x = Math.PI / 2;
      const eje = en(cil(r * 0.3, r * 0.3, 0.05, M.metal, 12), 0, 0, 0);
      v.add(eje);
      g.add(v);
    }
    return g;
  }

  function disipador(w, d, h, aletas = 9) {
    const g = new THREE.Group();
    g.add(en(caja(w, 0.015, d, M.aluminio), 0, 0, 0));
    for (let i = 0; i < aletas; i++) g.add(en(caja(0.008, h, d, M.aluminio), -w / 2 + (i + 0.5) * (w / aletas), h / 2, 0));
    return g;
  }

  /* Texto de la pantalla del portátil (se actualiza durante las pruebas). */
  const lienzo = document.createElement('canvas');
  lienzo.width = 512; lienzo.height = 320;
  const texturaPantalla = new THREE.CanvasTexture(lienzo);
  function escribirPantalla(lineas) {
    const c = lienzo.getContext('2d');
    c.fillStyle = '#0b1220'; c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#1d2b44'; c.fillRect(0, 0, 512, 26);
    c.fillStyle = '#9fb4d8'; c.font = '16px monospace'; c.fillText('estudiante@portatil: ~', 10, 18);
    c.font = '19px monospace';
    lineas.slice(-11).forEach((l, i) => { c.fillStyle = l.startsWith('$') ? '#7ee787' : '#d6deeb'; c.fillText(l, 12, 52 + i * 24); });
    texturaPantalla.needsUpdate = true;
  }
  escribirPantalla(['$ ip -br addr show wlp2s0', 'wlp2s0  UP  10.20.34.57/22', '$ iw dev wlp2s0 get power_save', 'Power save: off', '$ _']);

  /* ---------------- Equipos ---------------- */

  function portatil(id) {
    const g = equipo(id, 'portatil');
    parte(g, en(caja(1.6, 0.07, 1.1, M.aluminio), 0, 0.035, 0), 'Chasis inferior',
      'Carcasa de aluminio que aloja la placa base, la batería, el almacenamiento y los puertos.');
    const teclas = [];
    for (let f = 0; f < 5; f++) for (let c = 0; c < 13; c++) teclas.push([-0.66 + c * 0.11, 0, -0.44 + f * 0.095]);
    parte(g, en(grupo(instancias(new THREE.BoxGeometry(0.092, 0.018, 0.078), M.negro, teclas)), 0, 0.078, 0), 'Teclado',
      'Desde aquí se lanzan iperf3, mtr, fping, tracepath, dig y curl, sin privilegios administrativos sobre la red.', [0, 0.45, 0]);
    parte(g, en(caja(0.5, 0.006, 0.28, M.grafito), 0, 0.072, 0.33), 'Panel táctil', 'Dispositivo de entrada.', [0, 0.3, 0.25]);
    const placa = en(caja(1.3, 0.02, 0.62, M.pcb), 0, 0.03, -0.15);
    placa.add(en(caja(0.16, 0.02, 0.16, M.chip), -0.2, 0.02, 0.0));
    placa.add(en(caja(0.22, 0.02, 0.08, M.chip), 0.15, 0.02, 0.15));
    parte(g, placa, 'Placa base y procesador',
      'Ejecuta la pila TCP/IP del sistema operativo (CUBIC como control de congestión) y las herramientas de medición.', [0, -0.5, -0.1]);
    parte(g, en(caja(1.3, 0.03, 0.34, M.grafito), 0, 0.025, 0.32), 'Batería',
      'Autonomía para medir en cada punto de asociación sin depender de un tomacorriente.', [0, -0.85, 0.25]);
    const wifi = en(caja(0.16, 0.012, 0.22, M.pcb), 0.5, 0.045, -0.12);
    wifi.add(en(caja(0.1, 0.004, 0.03, M.oro), 0, 0.006, 0.12));
    wifi.add(en(caja(0.08, 0.014, 0.08, M.metal), 0, 0.012, -0.03));
    [-0.04, 0.04].forEach((x) => { const a = en(cil(0.006, 0.006, 0.5, M.negro, 8), x, 0.01, -0.33); a.rotation.x = Math.PI / 2; wifi.add(a); });
    parte(g, wifi, 'Tarjeta Wi-Fi M.2 (802.11ac 2×2)',
      'Interfaz inalámbrica medida. Su controlador expone RSSI, MCS, tasa y reintentos (iw); el ahorro de energía se desactiva antes de medir y la captura se hace sin modo promiscuo.', [0.95, 0.2, 0]);
    parte(g, en(caja(0.1, 0.012, 0.4, M.negro), -0.45, 0.045, -0.12), 'Unidad SSD',
      'Guarda las capturas .pcapng y los registros de cada sesión.', [-0.85, 0.2, 0]);
    const rj = grupo(en(caja(0.045, 0.05, 0.1, M.puerto), 0, 0, 0), en(caja(0.05, 0.03, 0.03, M.chip), 0.08, -0.005, 0));
    parte(g, en(rj, -0.8, 0.035, 0.12), 'Interfaz Ethernet (RJ45)',
      'Interfaz cableada para las mediciones de control desde la roseta, que aíslan la contribución del tramo inalámbrico.', [-0.5, 0, 0]);
    const pantalla = new THREE.Group();
    pantalla.add(en(caja(1.6, 1.02, 0.035, M.aluminio), 0, 0.51, 0));
    const panel = en(new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.9), new THREE.MeshBasicMaterial({ map: texturaPantalla })), 0, 0.52, 0.019);
    pantalla.add(panel);
    [-0.4, 0.4].forEach((x) => pantalla.add(en(caja(0.18, 0.02, 0.01, M.negro), x, 1.0, 0.02)));
    pantalla.position.set(0, 0.07, -0.54);
    pantalla.rotation.x = -0.22;
    parte(g, pantalla, 'Pantalla y antenas',
      'Las dos antenas Wi-Fi van en el marco superior de la pantalla, conectadas a la tarjeta M.2.', [0, 0.45, -0.45]);
    return g;
  }

  function puntoAcceso(id) {
    const g = equipo(id, 'ap');
    parte(g, en(cil(0.42, 0.42, 0.03, M.metal), 0, 0, 0), 'Soporte de techo', 'Placa de montaje fijada al cielo raso del aula.', [0, 0.75, 0]);
    const radios = grupo(en(caja(0.22, 0.05, 0.18, M.metal), -0.15, 0, 0), en(caja(0.22, 0.05, 0.18, M.metal), 0.15, 0, 0));
    parte(g, en(radios, 0, -0.035, 0), 'Radios de 2,4 y 5 GHz',
      'Dos radios blindadas, una por banda. Cada una anuncia su SSID y emite balizas cada 102,4 ms.', [0, 0.55, 0]);
    parte(g, en(cil(0.46, 0.46, 0.02, M.pcb), 0, -0.06, 0), 'Placa principal',
      'Procesador y conmutador interno: el punto de acceso actúa como puente de capa 2 y no aparece como salto en mtr.', [0, 0.32, 0]);
    const ant = new THREE.Group();
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; ant.add(en(caja(0.12, 0.012, 0.05, M.oro), Math.cos(a) * 0.38, 0, Math.sin(a) * 0.38)); }
    parte(g, en(ant, 0, -0.075, 0), 'Antenas internas (MIMO 4×4)', 'Elementos radiantes internos para múltiples flujos espaciales.', [0, 0.12, 0]);
    parte(g, en(cil(0.55, 0.47, 0.14, M.blanco), 0, -0.11, 0), 'Carcasa (domo)', 'Cubierta plástica transparente a la radiofrecuencia.', [0, -0.45, 0]);
    parte(g, en(cil(0.06, 0.06, 0.02, M.ledVerde, 16), 0, -0.185, 0), 'LED de estado', 'Indica que el punto de acceso está operativo.', [0, -0.7, 0]);
    parte(g, en(caja(0.1, 0.06, 0.09, M.puerto), 0.32, 0.03, 0), 'Puerto Ethernet PoE (802.3at)',
      'Recibe datos y alimentación por el mismo cable UTP desde el switch de acceso.', [0.55, 0.3, 0]);
    return g;
  }

  function switchAcceso(id, n = 24) {
    const g = equipo(id, 'switch');
    parte(g, en(caja(2.2, 0.15, 1.2, M.grafito), 0, 0.075, 0), 'Chasis 1U', 'Bastidor metálico de 19 pulgadas montado en el rack.');
    parte(g, en(caja(2.2, 0.015, 1.2, M.metal), 0, 0.157, 0), 'Tapa superior', 'Cubierta removible.', [0, 0.65, 0]);
    parte(g, en(caja(2.0, 0.02, 1.0, M.pcb), 0, 0.03, -0.05), 'Placa principal', 'Interconecta puertos, ASIC y CPU de control.', [0, 0.32, 0]);
    const asic = grupo(en(caja(0.3, 0.03, 0.3, M.chip), 0, 0, 0), en(disipador(0.3, 0.3, 0.05), 0, 0.02, 0));
    parte(g, en(asic, 0.1, 0.055, -0.1), 'ASIC de conmutación',
      'Conmuta las tramas en capa 2 a velocidad de línea. Es un salto invisible para mtr, porque no decrementa el TTL.', [0, 0.5, 0]);
    parte(g, en(panelRJ45(n, 2, -0.95, 0.12, 0.05, 0.06, 0.6), 0, 0, 0), `${n} puertos RJ45 PoE+`,
      'Puertos de acceso: el punto de acceso del aula y la roseta del cable de control llegan aquí desde el patch panel.', [0, 0, 0.45]);
    parte(g, en(jaulasSFP(4, 0.6, 0.12, 0.075, 0.6), 0, 0, 0), 'Puertos SFP+ de enlace ascendente',
      'Enlace de fibra de 10 Gbit/s hacia el switch de núcleo.', [0.35, 0, 0.7]);
    parte(g, en(caja(0.5, 0.1, 0.4, M.metal), -0.75, 0.075, -0.35), 'Fuente de alimentación PoE', 'Alimenta el equipo y los dispositivos PoE conectados.', [-0.45, 0.35, -0.5]);
    parte(g, en(ventiladores(3, 0.2, 0.3, 0.075, -0.58, 0.06), 0, 0, 0), 'Ventiladores', 'Refrigeración forzada de adelante hacia atrás.', [0, 0.2, -0.55]);
    return g;
  }

  function switchNucleo(id) {
    const g = equipo(id, 'nucleo');
    parte(g, en(caja(2.2, 0.32, 1.3, M.grafito), 0, 0.16, 0), 'Chasis 2U', 'Bastidor modular del switch de núcleo de capa 3.');
    parte(g, en(caja(2.2, 0.015, 1.3, M.metal), 0, 0.325, 0), 'Tapa superior', 'Cubierta removible.', [0, 0.7, 0]);
    parte(g, en(caja(2.0, 0.02, 1.1, M.pcb), 0, 0.03, -0.05), 'Plano posterior (backplane)', 'Interconecta supervisora y tarjetas de línea.', [0, 0.3, 0]);
    const tarjeta = (y) => grupo(en(caja(1.5, 0.12, 0.9, M.pcb), 0, 0, -0.1), en(jaulasSFP(12, -0.66, 0.12, 0, 0.36), 0, 0, 0),
      en(caja(0.26, 0.04, 0.26, M.chip), 0.2, 0.08, -0.2));
    parte(g, en(tarjeta(), -0.25, 0.1, 0.3), 'Tarjeta de línea 1 (12 × SFP+)',
      'Recibe los enlaces de fibra de los switches de acceso del campus.', [0, 0.15, 0.9]);
    parte(g, en(tarjeta(), -0.25, 0.23, 0.3), 'Tarjeta de línea 2 (12 × SFP+)',
      'Enlaces hacia el centro de datos, el laboratorio y el cortafuegos de borde.', [0, 0.45, 1.2]);
    const sup = grupo(en(caja(0.5, 0.25, 0.9, M.pcb), 0, 0, 0), en(caja(0.18, 0.05, 0.18, M.chip), 0, 0.15, -0.1),
      en(caja(0.08, 0.05, 0.03, M.puerto), 0.1, 0.05, 0.46), en(caja(0.04, 0.02, 0.01, M.ledAzul), -0.1, 0.05, 0.46));
    parte(g, en(sup, 0.8, 0.165, 0.2), 'Supervisora (CPU de control)',
      'Ejecuta el enrutamiento y responde los ICMP «tiempo excedido»: es el primer salto (puerta de enlace) en mtr.', [0.6, 0.35, 0.9]);
    parte(g, en(grupo(en(caja(0.5, 0.13, 0.35, M.metal), -0.6, 0, 0), en(caja(0.5, 0.13, 0.35, M.metal), -0.6, 0.15, 0)), 0, 0.09, -0.48),
      'Fuentes redundantes', 'Dos fuentes de alimentación en caliente.', [-0.4, 0.3, -0.7]);
    parte(g, en(ventiladores(4, 0.05, 0.25, 0.16, -0.66, 0.09), 0, 0, 0), 'Bandeja de ventiladores', 'Módulo de refrigeración extraíble.', [0, 0.25, -0.6]);
    return g;
  }

  function cortafuegos(id) {
    const g = equipo(id, 'borde');
    parte(g, en(caja(2.2, 0.15, 1.1, M.negro), 0, 0.075, 0), 'Chasis 1U', 'Equipo de seguridad perimetral entre la red institucional y el proveedor.');
    parte(g, en(caja(2.2, 0.015, 1.1, M.metal), 0, 0.157, 0), 'Tapa superior', 'Cubierta removible.', [0, 0.6, 0]);
    parte(g, en(caja(2.0, 0.02, 0.95, M.pcb), 0, 0.03, -0.04), 'Placa principal', 'Soporta el procesador y las interfaces.', [0, 0.3, 0]);
    parte(g, en(grupo(en(caja(0.25, 0.03, 0.25, M.chip), 0, 0, 0), en(disipador(0.28, 0.28, 0.06), 0, 0.02, 0)), -0.2, 0.055, -0.15),
      'Procesador de inspección', 'Aplica NAT y las políticas de filtrado. Si descarta los ICMP «fragmentación necesaria», el PMTUD falla.', [0, 0.5, 0]);
    const dimms = new THREE.Group();
    for (let i = 0; i < 2; i++) dimms.add(en(caja(0.5, 0.06, 0.02, M.dimm), 0, 0, i * 0.05));
    parte(g, en(dimms, 0.4, 0.07, -0.15), 'Memoria RAM', 'Tablas de sesiones y de traducción de direcciones.', [0.3, 0.45, 0]);
    parte(g, en(grupo(panelRJ45(8, 1, -0.85, 0.12, 0.075, 0, 0.55, M.ledAmbar), jaulasSFP(2, 0.3, 0.14, 0.075, 0.55)), 0, 0, 0),
      'Interfaces LAN (RJ45) y WAN (SFP)', 'Las SFP conectan la fibra del proveedor; las RJ45, la red interna.', [0, 0, 0.45]);
    parte(g, en(caja(0.3, 0.07, 0.01, M.ledAzul), 0.8, 0.08, 0.555), 'Pantalla LCD', 'Estado del equipo.', [0.2, 0.15, 0.35]);
    parte(g, en(caja(0.45, 0.1, 0.35, M.metal), -0.75, 0.075, -0.33), 'Fuente de alimentación', 'Alimentación del equipo.', [-0.4, 0.3, -0.5]);
    parte(g, en(ventiladores(2, 0.4, 0.3, 0.075, -0.53, 0.06), 0, 0, 0), 'Ventiladores', 'Refrigeración del equipo.', [0, 0.2, -0.55]);
    return g;
  }

  function servidor(id, u = 1, nombreNic = 'NIC 10 GbE') {
    const g = equipo(id, 'servidor');
    const h = 0.17 * u;
    parte(g, en(caja(2.2, h, 1.4, M.grafito), 0, h / 2, 0), `Chasis ${u}U`, 'Servidor de rack.');
    parte(g, en(caja(2.2, 0.015, 1.4, M.metal), 0, h + 0.008, 0), 'Tapa superior', 'Cubierta removible.', [0, 0.7, 0]);
    parte(g, en(caja(2.0, 0.02, 1.1, M.pcb), 0, 0.03, -0.1), 'Placa base', 'Placa de doble zócalo.', [0, 0.32, 0]);
    const bahias = [];
    for (let i = 0; i < 8; i++) bahias.push([-0.95 + i * 0.13, h / 2, 0.69]);
    parte(g, en(grupo(instancias(new THREE.BoxGeometry(0.11, Math.min(h * 0.75, 0.25), 0.04), M.metal, bahias)), 0, 0, 0),
      'Bahías de discos', 'Discos en caliente con el sistema y los registros.', [0, 0, 0.5]);
    const cpus = grupo(en(disipador(0.26, 0.26, 0.07), -0.35, 0, 0), en(disipador(0.26, 0.26, 0.07), 0.25, 0, 0));
    parte(g, en(cpus, 0, 0.05, -0.1), 'Procesadores y disipadores', 'Atienden las conexiones de prueba.', [0, 0.55, 0]);
    const ram = new THREE.Group();
    for (let i = 0; i < 8; i++) ram.add(en(caja(0.012, 0.07, 0.3, M.dimm), -0.6 + i * 0.05 + (i > 3 ? 0.6 : 0), 0, 0));
    parte(g, en(ram, 0, 0.07, -0.1), 'Módulos de memoria', 'Memoria principal.', [0, 0.4, 0.25]);
    parte(g, en(grupo(en(caja(0.45, 0.02, 0.12, M.pcb), 0, 0, 0), en(caja(0.04, 0.05, 0.12, M.sfp), 0.24, 0, 0)), 0.7, 0.08, -0.55),
      nombreNic, 'Tarjeta de red PCIe por la que llegan los flujos de prueba.', [0.6, 0.35, -0.4]);
    parte(g, en(ventiladores(5, -0.6, 0.3, Math.min(h / 2, 0.1), 0.25, 0.06), 0, 0, 0), 'Fila de ventiladores', 'Refrigeración interna.', [0, 0.25, 0.2]);
    parte(g, en(grupo(en(caja(0.35, h * 0.8, 0.4, M.metal), -0.8, 0, 0), en(caja(0.35, h * 0.8, 0.4, M.metal), -0.4, 0, 0)), 0, h / 2, -0.5),
      'Fuentes redundantes', 'Dos fuentes de alimentación.', [-0.3, 0.3, -0.6]);
    return g;
  }

  function pcTorre(id) {
    const g = equipo(id, 'pc');
    parte(g, en(caja(0.7, 1.45, 1.4, M.negro), 0.05, 0.725, 0), 'Gabinete', 'Equipo del laboratorio de la carrera.');
    parte(g, en(caja(0.02, 1.4, 1.35, M.metal), -0.31, 0.725, 0), 'Panel lateral', 'Tapa removible.', [-0.8, 0, 0]);
    const placa = en(caja(0.02, 1.0, 0.95, M.pcb), 0.36, 0.85, 0.1);
    parte(g, placa, 'Placa base', 'Placa del equipo.', [-0.35, 0, 0]);
    const cpu = grupo(en(caja(0.3, 0.3, 0.3, M.aluminio), 0, 0, 0), en(cil(0.13, 0.13, 0.04, M.ventilador), -0.17, 0, 0));
    cpu.children[1].rotation.z = Math.PI / 2;
    parte(g, en(cpu, 0.18, 1.1, 0.15), 'Procesador y disipador', 'Ejecuta iperf3 en modo servidor (iperf3 -s).', [-0.6, 0.25, 0]);
    const ram = new THREE.Group();
    for (let i = 0; i < 2; i++) ram.add(en(caja(0.05, 0.4, 0.02, M.dimm), 0, 0, i * 0.05));
    parte(g, en(ram, 0.3, 1.1, -0.15), 'Memoria RAM', 'Memoria principal.', [-0.5, 0.45, -0.1]);
    parte(g, en(grupo(en(caja(0.25, 0.02, 0.4, M.pcb), 0, 0, 0), en(caja(0.04, 0.06, 0.05, M.puerto), 0, 0, -0.68)), 0.22, 0.6, 0.05),
      'NIC Gigabit Ethernet', 'Interfaz por la que el servidor interno recibe los flujos de prueba.', [-0.55, -0.1, -0.2]);
    parte(g, en(caja(0.6, 0.3, 0.5, M.grafito), 0.05, 0.16, -0.4), 'Fuente de alimentación', 'Fuente ATX.', [0, -0.45, -0.3]);
    parte(g, en(caja(0.3, 0.05, 0.4, M.metal), 0.1, 0.45, 0.45), 'Disco', 'Almacenamiento.', [-0.35, -0.2, 0.45]);
    return g;
  }

  function routerProveedor(id) {
    const g = equipo(id, 'isp');
    parte(g, en(caja(2.2, 0.32, 1.3, M.metal), 0, 0.16, 0), 'Chasis 2U', 'Enrutador del proveedor: no es accesible ni configurable desde la institución.');
    parte(g, en(grupo(jaulasSFP(10, -0.9, 0.14, 0.1, 0.66), jaulasSFP(10, -0.9, 0.14, 0.22, 0.66)), 0, 0, 0), 'Transceptores ópticos',
      'Puertos de fibra hacia los clientes y la red troncal del proveedor.', [0, 0, 0.5]);
    parte(g, en(caja(0.4, 0.25, 1.1, M.pcb), 0.85, 0.16, 0), 'Motor de enrutamiento', 'Puede limitar sus respuestas ICMP: una «pérdida» que solo aparece en un salto intermedio no es pérdida real.', [0.6, 0.3, 0]);
    return g;
  }

  function patchPanel(id) {
    const g = equipo(id, 'patch');
    parte(g, en(caja(2.3, 0.15, 0.08, M.negro), 0, 0.075, 0), 'Panel de parcheo 1U', 'Termina el cableado horizontal que llega de las aulas.');
    const k = [];
    for (let i = 0; i < 24; i++) k.push([-1.0 + (i % 12) * 0.12 + (i >= 12 ? 0 : 0), i < 12 ? 0.1 : 0.05, 0.045]);
    parte(g, en(grupo(instancias(new THREE.BoxGeometry(0.09, 0.04, 0.02), M.puerto, k)), 0, 0, 0), 'Conectores keystone Cat 6', '24 puertos RJ45 numerados por toma de pared.', [0, 0, 0.35]);
    parte(g, en(caja(2.3, 0.12, 0.25, M.grafito), 0, -0.1, -0.1), 'Organizador horizontal', 'Ordena los cables de parcheo.', [0, -0.3, 0]);
    return g;
  }

  function roseta(id) {
    const g = equipo(id, 'roseta');
    parte(g, en(caja(0.3, 0.3, 0.04, M.blanco), 0, 0, 0), 'Placa de pared', 'Toma de red del aula.');
    parte(g, en(caja(0.1, 0.08, 0.04, M.puerto), 0, 0.03, 0.03), 'Conector RJ45 Cat 6', 'Punto para las mediciones cableadas de control.', [0, 0, 0.3]);
    return g;
  }

  function telefono(id) {
    const g = equipo(id, 'tercero');
    g.add(en(caja(0.32, 0.03, 0.62, M.negro), 0, 0.015, 0));
    g.add(en(caja(0.29, 0.005, 0.57, new THREE.MeshStandardMaterial({ color: 0x223355, emissive: 0x112244 })), 0, 0.033, 0));
    g.userData.partes.push({ nombre: 'Dispositivo de un tercero', desc: 'Su tráfico no se captura ni se inspecciona.', obj: g.children[0], base: g.children[0].position.clone(), ex: new THREE.Vector3() });
    return g;
  }

  function estacionGestion(id) {
    const g = equipo(id, 'gestion');
    parte(g, en(caja(1.2, 0.75, 0.05, M.gestion), 0, 1.0, 0), 'Monitor', 'Consola del área de TI.');
    parte(g, en(caja(0.08, 0.6, 0.08, M.gestion), 0, 0.3, -0.05), 'Pedestal', 'Soporte del monitor.', [0, -0.2, 0]);
    parte(g, en(caja(0.5, 1.0, 0.9, M.gestion), 1.0, 0.5, 0), 'Servidor de gestión (SNMP, IPFIX)',
      'Plano de gestión: consulta contadores y flujos con credenciales administrativas. Fuera del alcance del proyecto.', [0.5, 0, 0]);
    return g;
  }

  function rack(alto = 4.2) {
    const g = new THREE.Group();
    const m = M.negro;
    [[-1.25, -0.75], [1.25, -0.75], [-1.25, 0.75], [1.25, 0.75]].forEach(([x, z]) => g.add(en(caja(0.1, alto, 0.1, m), x, alto / 2, z)));
    g.add(en(caja(2.6, 0.08, 1.6, m), 0, alto, 0));
    g.add(en(caja(2.6, 0.08, 1.6, m), 0, 0.04, 0));
    return g;
  }

  function nube() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: 0x9db4d0, transparent: true, opacity: 0.16, depthWrite: false });
    [[0, 0, 0, 3.4], [3, 0.6, 0.5, 2.6], [-3, 0.4, -0.4, 2.7], [1.2, 1.6, -0.8, 2.4], [-1.4, 1.5, 0.9, 2.2], [0.4, -0.6, 1.8, 2.0]]
      .forEach(([x, y, z, r]) => g.add(en(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m), x, y, z)));
    return g;
  }

  function escritorio(ancho = 3, prof = 1.6) {
    const g = new THREE.Group();
    g.add(en(caja(ancho, 0.08, prof, M.madera), 0, 1.0, 0));
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => g.add(en(caja(0.08, 1.0, 0.08, M.grafito), a * (ancho / 2 - 0.1), 0.5, b * (prof / 2 - 0.1))));
    return g;
  }

  return { M, portatil, puntoAcceso, switchAcceso, switchNucleo, cortafuegos, servidor, pcTorre, routerProveedor,
    patchPanel, roseta, telefono, estacionGestion, rack, nube, escritorio, escribirPantalla };
})();
