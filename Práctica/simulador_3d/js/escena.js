/* Escena 3D: zonas del campus, ubicación de los equipos, cableado, etiquetas,
 * selección con el ratón y vista anatómica (explosionada) de cada equipo. */
const Escena = (() => {
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let renderer, escena, camara, controles, contenedor, capaEtq;
  const equipos = {};            // id -> THREE.Group
  const enlaces = {};            // "a|b" -> {de, a, tipo, curva, malla}
  const etiquetas = [];          // {div, obj, dy, pos}
  const porCuadro = [];          // callbacks(dt)
  let seleccionado = null, cajaSel = null, anatomia = 0, anatomiaObjetivo = 0;
  let etiquetasPartes = [];
  let tweenCam = null;

  const COLORES = { utp: 0x3fa9f5, fibra: 0xff9f1c, wan: 0xc77dff, gestion: 0xff4d6d, wifi: 0x7ae582 };

  /* Posiciones de los puntos de asociación (escritorios) del aula. */
  const PUNTOS = { cerca: V(-23, 0, 1), medio: V(-18.5, 0, 4), lejos: V(-30, 0, 4.5) };

  const CAMARAS = {
    general: { pos: V(9, 50, 60), mira: V(9, 0, 2) },
    aula: { pos: V(-24, 11, 15), mira: V(-24, 2, 0) },
    idf: { pos: V(-9, 5, 8), mira: V(-9, 2.8, 0) },
    mdf: { pos: V(6, 8, 13), mira: V(6, 1.8, 3) },
    borde: { pos: V(30, 12, 22), mira: V(32, 2, 0) },
  };

  function iniciar(div) {
    contenedor = div;
    capaEtq = document.getElementById('etiquetas');
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    contenedor.appendChild(renderer.domElement);
    escena = new THREE.Scene();
    escena.background = new THREE.Color(0x0d1117);
    escena.fog = new THREE.Fog(0x0d1117, 70, 140);
    camara = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    camara.position.copy(CAMARAS.general.pos);
    controles = new THREE.OrbitControls(camara, renderer.domElement);
    controles.target.copy(CAMARAS.general.mira);
    controles.enableDamping = true;
    controles.maxPolarAngle = Math.PI * 0.49;
    controles.maxDistance = 120;

    escena.add(new THREE.HemisphereLight(0xe4ecff, 0x1a1f28, 0.9));
    const sol = new THREE.DirectionalLight(0xffffff, 0.9); sol.position.set(20, 40, 25); escena.add(sol);
    const rel = new THREE.DirectionalLight(0x9db8ff, 0.4); rel.position.set(-30, 20, -20); escena.add(rel);

    construirZonas();
    construirEquipos();
    construirCableado();
    window.addEventListener('resize', redimensionar);
    renderer.domElement.addEventListener('pointerdown', alPresionar);
    renderer.domElement.addEventListener('pointerup', alSoltar);
    redimensionar();
    let previo = performance.now();
    (function bucle(ahora) {
      const dt = Math.min(0.05, (ahora - previo) / 1000); previo = ahora;
      actualizar(dt);
      renderer.render(escena, camara);
      requestAnimationFrame(bucle);
    })(previo);
  }

  /* El lienzo ocupa toda la ventana, pero el centro de la proyección se desplaza
   * al hueco que dejan libre los paneles, para que la escena no quede tapada. */
  function redimensionar() {
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    renderer.setSize(w, h); camara.aspect = w / h;
    const top = contenedor.getBoundingClientRect().top;
    const rect = (sel) => { const e = document.querySelector(sel); return e && getComputedStyle(e).display !== 'none' ? e.getBoundingClientRect() : null; };
    const izq = rect('#panel-control'), der = rect('#panel-info'), abajo = rect('#panel-resultados');
    const x0 = izq ? izq.right : 0, x1 = der ? der.left : w;
    const y1 = abajo ? abajo.top - top : h;
    const sx = (x0 + x1) / 2 - w / 2, sy = y1 / 2 - h / 2;
    const ax = Math.abs(sx), ay = Math.abs(sy);
    // el recorte de la vista desplazada acercaría la imagen: se amplía el campo visual para compensarlo
    camara.fov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(45) / 2) * (h + 2 * ay) / h) * 180 / Math.PI;
    camara.aspect = (w + 2 * ax) / (h + 2 * ay);
    camara.setViewOffset(w + 2 * ax, h + 2 * ay, ax - sx, ay - sy, w, h);
    camara.updateProjectionMatrix();
  }

  /* ---------------- Zonas y mobiliario ---------------- */

  function piso(cx, cz, w, d, color, nombre) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, d), new THREE.MeshStandardMaterial({ color, roughness: 0.9 }));
    m.position.set(cx, -0.05, cz); escena.add(m);
    const borde = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x3a4a5e }));
    borde.position.copy(m.position); escena.add(borde);
    const ancla = new THREE.Object3D(); ancla.position.set(cx - w / 2 + 0.3, 0.1, cz + d / 2 - 0.3); escena.add(ancla);
    etiqueta(nombre, ancla, 'zona', 0, true);
  }

  function pared(x, z, w, h, d, opacidad = 0.25) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color: 0x6f7f92, transparent: true, opacity: opacidad, depthWrite: false }));
    m.position.set(x, h / 2, z); escena.add(m); return m;
  }

  function construirZonas() {
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(260, 160), new THREE.MeshStandardMaterial({ color: 0x0f141b }));
    suelo.rotation.x = -Math.PI / 2; suelo.position.y = -0.12; escena.add(suelo);
    const grid = new THREE.GridHelper(200, 100, 0x1b2430, 0x151c25); grid.position.y = -0.11; escena.add(grid);

    piso(-24, 0, 16, 14, 0x1d2a38, 'Aula — espacio de uso común (segmento de acceso)');
    piso(-9, 0, 8, 8, 0x22303f, 'Cuarto de telecomunicaciones');
    piso(6, 0, 12, 10, 0x22303f, 'Centro de datos del campus');
    piso(6, 13, 10, 7, 0x1d2a38, 'Laboratorio de la carrera');
    piso(18, 0, 6, 7, 0x2a2638, 'Borde de la red');
    piso(46, 0, 7, 7, 0x2a2638, 'Centro de datos externo');

    pared(-24, -7, 16, 5, 0.12, 0.18);
    pared(-27.5, 4, 0.15, 3.2, 6, 0.45);            // tabique que atenúa la señal en P3
    Object.values(PUNTOS).forEach((p) => { const e = Modelos.escritorio(); e.position.copy(p); escena.add(e); });
    [V(-21, 0, -2.5), V(-26.5, 0, 0.5)].forEach((p) => { const e = Modelos.escritorio(2.4, 1.4); e.position.copy(p); escena.add(e); });
    const varilla = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8), new THREE.MeshStandardMaterial({ color: 0x8e98a2 }));
    varilla.position.set(-24, 5.3, -2); escena.add(varilla);                 // sujeción del punto de acceso al techo
    const mesaLab = Modelos.escritorio(4, 1.8); mesaLab.position.set(6, 0, 13); escena.add(mesaLab);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x2b2f3a }));
    ped.position.set(26, 0.75, 0); escena.add(ped);
    const nube = Modelos.nube(); nube.position.set(32, 3.6, 0); nube.scale.setScalar(1.25); escena.add(nube);
    const etqNube = new THREE.Object3D(); etqNube.position.set(32, 8.4, 0); escena.add(etqNube);
    etiqueta('Internet: redes del proveedor y de tránsito', etqNube, 'zona', 0, true);
  }

  /* ---------------- Equipos ---------------- */

  const UBICACION = [
    // id, constructor, posición, rotación Y, nombre visible, en rack
    ['portatil', () => Modelos.portatil('portatil'), V(-18.5, 1.04, 4), 0, 'Portátil del estudiante (cliente)'],
    ['ap', () => Modelos.puntoAcceso('ap'), V(-24, 5.0, -2), 0, 'Punto de acceso Wi-Fi'],
    ['roseta', () => Modelos.roseta('roseta'), V(-20, 0.6, -6.9), 0, 'Roseta RJ45 (cable de control)'],
    ['tel1', () => Modelos.telefono('tel1'), V(-21.3, 1.04, -2.4), 0.4, 'Dispositivo de un tercero'],
    ['tel2', () => Modelos.telefono('tel2'), V(-26.8, 1.04, 0.5), -0.3, 'Dispositivo de un tercero'],
    ['patch', () => Modelos.patchPanel('patch'), V(-9, 3.3, 0.6), 0, 'Patch panel', true],
    ['swacc', () => Modelos.switchAcceso('swacc', 24), V(-9, 2.85, 0), 0, 'Switch de acceso PoE (capa 2)', true],
    ['core', () => Modelos.switchNucleo('core'), V(4, 2.4, 0), 0, 'Switch de núcleo L3 (puerta de enlace)', true],
    ['dns', () => Modelos.servidor('dns', 1), V(4, 1.6, 0), 0, 'Resolutor DNS institucional', true],
    ['swlab', () => Modelos.switchAcceso('swlab', 16), V(4.8, 1.08, 12.6), 0, 'Switch del laboratorio'],
    ['labpc', () => Modelos.pcTorre('labpc'), V(9, 0, 13), 0, 'Servidor iperf3 interno (laboratorio)'],
    ['gestion', () => Modelos.estacionGestion('gestion'), V(10, 0, -2.8), -0.5, 'Estación de gestión (SNMP/IPFIX)'],
    ['borde', () => Modelos.cortafuegos('borde'), V(18, 2.0, 0), 0, 'Cortafuegos / enrutador de borde', true],
    ['pe', () => Modelos.routerProveedor('pe'), V(26, 1.5, 0), 0, 'Enrutador del proveedor (PE)'],
    ['ispcore', () => Modelos.routerProveedor('ispcore'), V(32, 3.2, -1.5), 0, 'Red troncal del proveedor'],
    ['transito', () => Modelos.routerProveedor('transito'), V(38, 2.0, 1), 0, 'Red de tránsito / IXP'],
    ['srv', () => Modelos.servidor('srv', 2), V(46, 2.0, 0), 0, 'Servidor público de referencia (iperf3, web)', true],
  ];

  function construirEquipos() {
    [[-9, 0], [4, 0], [18, 0], [46, 0]].forEach(([x, z]) => { const r = Modelos.rack(); r.position.set(x, 0, z); escena.add(r); });
    UBICACION.forEach(([id, crear, pos, rotY, nombre, enRack]) => {
      const g = crear();
      g.position.copy(pos); g.rotation.y = rotY;
      g.userData.nombre = nombre; g.userData.enRack = !!enRack; g.userData.posBase = pos.clone();
      escena.add(g);
      equipos[id] = g;
      const caja = new THREE.Box3().setFromObject(g);
      g.userData.alto = caja.max.y - pos.y;
      const tipo = id === 'gestion' ? 'gestion' : '';
      if (!id.startsWith('tel') || id === 'tel1') etiqueta(nombre, g, tipo, g.userData.alto + 0.25);
    });
  }

  /* ---------------- Cableado ---------------- */

  function crearEnlace(de, a, tipo, puntos) {
    const clave = [de, a].sort().join('|');
    const e = { de, a, tipo, puntos, curva: null, malla: null };
    enlaces[clave] = e;
    trazar(e);
    return e;
  }

  function trazar(e) {
    if (e.malla) { escena.remove(e.malla); e.malla.geometry.dispose(); }
    e.curva = new THREE.CatmullRomCurve3(e.puntos, false, 'centripetal');
    e.longitud = e.curva.getLength();
    const color = COLORES[e.tipo];
    if (e.tipo === 'wifi' || e.tipo === 'gestion') {
      const geo = new THREE.BufferGeometry().setFromPoints(e.curva.getPoints(60));
      e.malla = new THREE.Line(geo, new THREE.LineDashedMaterial({ color, dashSize: 0.35, gapSize: 0.25 }));
      e.malla.computeLineDistances();
    } else {
      const radio = e.tipo === 'wan' ? 0.07 : 0.045;
      e.malla = new THREE.Mesh(new THREE.TubeGeometry(e.curva, Math.max(40, e.puntos.length * 16), radio, 8, false),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.5 }));
    }
    escena.add(e.malla);
  }

  const puertoPortatil = () => equipos.portatil.position.clone().add(V(-0.85, 0.04, 0.12));
  const antenaPortatil = () => equipos.portatil.position.clone().add(V(0, 1.05, -0.65));

  function puntosWifi() { return [antenaPortatil(), V(-24, 4.75, -2)]; }
  function puntosCableControl() {
    const p = puertoPortatil();
    return [p, V(p.x - 0.4, 1.0, p.z), V(p.x - 0.5, 0.06, p.z), V(-20, 0.06, -6.5), V(-20, 0.3, -6.85), V(-20, 0.58, -6.85)];
  }

  function construirCableado() {
    crearEnlace('portatil', 'ap', 'wifi', puntosWifi());
    crearEnlace('portatil', 'roseta', 'utp', puntosCableControl());
    crearEnlace('ap', 'swacc', 'utp', [V(-24, 5.05, -2), V(-24, 5.6, -2), V(-17, 5.6, -0.6), V(-10.4, 5.6, 0.95),
      V(-9.6, 4.3, 0.95), V(-9.6, 3.4, 0.72), V(-9.45, 3.12, 0.9), V(-9.35, 2.92, 0.66)]);
    crearEnlace('roseta', 'swacc', 'utp', [V(-20, 0.6, -6.95), V(-20, 0.6, -7.25), V(-20, 5.75, -7.25), V(-13, 5.75, -1),
      V(-10.2, 5.75, 1.0), V(-9.85, 4.3, 1.0), V(-9.85, 3.42, 0.72), V(-9.7, 3.12, 0.92), V(-9.59, 2.92, 0.66)]);
    crearEnlace('swacc', 'core', 'fibra', [V(-8.2, 2.93, 0.66), V(-8.0, 3.6, 0.95), V(-7.6, 5.9, 0.95), V(2.6, 5.9, 0.95),
      V(3.2, 4.4, 0.95), V(3.35, 2.62, 0.72)]);
    crearEnlace('core', 'dns', 'fibra', [V(4.55, 2.62, 0.72), V(4.85, 2.2, 1.0), V(4.7, 1.69, 0.73)]);
    crearEnlace('core', 'swlab', 'fibra', [V(3.8, 2.75, 0.72), V(3.9, 1.0, 1.1), V(4.0, 0.08, 1.6), V(4.6, 0.08, 9.5),
      V(4.8, 0.9, 12.3), V(5.6, 1.15, 12.4)]);
    crearEnlace('swlab', 'labpc', 'utp', [V(4.4, 1.14, 13.22), V(4.4, 1.0, 13.7), V(8.0, 0.08, 13.9), V(8.6, 0.5, 13.75)]);
    crearEnlace('core', 'gestion', 'gestion', [V(4.4, 2.75, 0.72), V(4.8, 0.08, 1.6), V(9.6, 0.08, -1.3), V(10.5, 0.5, -2.5)]);
    crearEnlace('core', 'borde', 'fibra', [V(3.6, 2.85, 0.72), V(3.7, 4.4, 1.0), V(4.2, 6.1, 1.0), V(17.2, 6.1, 1.0),
      V(17.7, 4.3, 0.95), V(17.8, 2.08, 0.6)]);
    crearEnlace('borde', 'pe', 'wan', [V(18.6, 2.08, 0.6), V(18.8, 4.3, 0.95), V(20, 5.2, 0.95), V(24.5, 3.0, 0.8), V(25.6, 1.7, 0.7)]);
    crearEnlace('pe', 'ispcore', 'wan', [V(27.1, 1.7, 0), V(29, 2.8, -0.8), V(30.9, 3.36, -1.5)]);
    crearEnlace('ispcore', 'transito', 'wan', [V(33.1, 3.36, -1.5), V(35, 3.0, 0), V(36.9, 2.16, 1)]);
    crearEnlace('transito', 'srv', 'wan', [V(39.1, 2.16, 1), V(42, 2.9, 1.0), V(44.6, 2.6, 0.95), V(45.3, 2.18, 0.72)]);
    medio('wifi');
  }

  function enlace(a, b) { return enlaces[[a, b].sort().join('|')]; }

  /* Lista de tramos (curva + sentido) para recorrer una secuencia de equipos. */
  function ruta(nodos) {
    const tramos = [];
    for (let i = 0; i < nodos.length - 1; i++) {
      const e = enlace(nodos[i], nodos[i + 1]);
      if (!e) throw new Error(`No hay enlace entre ${nodos[i]} y ${nodos[i + 1]}`);
      tramos.push({ e, inv: e.de !== nodos[i], de: nodos[i], a: nodos[i + 1] });
    }
    return tramos;
  }

  function puntoEnTramo(tramo, t) { return tramo.e.curva.getPointAt(tramo.inv ? 1 - t : t); }

  /* ---------------- Estado de la escena ---------------- */

  function moverPortatil(punto) {
    const p = PUNTOS[punto].clone(); p.y = 1.04;
    equipos.portatil.position.copy(p); equipos.portatil.userData.posBase = p.clone();
    const w = enlace('portatil', 'ap'); w.puntos = puntosWifi(); trazar(w);
    const c = enlace('portatil', 'roseta'); c.puntos = puntosCableControl(); trazar(c);
    medio(estadoMedio);
    if (cajaSel) cajaSel.update();
  }

  let estadoMedio = 'wifi';
  function medio(m) {
    estadoMedio = m;
    enlace('portatil', 'ap').malla.visible = m === 'wifi';
    enlace('portatil', 'roseta').malla.visible = m === 'cable';
  }

  function mostrarGestion(v) {
    enlace('core', 'gestion').malla.visible = v;
    equipos.gestion.visible = v;
    etiquetas.filter((x) => x.obj === equipos.gestion).forEach((x) => { x.oculta = !v; });
  }

  /* Ondas de radio alrededor del punto de acceso. */
  const ondas = [];
  function crearOndas() {
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 64),
        new THREE.MeshBasicMaterial({ color: COLORES.wifi, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.position.set(-24, 4.7, -2); m.userData.fase = i / 3;
      escena.add(m); ondas.push(m);
    }
  }

  /* ---------------- Etiquetas HTML ---------------- */

  function etiqueta(texto, obj, clase = '', dy = 0, fija = false) {
    const div = document.createElement('div');
    div.className = 'etq ' + clase; div.textContent = texto;
    capaEtq.appendChild(div);
    const reg = { div, obj, dy, fija, clase };
    etiquetas.push(reg);
    return reg;
  }

  let mostrarNombres = true;
  function verEtiquetas(v) { mostrarNombres = v; }

  function etiquetaFlotante(texto, pos, duracion = 2.5, clase = 'flotante') {
    const ancla = new THREE.Object3D(); ancla.position.copy(pos); escena.add(ancla);
    const reg = etiqueta(texto, ancla, clase, 0);
    reg.vida = duracion;
    return reg;
  }

  const tmp = new THREE.Vector3();
  function proyectar(reg, w, h) {
    reg.obj.getWorldPosition(tmp); tmp.y += reg.dy;
    const dist = tmp.distanceTo(camara.position);
    tmp.project(camara);
    const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 && !reg.oculta &&
      (reg.clase === 'zona' ? dist < 75 : true) && (mostrarNombres || reg.clase === 'flotante' || reg.clase === 'parte') &&
      !(anatomiaObjetivo === 1 && reg.clase !== 'parte' && reg.clase !== 'flotante' && reg.obj !== equipos[seleccionado]);
    reg.div.style.display = visible ? 'block' : 'none';
    if (visible) { reg.div.style.left = ((tmp.x + 1) / 2 * w) + 'px'; reg.div.style.top = ((1 - tmp.y) / 2 * h) + 'px'; }
  }

  /* ---------------- Selección y anatomía ---------------- */

  const ray = new THREE.Raycaster(), raton = new THREE.Vector2();
  let abajo = null;
  function alPresionar(ev) { abajo = [ev.clientX, ev.clientY]; }
  function alSoltar(ev) {
    if (!abajo || Math.hypot(ev.clientX - abajo[0], ev.clientY - abajo[1]) > 5) return;
    const r = renderer.domElement.getBoundingClientRect();
    raton.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(raton, camara);
    const hits = ray.intersectObjects(Object.values(equipos).filter((g) => g.visible), true);
    if (!hits.length) return;
    let o = hits[0].object;
    while (o && !o.userData.equipo) o = o.parent;
    if (o) seleccionar(o.userData.equipo, hits[0].object.userData.nombreParte);
  }

  let alSeleccionar = () => {};
  function seleccionar(id, parteTocada) {
    if (seleccionado && seleccionado !== id) anatomiaVista(false, true);
    seleccionado = id;
    if (cajaSel) escena.remove(cajaSel);
    cajaSel = new THREE.BoxHelper(equipos[id], 0xffe066); escena.add(cajaSel);
    alSeleccionar(id, parteTocada);
  }

  function anatomiaVista(activa, inmediata = false) {
    anatomiaObjetivo = activa ? 1 : 0;
    if (inmediata) { anatomia = anatomiaObjetivo; aplicarAnatomia(); }
    etiquetasPartes.forEach((r) => { r.div.remove(); etiquetas.splice(etiquetas.indexOf(r), 1); });
    etiquetasPartes = [];
    if (activa && seleccionado) {
      const g = equipos[seleccionado];
      g.userData.partes.forEach((p, i) => { const r = etiqueta(`${i + 1}. ${p.nombre}`, p.obj, 'parte', 0.05); r.oculta = true; etiquetasPartes.push(r); });
      const pos = g.userData.posBase.clone().add(V(0, g.userData.tipo === 'portatil' ? 1.9 : 0.4, g.userData.enRack ? 2.2 : 0));
      const lejos = Math.max(6.5, g.userData.alto * 3);
      volarA(pos.clone().add(V(lejos * 0.3, lejos * 0.55, lejos)), pos);
    }
  }

  function aplicarAnatomia() {
    const f = anatomia * anatomia * (3 - 2 * anatomia);
    Object.values(equipos).forEach((g) => {
      const k = g.userData.equipo === seleccionado ? f : 0;
      g.userData.partes.forEach((p) => p.obj.position.copy(p.base).addScaledVector(p.ex, k * 1.3));
      if (g.userData.enRack) g.position.z = g.userData.posBase.z + k * 2.2;
      if (g.userData.tipo === 'portatil') g.position.y = g.userData.posBase.y + k * 1.6;   // lo eleva sobre el escritorio
    });
    etiquetasPartes.forEach((r) => { r.oculta = f < 0.6; });
    if (cajaSel) cajaSel.update();
  }

  /* ---------------- Cámara ---------------- */

  function volarA(pos, mira, dur = 1.2) {
    tweenCam = { t: 0, dur, p0: camara.position.clone(), m0: controles.target.clone(), p1: pos, m1: mira };
  }
  function camaraPreset(nombre) { const c = CAMARAS[nombre]; volarA(c.pos.clone(), c.mira.clone()); }

  /* ---------------- Bucle ---------------- */

  function actualizar(dt) {
    if (tweenCam) {
      tweenCam.t += dt / tweenCam.dur;
      const k = Math.min(1, tweenCam.t), s = k * k * (3 - 2 * k);
      camara.position.lerpVectors(tweenCam.p0, tweenCam.p1, s);
      controles.target.lerpVectors(tweenCam.m0, tweenCam.m1, s);
      if (k >= 1) tweenCam = null;
    }
    controles.update();
    if (anatomia !== anatomiaObjetivo) {
      anatomia += Math.sign(anatomiaObjetivo - anatomia) * dt * 1.4;
      anatomia = Math.max(0, Math.min(1, anatomia));
      aplicarAnatomia();
    }
    const ap = enlace('portatil', 'ap').malla.visible;
    ondas.forEach((m) => {
      m.userData.fase = (m.userData.fase + dt * 0.35) % 1;
      const s = 0.5 + m.userData.fase * 9;
      m.scale.set(s, s, s); m.material.opacity = ap ? 0.45 * (1 - m.userData.fase) : 0;
    });
    porCuadro.slice().forEach((fn) => fn(dt));
    const w = contenedor.clientWidth, h = contenedor.clientHeight;
    for (let i = etiquetas.length - 1; i >= 0; i--) {
      const r = etiquetas[i];
      if (r.vida !== undefined) {
        r.vida -= dt;
        if (r.vida <= 0) { r.div.remove(); escena.remove(r.obj); etiquetas.splice(i, 1); continue; }
        r.obj.position.y += dt * 0.4;
      }
      proyectar(r, w, h);
    }
  }

  function paquete(color, radio = 0.13) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(radio, 14, 10), new THREE.MeshBasicMaterial({ color }));
    escena.add(m); return m;
  }
  function quitar(o) { escena.remove(o); if (o.geometry) o.geometry.dispose(); }

  function iniciarTodo(div) { iniciar(div); crearOndas(); }

  return {
    iniciar: iniciarTodo, redimensionar: () => redimensionar(), equipos, ruta, puntoEnTramo, enlace, moverPortatil, medio, mostrarGestion,
    verEtiquetas, etiquetaFlotante, seleccionar, anatomiaVista, camaraPreset, volarA, paquete, quitar,
    alCuadro: (fn) => { porCuadro.push(fn); return () => { const i = porCuadro.indexOf(fn); if (i >= 0) porCuadro.splice(i, 1); }; },
    set alSeleccionar(fn) { alSeleccionar = fn; },
    get seleccionado() { return seleccionado; }, get anatomiaActiva() { return anatomiaObjetivo === 1; },
    get escena() { return escena; },
  };
})();
