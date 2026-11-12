// Más equipos de rack: switch de núcleo, cortafuegos de borde, servidores,
// patch panel y enrutador modular del proveedor.
import { figura } from "../base.mjs";
import { UNI, geometria, bastidor, orejas, chasis, tapa, rj45, bocaSFP, disipador, chip, encajeRack } from "./rack.mjs";

/** Ventilador con el eje en y, visto por su cara +y. */
export function ventiladorY(f, pieza, xc, y0, zc, { lado = 19.6, prof = 10, nombre } = {}) {
  const { k, P } = f;
  const y1 = y0 + prof, r = lado / 2 - 1.2, centro = [xc, y1, zc];
  const aspas = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    aspas.push(k.pathOf([[Math.cos(a) * 3.2, Math.sin(a) * 3.2], [Math.cos(a + 0.35) * r * 0.62, Math.sin(a + 0.35) * r * 0.62], [Math.cos(a + 0.9) * r, Math.sin(a + 0.9) * r]].map(([u, v]) => f.at([xc + u, y1, zc + v]))));
  }
  const extra = f.L(k.sideRing(centro, r, "y", P, 36), { tone: "lo" }) + f.L(aspas.join(""), { tone: "faint" }) +
    f.S(f.G.disc(0, 0.6, 3.2, f.G.frameAlong(centro, [0, 1, 0]), P), { tone: "mid" }) +
    f.D([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([u, v]) => f.at([xc + u * (lado / 2 - 1.6), y1, zc + v * (lado / 2 - 1.6)])), { size: 0.45 });
  return f.caja(pieza, [xc - lado / 2, y0, zc - lado / 2], [xc + lado / 2, y1, zc + lado / 2], { tono: "mid", nombre: nombre ?? `${pieza}.ventilador`, r: 1.2, extra });
}

/** Banco de módulos de memoria paralelos a y, con sus zócalos y chips en la cara visible. */
export function memoria(f, pieza, xs, y0, y1, z, alto = 14) {
  const { k, P } = f;
  const partes = [];
  for (const x of [...xs].sort((a, b) => a - b)) {
    partes.push(f.S(k.slabOf({ x: x - 0.6, y: y0 - 1, w: 1.9, d: y1 - y0 + 2, r: 0 }, z, 1.6, P, 2), { tone: "lo" }));
    const chips = [];
    const n = 8, paso = (y1 - y0 - 4) / n;
    for (let i = 0; i < n; i++) chips.push(f.rect(-(y0 + 2 + i * paso + 0.5), -(z + alto - 2.5), -(y0 + 2 + (i + 1) * paso - 0.5), -(z + 4.5), 0.2, 1));
    partes.push(f.S(k.slabOf({ x, y: y0, w: 0.7, d: y1 - y0, r: 0 }, z + 1.6, alto - 1.6, P, 2), { tone: "hi", crease: "lo", inner: f.enCara(f.lado(x + 0.7), chips.join(""), { tone: "lo" }) }));
  }
  const forma = f.A.box([Math.min(...xs) - 0.6, y0 - 1, z], [Math.max(...xs) + 1.3, y1 + 1, z + alto], { name: f.R.nameFor(`${pieza}.memoria`) });
  return f.item(pieza, [(Math.min(...xs) + Math.max(...xs)) / 2, (y0 + y1) / 2, z + alto / 2], partes.join(""), [forma]);
}

/** Fila de cajas de unidades en el frente: rejilla, botón de liberación y LED. */
function bahias(f, c, s0, zb, ancho, alto, n, paso, { vertical = false } = {}) {
  let out = "";
  for (let i = 0; i < n; i++) {
    const a = s0 + i * paso, b = a + ancho, t0 = -(zb + alto), t1 = -zb;
    const rej = [];
    if (vertical) for (let t = t0 + 2; t + 0.9 <= t1 - 6; t += 1.8) rej.push(f.rect(a + 1.4, t, b - 1.4, t + 0.9, 0.45, 2));
    else for (let s = a + 2; s + 0.9 <= b - 14; s += 1.8) rej.push(f.rect(s, t0 + 1.6, s + 0.9, t1 - 1.6, 0.45, 2));
    out += f.enCara(c, f.rect(a, t0, b, t1, 0.6), { tone: "lo" }) + f.enCara(c, rej.join(""), { tone: "faint" });
    out += vertical ? f.enCara(c, f.rect(a + 1.6, t1 - 4.6, b - 1.6, t1 - 1.6, 0.6), { tone: "lo" }) : f.enCara(c, f.rect(b - 12, t0 + 2.2, b - 2.4, t1 - 2.2, 0.8), { tone: "lo" });
    out += f.leds(c, vertical ? [[a + 2, t0 + 1.2]] : [[b - 1.2, t0 + 1.2]], { latido: i === 0, tono: "hi" });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Switch de núcleo L3                                                 */
/* ------------------------------------------------------------------ */
export function switchNucleo({ id = "nucleo", fig = "Fig 6" } = {}) {
  const g = geometria({ U: 1, fondo: 150 });
  const { D, z0, piso, top, tapaZ } = g;
  const pcbZ = piso + 2.4, pcbT = pcbZ + 0.8;
  const TAPA = [0, -(g.D + 8), 60];
  const FUENTES = [[62, 84], [86, 108]], VENT = [[-106, -82], [-80, -56], [-54, -30], [-28, -4]];
  const piezas = {
    asic: { nombre: "ASIC de conmutación L3", dice: "ASIC L3 · enruta entre VLAN en hardware · es la puerta de enlace 10.20.32.1, el primer salto de mtr", mueve: [0, 0, 0] },
    disipador: { nombre: "Disipador del ASIC", dice: "disipador de 14 aletas · el ASIC de 2 Tbit/s disipa unos 150 W", mueve: [0, 0, 30] },
    cpu: { nombre: "Módulo de CPU", dice: "módulo de CPU · OSPF, ARP y respuestas ICMP del salto · plano de control", mueve: [0, 0, 22] },
    puertos: { nombre: "24 SFP+ y 2 QSFP28", dice: "24 × SFP+ 10 GbE hacia los switches de acceso · 2 × QSFP28 100 GbE hacia el borde", mueve: [0, 0, 0] },
    fuentes: { nombre: "Fuentes redundantes", dice: "2 fuentes 1+1 extraíbles en caliente · si una falla, la otra sostiene la carga", mueve: [0, -54, 0] },
    ventiladores: { nombre: "Módulos de ventilación", dice: "4 módulos extraíbles · flujo de aire de frente a atrás", mueve: [0, -34, 0] },
    placa: { nombre: "Placa base", dice: "placa base · retimers junto a las jaulas para las señales de 10 Gbit/s", mueve: [0, 0, 0] },
    tapa: { nombre: "Tapa", dice: "tapa de acero", mueve: TAPA },
    chasis: { nombre: "Chasis 1U", dice: `chasis 1U · 440 × 44 × ${D * 2} mm`, mueve: [0, 0, 0] },
    base: { nombre: "Bastidor", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["tapa", "fuentes", "ventiladores", "disipador", "cpu", "asic", "puertos", "placa", "chasis", "base"];
  const f = figura({ encaje: encajeRack(g, [[-110 + TAPA[0], -D + TAPA[1], top + TAPA[2]], [110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]], [-110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]], [62, -D - 54, piso], [108, -D - 54, piso + 19]]), piezas, orden });
  const { k, P, at } = f;
  f.banco({ x: -132, y: -D - 14, w: 264, d: D + 38, r: 6 });
  bastidor(f, g);

  const c = f.frente(0);
  let fr = rj45(f, c, -106, z0 + 11.4, { ancho: 5.6, led: 1 }) + rj45(f, c, -106, z0 + 3.6, { ancho: 5.6, arriba: false });
  fr += f.hueco(c, { s0: -98.6, s1: -93.4, t0: -(z0 + 15.6), t1: -(z0 + 13.4), r: 0.3 }, 2.4);
  fr += f.leds(c, [[-96, -(z0 + 9)], [-96, -(z0 + 6.5)], [-96, -(z0 + 4)]], { tono: "hi" });
  const sIni = -89;
  const sDe = (i) => sIni + i * 8.2 + Math.floor(i / 4) * 1.6;
  for (let i = 0; i < 12; i++) { fr += bocaSFP(f, c, sDe(i), z0 + 12.6); fr += bocaSFP(f, c, sDe(i), z0 + 4.4); }
  const fin = sDe(11) + 7.2;
  fr += f.leds(c, Array.from({ length: 12 }, (_, i) => [sDe(i) + 3.6, -(z0 + 10.7)]), { tono: "hi" });
  const q0 = fin + 5;
  for (let i = 0; i < 2; i++) fr += f.hueco(c, { s0: q0 + i * 11.4, s1: q0 + i * 11.4 + 9.6, t0: -(z0 + 14.2), t1: -(z0 + 8), r: 0.3 }, 6, { fondoExtra: f.L(f.rect(q0 + i * 11.4 + 1.4, -(z0 + 12.8), q0 + i * 11.4 + 8.2, -(z0 + 9.4), 0.3), { tone: "lo" }) });
  const sPl = q0 + 26;
  fr += f.placa(c, sPl, -(z0 + 17.6), 104 - sPl, 12);
  chasis(f, g, { frontal: fr, lado: f.ranuras(f.lado(110), 30, 130, -(z0 + 17), -(z0 + 5), 3.2, 1.2), huecosTraseros: [...FUENTES, ...VENT] });
  orejas(f, g);

  for (const [x, y] of [[-100, -8], [100, -8], [-100, -D + 32], [50, -D + 32], [0, -40], [100, -D + 82]]) f.cil("placa", x, y, 1.2, piso, 2.4, { tono: "lo", nombre: "placa.separador", pasos: 12 });
  f.caja("placa", [-106, -D + 76, pcbZ], [106, -1.6, pcbZ + 0.8], { tono: "lo", nombre: "placa.pcb" });
  f.caja("placa", [-106, -D + 28, pcbZ], [60, -D + 76, pcbZ + 0.8], { tono: "lo", nombre: "placa.pcb-trasera" });
  f.caja("puertos", [sIni - 1, -32, pcbT], [fin + 1, -1.2, z0 + 18.4], { tono: "mid", nombre: "puertos.jaulas-sfp", extra: f.L([4, 8].map((i) => k.lineOnTop([sDe(i) - 0.8, -32], [sDe(i) - 0.8, -1.2], z0 + 18.4, P)).join(""), { tone: "lo" }) });
  f.caja("puertos", [q0 - 1, -40, pcbT], [q0 + 22, -1.2, z0 + 16], { tono: "mid", nombre: "puertos.jaulas-qsfp", extra: f.L(k.lineOnTop([q0 + 10.5, -40], [q0 + 10.5, -1.2], z0 + 16, P), { tone: "lo" }) });
  for (let i = 0; i < 6; i++) chip(f, "placa", [sIni + 2 + i * 16, -42, sIni + 10 + i * 16, -36], pcbT, 1, { nombre: "placa.retimer" });
  chip(f, "asic", [-22, -104, 18, -64], pcbT, 1.6, { lit: true, tono: "hi", sustrato: 4, nombre: "asic.encapsulado", bisel: 0.4 });
  disipador(f, "disipador", { x0: -26, y0: -108, x1: 22, y1: -60, z: pcbT + 1.6, alto: 10, aletas: 14 });
  for (const [x, y] of [[-96, -74], [-70, -74], [-96, -48], [-70, -48]]) f.cil("cpu", x, y, 1, pcbT, 2.4, { tono: "lo", nombre: "cpu.separador", pasos: 10 });
  f.caja("cpu", [-100, -78, pcbT + 2.4], [-67, -44, pcbT + 3.2], { tono: "lo", nombre: "cpu.tarjeta" });
  chip(f, "cpu", [-95, -72, -83, -60], pcbT + 3.2, 1.2, { nombre: "cpu.procesador", sustrato: 2 });
  chip(f, "cpu", [-79, -72, -71, -67], pcbT + 3.2, 0.9, { nombre: "cpu.ram" });
  chip(f, "cpu", [-79, -65, -71, -60], pcbT + 3.2, 0.9, { nombre: "cpu.ram" });
  for (const [a, b] of FUENTES) f.caja("placa", [a + 2, -D + 76, pcbT], [b - 2, -D + 80, pcbT + 5], { tono: "mid", nombre: "placa.conector-fuente", r: 0.3 });

  for (const [a, b] of FUENTES) {
    const cf = f.arriba(piso + 19);
    const rj = []; for (let x = a + 3; x + 1.2 <= b - 3; x += 3) rj.push(f.rect(x, -D + 40, x + 1.2, -D + 70, 0.6, 3));
    f.caja("fuentes", [a, -D, piso], [b, -D + 76, piso + 19], { tono: "mid", nombre: "fuentes.modulo", r: 0.6, bisel: 0.4, extra: f.enCara(cf, rj.join(""), { tone: "faint" }) + f.placa(cf, a + 2.5, -D + 6, b - a - 5, 26) });
  }
  for (const [a, b] of VENT) {
    f.caja("ventiladores", [a, -D, piso], [b, -D + 4, tapaZ - 0.4], { tono: "lo", nombre: "ventiladores.marco" });
    ventiladorY(f, "ventiladores", (a + b) / 2, -D + 4, piso + 9.8, { lado: 19.6, prof: 18 });
  }
  tapa(f, g, { ranurasEn: [[-104, -6, -D + 6, -D + 20]], etiqueta: [-20, -50] });

  return f.emitir({
    id, fig, titulo: "Switch de núcleo · capa 3", pista: "Clic para despiezar · flechas para elegir", lectura: "1U · 24 × 10 GbE + 2 × 100 GbE",
    leyenda: ["asic", "disipador", "cpu", "puertos", "fuentes", "ventiladores", "placa", "tapa", "chasis"],
    etiqueta: "Switch de núcleo de capa 3 en un bastidor de dos postes, con la tapa retirable, el ASIC bajo su disipador, el módulo de CPU, las jaulas SFP+ y QSFP28, y las fuentes y ventiladores extraíbles por detrás.",
    pie: "El switch de núcleo es la puerta de enlace del aula y el primer salto IP que muestra mtr. El ASIC enruta en hardware y no añade retardo apreciable; las respuestas ICMP «tiempo excedido» las genera, en cambio, la CPU del plano de control, más lenta y con límite de tasa. Por eso el RTT de este salto puede ser mayor que el de saltos posteriores sin que haya congestión.",
  });
}

/* ------------------------------------------------------------------ */
/*  Cortafuegos / enrutador de borde                                    */
/* ------------------------------------------------------------------ */
export function cortafuegos({ id = "cortafuegos", fig = "Fig 11" } = {}) {
  const g = geometria({ U: 1, fondo: 140 });
  const { D, z0, piso, top, tapaZ } = g;
  const pcbZ = piso + 2.4, pcbT = pcbZ + 0.8;
  const TAPA = [0, -(g.D + 8), 60];
  const piezas = {
    npu: { nombre: "Procesador de red (NPU)", dice: "NPU · NAT y política en hardware · aquí se permite o se descarta el ICMP «fragmentación necesaria» que necesita PMTUD", mueve: [0, 0, 0] },
    cpu: { nombre: "CPU x86 y disipador", dice: "CPU de 8 núcleos · registros, VPN y gestión · el tráfico normal no pasa por ella", mueve: [0, 0, 26] },
    memoria: { nombre: "Memoria", dice: "2 módulos DDR4 · tabla de sesiones NAT", mueve: [0, 0, 30] },
    ssd: { nombre: "SSD de registros", dice: "SSD M.2 · guarda los registros de sesiones y descartes", mueve: [0, 0, 20] },
    puertos: { nombre: "Puertos y pantalla", dice: "8 × 1 GbE y 4 SFP+ · un lado hacia el núcleo, el otro hacia el proveedor", mueve: [0, 0, 0] },
    fuente: { nombre: "Fuente de alimentación", dice: "fuente interna · 150 W", mueve: [0, 0, 30] },
    ventiladores: { nombre: "Ventiladores", dice: "3 ventiladores de 40 mm · flujo de frente a atrás", mueve: [0, 0, 34] },
    placa: { nombre: "Placa base", dice: "placa base", mueve: [0, 0, 0] },
    tapa: { nombre: "Tapa", dice: "tapa de acero", mueve: TAPA },
    chasis: { nombre: "Chasis 1U", dice: `chasis 1U · 440 × 44 × ${D * 2} mm`, mueve: [0, 0, 0] },
    base: { nombre: "Bastidor", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["tapa", "ventiladores", "fuente", "cpu", "memoria", "ssd", "npu", "puertos", "placa", "chasis", "base"];
  const f = figura({ encaje: encajeRack(g, [[-110 + TAPA[0], -D + TAPA[1], top + TAPA[2]], [110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]], [-110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]]]), piezas, orden });
  const { k, P, at } = f;
  f.banco({ x: -132, y: -D - 14, w: 264, d: D + 38, r: 6 });
  bastidor(f, g);

  const c = f.frente(0);
  let fr = rj45(f, c, -106, z0 + 11.4, { ancho: 5.6 }) + f.hueco(c, { s0: -105.6, s1: -100.4, t0: -(z0 + 7.2), t1: -(z0 + 5), r: 0.3 }, 2.4);
  const lcd = `<text class="an-texto" x="-90" y="${-(z0 + 13.4)}" font-size="2.6">BORDE  NAT</text><text class="an-texto" x="-90" y="${-(z0 + 9.6)}" font-size="2.6">ICMP 3/4 PERMITIDO</text>`;
  fr += f.hueco(c, { s0: -92, s1: -60, t0: -(z0 + 16.6), t1: -(z0 + 6), r: 0.6 }, 1.2, { claseFondo: "an-pantalla", fondoExtra: lcd });
  fr += f.enCara(c, [-55, -50].map((s) => f.k.pathOf(f.k.circleRing(s, -(z0 + 13.8), 1.5, 12), true) + f.k.pathOf(f.k.circleRing(s, -(z0 + 8.6), 1.5, 12), true)).join(""), { tone: "lo" });
  const sDe = (i) => -42 + i * 7;
  for (let i = 0; i < 4; i++) { fr += rj45(f, c, sDe(i), z0 + 11.4, { led: i < 2 ? 2 : 0 }); fr += rj45(f, c, sDe(i), z0 + 3.6, { arriba: false, led: i === 0 ? 1 : 0 }); }
  for (let i = 0; i < 4; i++) fr += bocaSFP(f, c, -10 + i * 8.6, z0 + 7.2);
  fr += f.leds(c, [[28, -(z0 + 17)], [31, -(z0 + 17)], [34, -(z0 + 17)]], { tono: "hi" });
  fr += f.placa(c, 44, -(z0 + 17.6), 58, 12);
  chasis(f, g, { frontal: fr, lado: f.ranuras(f.lado(110), 20, 120, -(z0 + 17), -(z0 + 5), 3.2, 1.2), huecosTraseros: [] });
  orejas(f, g);

  for (const [x, y] of [[-100, -8], [100, -8], [-100, -D + 30], [40, -D + 30], [0, -40], [100, -D + 60]]) f.cil("placa", x, y, 1.2, piso, 2.4, { tono: "lo", nombre: "placa.separador", pasos: 12 });
  f.prisma("placa", [[-106, -1.6], [106, -1.6], [106, -D + 56], [52, -D + 56], [52, -D + 14], [-106, -D + 14]], pcbZ, 0.8, { tono: "lo", convexo: false, nombre: "placa.pcb" });
  f.caja("puertos", [-93, -6, pcbT], [-59, -1.2, z0 + 17.4], { tono: "lo", nombre: "puertos.pantalla" });
  f.caja("puertos", [-43, -15, pcbT], [-13.2, -1.2, z0 + 18.4], { tono: "mid", nombre: "puertos.jacks" });
  f.caja("puertos", [-10.6, -27, pcbT], [23.2, -1.2, z0 + 12.2], { tono: "mid", nombre: "puertos.jaulas", extra: f.L([1, 2, 3].map((i) => k.lineOnTop([-10 + i * 8.6 - 0.7, -27], [-10 + i * 8.6 - 0.7, -1.2], z0 + 12.2, P)).join(""), { tone: "lo" }) });
  chip(f, "npu", [10, -74, 34, -50], pcbT, 1.5, { lit: true, tono: "hi", sustrato: 3.5, nombre: "npu.encapsulado", bisel: 0.4 });
  for (let i = 0; i < 4; i++) chip(f, "npu", [38, -76 + i * 6.6, 46, -71 + i * 6.6], pcbT, 0.9, { nombre: "npu.ram" });
  chip(f, "cpu", [-62, -96, -42, -76], pcbT, 1.4, { nombre: "cpu.procesador", sustrato: 3 });
  disipador(f, "cpu", { x0: -66, y0: -100, x1: -38, y1: -72, z: pcbT + 1.4, alto: 12, aletas: 11 });
  memoria(f, "memoria", [-30, -24], -108, -60, pcbT, 13);
  f.caja("ssd", [0, -36, pcbT + 1.4], [36, -30, pcbT + 2.2], { tono: "mid", nombre: "ssd.m2", extra: f.D([at([2, -33, pcbT + 2.2])], { size: 0.5 }) + f.L([6, 16, 26].map((x) => f.k.planOutline({ x, y: -35.2, w: 7, d: 4.4, r: 0.3 }, pcbT + 2.2, P, 2)).join(""), { tone: "lo" }) });
  f.caja("ssd", [36, -36.4, pcbT], [38.4, -29.6, pcbT + 2.2], { tono: "lo", nombre: "ssd.zocalo" });
  f.caja("ssd", [-1.6, -34, pcbT], [0, -32, pcbT + 1.4], { tono: "lo", nombre: "ssd.soporte" });
  chip(f, "placa", [-20, -44, -10, -36], pcbT, 0.9, { nombre: "placa.tpm" });

  const fz1 = piso + 17.8, cf = f.arriba(fz1);
  { const rj = []; for (let x = 58; x + 1.4 <= 100; x += 3.4) rj.push(f.rect(x, -D + 8, x + 1.4, -D + 24, 0.7, 3));
    f.caja("fuente", [54, -D + 3, piso], [106, -D + 50, fz1], { tono: "mid", nombre: "fuente.caja", r: 0.6, bisel: 0.4, extra: f.enCara(cf, rj.join(""), { tone: "faint" }) + f.placa(cf, 60, -D + 30, 34, 14) }); }
  for (const xc of [-90, -66, -42, -18]) ventiladorY(f, "ventiladores", xc, -D + 1, piso + 9.8);
  tapa(f, g, { ranurasEn: [[-102, -8, -D + 4, -D + 14], [58, 102, -D + 8, -D + 24]], etiqueta: [-70, -60] });

  return f.emitir({
    id, fig, titulo: "Cortafuegos de borde", pista: "Clic para despiezar · flechas para elegir", lectura: "1U · NAT · 8 × 1 GbE + 4 SFP+",
    leyenda: ["npu", "cpu", "memoria", "ssd", "puertos", "fuente", "ventiladores", "placa", "tapa", "chasis"],
    etiqueta: "Cortafuegos de borde en un bastidor de dos postes, con pantalla frontal, la tapa retirable, el procesador de red, la CPU bajo su disipador, la memoria, el SSD de registros, la fuente y los ventiladores.",
    pie: "El cortafuegos traduce las direcciones privadas del campus (NAT) y aplica la política de seguridad. Para la medición importa una regla: si descarta el ICMP «fragmentación necesaria», el descubrimiento de MTU de la ruta falla y las conexiones con paquetes grandes se cuelgan (agujero negro de PMTUD). El escenario «tracepath» del simulador reproduce ese caso.",
  });
}

/* ------------------------------------------------------------------ */
/*  Servidor (1U o 2U)                                                  */
/* ------------------------------------------------------------------ */
export function servidor({ id = "servidor", U = 1, fig = "Fig 7", publico = false } = {}) {
  const g = geometria({ U, fondo: U === 1 ? 160 : 180 });
  const { D, z0, piso, top, tapaZ, h } = g;
  const pcbZ = piso + 2.4, pcbT = pcbZ + 0.8;
  const TAPA = [0, -(g.D + 8), 60];
  const FUENTES = [[66, 86], [88, 108]];
  const altoDis = U === 1 ? 13 : 30;
  const piezas = {
    nic: { nombre: "Tarjeta de red", dice: publico ? "NIC 2 × 25 GbE · aquí escucha iperf3 -s y el servidor web de referencia" : "NIC 2 × 10 GbE · por aquí responde el resolutor DNS 10.20.1.53", mueve: [0, 0, 28 + (U - 1) * 16] },
    cpus: { nombre: "Procesadores", dice: "2 CPU de 16 núcleos · atienden las conexiones y los paquetes que entrega la NIC", mueve: [0, 0, 0] },
    disipadores: { nombre: "Disipadores", dice: "disipadores pasivos · el aire lo empujan los ventiladores centrales", mueve: [0, 0, 26 + (U - 1) * 18] },
    memoria: { nombre: "Memoria", dice: "16 módulos DDR5 · 8 por procesador", mueve: [0, 0, 0] },
    ventiladores: { nombre: "Muro de ventiladores", dice: "6 ventiladores · cruzan el chasis de frente a atrás", mueve: [0, 0, 32 + (U - 1) * 18] },
    fuentes: { nombre: "Fuentes redundantes", dice: "2 fuentes 1+1 extraíbles en caliente", mueve: [0, -50, 0] },
    discos: { nombre: "Unidades y plano trasero", dice: U === 1 ? "8 unidades SSD de 2,5 pulgadas · extraíbles por el frente" : "6 discos de 3,5 pulgadas · extraíbles por el frente", mueve: [0, 0, 0] },
    placa: { nombre: "Placa base", dice: "placa base · con controlador de gestión (BMC)", mueve: [0, 0, 0] },
    tapa: { nombre: "Tapa", dice: "tapa de acero", mueve: TAPA },
    chasis: { nombre: `Chasis ${U}U`, dice: `chasis ${U}U · 440 × ${U === 1 ? 44 : 88} × ${D * 2} mm`, mueve: [0, 0, 0] },
    base: { nombre: "Bastidor", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["tapa", "fuentes", "nic", "ventiladores", "disipadores", "cpus", "memoria", "discos", "placa", "chasis", "base"];
  const f = figura({ encaje: encajeRack(g, [[-110 + TAPA[0], -D + TAPA[1], top + TAPA[2]], [110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]], [-110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]], [66, -D - 50, piso]]), piezas, orden });
  const { k, P, at } = f;
  f.banco({ x: -132, y: -D - 14, w: 264, d: D + 38, r: 6 });
  bastidor(f, g);

  const c = f.frente(0);
  let fr = "";
  let finBahias;
  if (U === 1) { fr += bahias(f, c, -104, z0 + 1.8, 7.6, 18, 8, 8.4, { vertical: true }); finBahias = -104 + 8 * 8.4; }
  else { for (let fila = 0; fila < 2; fila++) fr += bahias(f, c, -104, z0 + 2.4 + fila * 14.4, 46, 12.8, 3, 48.4); finBahias = -104 + 3 * 48.4; }
  const sPan = finBahias + 4;
  fr += f.enCara(c, f.k.pathOf(f.k.circleRing(sPan + 3, -(z0 + h - 6), 2, 14), true), { tone: "lo" });
  fr += f.leds(c, [[sPan + 3, -(z0 + h - 6)], [sPan + 8, -(z0 + h - 4)], [sPan + 8, -(z0 + h - 7)]], { tono: "hi", latido: false });
  fr += f.hueco(c, { s0: sPan + 0.6, s1: sPan + 5.4, t0: -(z0 + 6.4), t1: -(z0 + 4.2), r: 0.3 }, 2.4);
  const sRej = sPan + 14;
  const out = []; for (let s = sRej; s + 1.2 <= sRej + 30; s += 2.6) out.push(f.rect(s, -(z0 + h - 3), s + 1.2, -(z0 + 3), 0.6, 3));
  fr += f.enCara(c, out.join(""), { tone: "faint" });
  fr += f.placa(c, sRej + 36, -(z0 + h - 3.6), 104 - (sRej + 36), Math.min(12, h - 7));
  chasis(f, g, { frontal: fr, lado: f.ranuras(f.lado(110), 20, 150, -(z0 + h - 4), -(z0 + 4), 3.2, 1.2), huecosTraseros: FUENTES });
  orejas(f, g);

  // Unidades detrás del frente y su plano trasero.
  if (U === 1) for (let i = 0; i < 8; i++) f.caja("discos", [-104 + i * 8.4 + 0.4, -50, z0 + 2.2], [-104 + i * 8.4 + 7.2, -1.2, z0 + 19.4], { tono: "mid", nombre: "discos.unidad", r: 0.4 });
  else for (let fila = 0; fila < 2; fila++) for (let i = 0; i < 3; i++) f.caja("discos", [-104 + i * 48.4 + 0.6, -74, z0 + 2.8 + fila * 14.4], [-104 + i * 48.4 + 45.4, -1.2, z0 + 14.8 + fila * 14.4], { tono: "mid", nombre: "discos.unidad", r: 0.6 });
  const yPlano = U === 1 ? -52 : -76;
  f.caja("discos", [-106, yPlano - 1, piso], [finBahias, yPlano, tapaZ - 0.6], { tono: "lo", nombre: "discos.plano-trasero", extra: f.ranuras(f.frente(yPlano), -100, finBahias - 6, -(tapaZ - 3), -(piso + 3), 8.4, 3, "lo") });

  // Placa base, ventiladores, procesadores con memoria, NIC en elevador, fuentes.
  const yV = yPlano - 4;
  for (const [x, y] of [[-100, yV - 18], [100, yV - 18], [-100, -D + 10], [40, -D + 10], [0, -D + 60], [100, -D + 60]]) f.cil("placa", x, y, 1.2, piso, 2.4, { tono: "lo", nombre: "placa.separador", pasos: 12 });
  f.caja("placa", [-106, -D + 54, pcbZ], [106, yV - 14, pcbZ + 0.8], { tono: "lo", nombre: "placa.pcb" });
  f.caja("placa", [-106, -D + 4, pcbZ], [62, -D + 54, pcbZ + 0.8], { tono: "lo", nombre: "placa.pcb-trasera" });
  const alto = tapaZ - piso - 0.6;
  const ladoV = Math.min(alto, 30);
  for (let i = 0; i < 6; i++) ventiladorY(f, "ventiladores", -92 + i * 36, yV - 12, piso + ladoV / 2, { lado: ladoV, prof: 10 });
  for (const cx of [-58, 22]) {
    chip(f, "cpus", [cx - 13, -D + 54, cx + 13, -D + 82], pcbT, 1.6, { tono: "hi", nombre: "cpus.procesador", sustrato: 3.5 });
    disipador(f, "disipadores", { x0: cx - 15, y0: -D + 52, x1: cx + 15, y1: -D + 84, z: pcbT + 1.6, alto: altoDis, aletas: 12 });
    memoria(f, "memoria", [cx - 30, cx - 26, cx - 22, cx - 18], -D + 50, -D + 86, pcbT, Math.min(15, tapaZ - pcbT - 1.6));
    memoria(f, "memoria", [cx + 18, cx + 22, cx + 26, cx + 30], -D + 50, -D + 86, pcbT, Math.min(15, tapaZ - pcbT - 1.6));
  }
  chip(f, "placa", [70, -D + 74, 84, -D + 88], pcbT, 1.2, { nombre: "placa.pch", sustrato: 2 });
  chip(f, "placa", [90, -D + 74, 98, -D + 82], pcbT, 0.9, { nombre: "placa.bmc" });
  // Elevador PCIe y tarjeta de red horizontal sobre él.
  const zN = pcbT + 8;
  f.caja("placa", [-60, -D + 14, pcbT], [-57.6, -D + 46, zN], { tono: "lo", nombre: "placa.elevador" });
  f.caja("nic", [-104, -D + 2, zN], [-60, -D + 48, zN + 0.8], { tono: "lo", nombre: "nic.tarjeta" });
  chip(f, "nic", [-90, -D + 18, -74, -D + 34], zN + 0.8, 1.2, { lit: true, tono: "hi", nombre: "nic.controlador", sustrato: 2.5, bisel: 0.3 });
  f.caja("nic", [-102, -D + 2, zN + 0.8], [-62, -D + 12, zN + 5.6], { tono: "mid", nombre: "nic.jaulas", extra: f.L(k.lineOnTop([-82, -D + 2], [-82, -D + 12], zN + 5.6, P), { tone: "lo" }) });
  for (const [a, b] of FUENTES) {
    const cf = f.arriba(piso + 17);
    const rj = []; for (let x = a + 3; x + 1.2 <= b - 3; x += 3) rj.push(f.rect(x, -D + 26, x + 1.2, -D + 48, 0.6, 3));
    f.caja("fuentes", [a, -D, piso], [b, -D + 52, piso + 17], { tono: "mid", nombre: "fuentes.modulo", r: 0.6, bisel: 0.4, extra: f.enCara(cf, rj.join(""), { tone: "faint" }) + f.placa(cf, a + 2.5, -D + 4, b - a - 5, 18) });
    f.caja("placa", [a + 2, -D + 52, pcbT], [b - 2, -D + 55.6, pcbT + 5], { tono: "mid", nombre: "placa.conector-fuente", r: 0.3 });
  }
  tapa(f, g, { ranurasEn: [[-104, 104, yV - 12, yV - 4]], etiqueta: [-40, -D + 40] });

  return f.emitir({
    id, fig, titulo: publico ? "Servidor público de referencia" : "Resolutor DNS institucional", pista: "Clic para despiezar · flechas para elegir", lectura: `${U}U · 2 CPU · ${publico ? "2 × 25 GbE" : "2 × 10 GbE"}`,
    leyenda: ["nic", "cpus", "disipadores", "memoria", "ventiladores", "fuentes", "discos", "placa", "tapa", "chasis"],
    etiqueta: `Servidor de ${U}U en un bastidor de dos postes, con unidades frontales, muro de ventiladores, dos procesadores con su memoria, la tarjeta de red sobre un elevador PCIe y dos fuentes extraíbles.`,
    pie: publico
      ? "El servidor de referencia está fuera del campus: es el extremo remoto de iperf3, de curl y de las sondas. Su tarjeta de red de 25 GbE no limita la medición; el cuello de botella está en el acceso inalámbrico o en el enlace con el proveedor. Si el servidor estuviera saturado, el retardo crecería en el último salto y no en los anteriores."
      : "El resolutor DNS institucional responde a dig desde el centro de datos. Una consulta con la caché vacía obliga al resolutor a preguntar a servidores externos y tarda decenas de milisegundos; con la caché llena responde en menos de un milisegundo. Esa diferencia aparece en la fase DNS del escenario «dig + curl».",
  });
}

/* ------------------------------------------------------------------ */
/*  Patch panel de 24 puertos                                           */
/* ------------------------------------------------------------------ */
export function patchPanel({ id = "patch", fig = "Fig 4" } = {}) {
  const g = { ...geometria({ U: 1, fondo: 40 }) };
  const { z0, top, h } = g;
  const SALE = [0, -34, 0];
  const piezas = {
    keystones: { nombre: "Conectores keystone", dice: "keystone Cat 6 · el cable horizontal se poncha en su bloque IDC con el código T568B", mueve: [0, 0, 0] },
    cables: { nombre: "Cableado horizontal", dice: "cable UTP Cat 6 · hasta 90 m entre este panel y la roseta del aula", mueve: SALE },
    frente: { nombre: "Panel frontal", dice: "panel de 24 puertos · un latiguillo corto une cada puerto con el switch", mueve: [0, 0, 0] },
    barra: { nombre: "Barra de amarre", dice: "barra de amarre · sujeta los cables y alivia la tensión sobre los conectores", mueve: SALE },
    base: { nombre: "Bastidor", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["barra", "cables"];
  const f = figura({ encaje: [...encajeRack({ ...g, D: 56 }), [0, -100, 0], [-108, -98, z0 + 14]], piezas, orden });
  const { k, P, at } = f;
  f.banco({ x: -132, y: -104, w: 264, d: 128, r: 6 });
  bastidor(f, g);


  const c = f.frente(0);
  const sDe = (i) => -103 + i * 8.4 + Math.floor(i / 6) * 2.8;
  let fr = "";
  for (let i = 0; i < 24; i++) fr += rj45(f, c, sDe(i), z0 + 4.6, { arriba: true, prof: 2.4 });
  for (let gq = 0; gq < 4; gq++) fr += f.placa(c, sDe(gq * 6), -(z0 + 19.2), 6 * 8.4 - 2.2, 6.4);
  f.caja("frente", [-110, -1.6, z0], [110, 0, top], { tono: "mid", nombre: "frente.panel", bisel: 0.3, extra: fr });
  f.caja("frente", [-110, -6, top - 1.4], [110, -1.6, top], { tono: "mid", nombre: "frente.pestana" });
  f.caja("frente", [-110, -6, z0], [110, -1.6, z0 + 1.4], { tono: "mid", nombre: "frente.pestana" });
  orejas(f, g);
  for (const lado of [-1, 1]) f.caja("frente", [lado > 0 ? 104 : -108, -60, z0], [lado > 0 ? 108 : -104, -6, z0 + 1.4], { tono: "mid", nombre: "frente.escuadra" });
  f.caja("barra", [-108, -64, z0 + 1.4], [108, -60, z0 + 13.8], { tono: "mid", nombre: "barra.amarre", r: 0.6, bisel: 0.3, extra: f.ranuras(f.frente(-60), -104, 104, -(z0 + 12.4), -(z0 + 2.8), 8.4, 2, "lo") });

  for (let i = 0; i < 24; i++) {
    const s0 = sDe(i), x0 = s0 - 0.7, x1 = s0 + 6.9, zc = z0 + 7.6;
    const idc = [];
    for (let j = 0; j < 4; j++) for (const y of [-14, -10]) idc.push(k.planOutline({ x: x0 + 1 + j * 1.6, y, w: 0.6, d: 2.6, r: 0.3 }, zc + 4.8, P, 2));
    f.caja("keystones", [x0, -20, zc - 4.6], [x1, -1.6, zc + 4.8], { tono: i === 0 ? "hi" : "mid", lit: i === 0, nombre: "keystones.modulo", r: 0.5, extra: f.L(idc.join(""), { tone: "lo" }) });
    const xc = (x0 + x1) / 2;
    f.cable("cables", [[xc, -20, zc], [xc, -60, zc]], 0.6, { nombre: "cables.utp", libre: [true, false], tono: i === 0 ? "hi" : "mid", trozo: 12 });
  }

  return f.emitir({
    id, fig, titulo: "Patch panel · 24 puertos", pista: "Clic para despiezar · flechas para elegir", lectura: "1U · 24 × Cat 6",
    leyenda: ["keystones", "cables", "frente", "barra"],
    etiqueta: "Patch panel de 24 puertos en un bastidor de dos postes: panel frontal con etiquetas, conectores keystone con su bloque IDC y cables horizontales sujetos a la barra de amarre.",
    permitir: { crowd: [["cables.utp*", "stand.poste*"], ["cables.utp*", "frente.escuadra*"]] },
    pie: "El patch panel termina el cableado horizontal que llega de las rosetas del aula. No tiene electrónica: cada puerto es un conector pasivo, y un latiguillo lo une con el switch de acceso. Una falla aquí (un par mal ponchado) no añade retardo, pero puede bajar el enlace a 100 Mbit/s o provocar errores de trama; por eso la medición cableada de control conviene repetirla en otro puerto.",
  });
}

/* ------------------------------------------------------------------ */
/*  Enrutador modular del proveedor                                     */
/* ------------------------------------------------------------------ */
export function enrutador({ id = "router", fig = "Fig 12" } = {}) {
  const g = geometria({ U: 2, fondo: 150 });
  const { D, z0, piso, top, tapaZ } = g;
  const RANURAS = [
    { p: "rp", z: z0 + 33.4, sale: 24 },
    { p: "lc1", z: z0 + 22.6, sale: 48 },
    { p: "lc2", z: z0 + 11.8, sale: 72 },
    { p: "lc3", z: z0 + 1.0, sale: 96 },
  ];
  const piezas = {
    rp: { nombre: "Procesador de rutas", dice: "procesador de rutas · plano de control · genera los ICMP «tiempo excedido» con límite de tasa: la pérdida aparente que mtr muestra en este salto", mueve: [0, 24, 0] },
    lc1: { nombre: "Tarjeta de línea 1", dice: "tarjeta de línea · plano de datos · reenvía en hardware a velocidad de línea; el tráfico que la atraviesa no sufre el límite de ICMP", mueve: [0, 48, 0] },
    lc2: { nombre: "Tarjeta de línea 2", dice: "tarjeta de línea · 8 × 10 GbE hacia clientes como el campus", mueve: [0, 72, 0] },
    lc3: { nombre: "Tarjeta de línea 3", dice: "tarjeta de línea · 2 × 100 GbE hacia la red troncal", mueve: [0, 96, 0] },
    plano: { nombre: "Plano medio", dice: "plano medio · une las tarjetas con el procesador de rutas", mueve: [0, 0, 0] },
    fuentes: { nombre: "Fuentes", dice: "2 fuentes de 1,1 kW extraíbles en caliente", mueve: [0, -44, 0] },
    ventiladores: { nombre: "Bandeja de ventiladores", dice: "bandeja de ventiladores extraíble · flujo de aire de lado a lado", mueve: [0, -44, 0] },
    chasis: { nombre: "Chasis 2U", dice: `chasis modular 2U · 4 ranuras`, mueve: [0, 0, 0] },
    base: { nombre: "Bastidor", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["lc3", "lc2", "lc1", "rp", "fuentes", "ventiladores", "plano", "chasis", "base"];
  const f = figura({ encaje: [...encajeRack(g), [-132, 124, -10], [132, 124, -10], [60, -D - 44, piso], [-104, -D - 44, piso + 40]], piezas, orden, elevacion: 36 });
  const { k, P, at } = f;
  f.banco({ x: -132, y: -D - 14, w: 264, d: D + 140, r: 6 });
  bastidor(f, g);
  chasis(f, g, { frente: false, lado: f.ranuras(f.lado(110), 20, 140, -(top - 4), -(z0 + 4), 3.2, 1.2), huecosTraseros: [[-106, -40], [40, 108]] });
  orejas(f, g);
  tapa(f, g, { pieza: "chasis", ranurasEn: [[-104, -42, -D + 6, -D + 40]], etiqueta: [10, -80] });
  f.caja("plano", [-106, -101.2, piso], [106, -100, tapaZ], { tono: "lo", nombre: "plano.placa" });

  for (const { p, z, sale } of RANURAS) {
    const zb = z, zt = z + 10.4, c = f.frente(0);
    let fr = f.tornillos(c, [[-101, -(zb + 5.2)], [101, -(zb + 5.2)]], 1.3);
    if (p === "rp") {
      fr += rj45(f, c, -92, zb + 2.2, { ancho: 5.6, led: 1 }) + rj45(f, c, -84, zb + 2.2, { ancho: 5.6 });
      fr += f.hueco(c, { s0: -75, s1: -69.8, t0: -(zb + 6.4), t1: -(zb + 4.2), r: 0.3 }, 2.4);
      fr += f.leds(c, [[-62, -(zb + 7.6)], [-58, -(zb + 7.6)], [-54, -(zb + 7.6)], [-50, -(zb + 7.6)]], { tono: "hi", latido: true });
      fr += f.placa(c, -40, -(zb + 9), 60, 7.6);
    } else if (p === "lc3") {
      for (let i = 0; i < 2; i++) fr += f.hueco(c, { s0: -88 + i * 14, s1: -78.4 + i * 14, t0: -(zb + 8.4), t1: -(zb + 2.2), r: 0.3 }, 6);
      fr += f.leds(c, [[-89, -(zb + 9.3)], [-75, -(zb + 9.3)]], { tono: "hi" });
      fr += f.placa(c, -40, -(zb + 9), 60, 7.6);
    } else {
      for (let i = 0; i < 8; i++) fr += bocaSFP(f, c, -90 + i * 9.4, zb + 3);
      fr += f.leds(c, Array.from({ length: 8 }, (_, i) => [-86.4 + i * 9.4, -(zb + 8.8)]), { tono: "hi" });
      fr += f.placa(c, -10, -(zb + 9), 40, 7.6);
    }
    f.caja(p, [-104, -1.2, zb], [104, 0, zt], { tono: "mid", nombre: `${p}.frente`, bisel: 0.3, extra: fr });
    for (const s of [-1, 1]) f.caja(p, [s > 0 ? 96 : -104, 0, zb + 1.6], [s > 0 ? 104 : -96, 2.4, zt - 1.6], { tono: "hi", nombre: `${p}.palanca`, r: 0.6 });
    f.caja(p, [-102, -98, zb + 1.2], [102, -1.2, zb + 2], { tono: "lo", nombre: `${p}.pcb` });
    f.caja(p, [-60, -100, zb + 2], [60, -98, zb + 7], { tono: "mid", nombre: `${p}.conector` });
    if (p === "rp") {
      chip(f, p, [-10, -60, 10, -40], zb + 2, 1.2, { lit: true, tono: "hi", nombre: "rp.cpu", sustrato: 2.5, bisel: 0.3 });
      for (let i = 0; i < 4; i++) chip(f, p, [16 + i * 9, -58, 23 + i * 9, -42], zb + 2, 0.9, { nombre: "rp.ram" });
      chip(f, p, [-40, -56, -28, -44], zb + 2, 0.9, { nombre: "rp.flash" });
    } else {
      chip(f, p, [-16, -64, 16, -32], zb + 2, 1.2, { tono: "hi", nombre: `${p}.npu`, sustrato: 3 });
      disipador(f, p, { x0: -18, y0: -66, x1: 18, y1: -30, z: zb + 3.2, alto: 4.2, aletas: 12 });
      f.caja(p, [-92, -24, zb + 2], [p === "lc3" ? -60 : -14, -1.2, zb + 8.4], { tono: "mid", nombre: `${p}.jaulas` });
      for (let i = 0; i < 4; i++) chip(f, p, [30 + i * 16, -56, 40 + i * 16, -46], zb + 2, 0.9, { nombre: `${p}.tcam` });
    }
  }
  for (const [a, b] of [[40, 73], [75, 108]]) f.caja("fuentes", [a, -D, piso], [b, -101.2, piso + 19], { tono: "mid", nombre: "fuentes.modulo", r: 0.6, bisel: 0.4, extra: f.placa(f.arriba(piso + 19), a + 3, -D + 6, b - a - 6, 20) });
  f.caja("ventiladores", [-106, -D, piso], [-40, -101.2, piso + 4], { tono: "lo", nombre: "ventiladores.bandeja" });
  for (const xc of [-95, -73, -51]) ventiladorY(f, "ventiladores", xc, -D + 30, piso + 14, { lado: 20, prof: 10 });

  return f.emitir({
    id, fig, titulo: "Enrutador del proveedor", pista: "Clic para despiezar · flechas para elegir", lectura: "2U modular · 4 ranuras",
    leyenda: ["rp", "lc1", "lc2", "lc3", "plano", "fuentes", "ventiladores", "chasis"],
    etiqueta: "Enrutador modular de 2U del proveedor en un bastidor de dos postes: un procesador de rutas y tres tarjetas de línea que se deslizan hacia el frente, el plano medio, las fuentes y la bandeja de ventiladores.",
    pie: "El enrutador separa dos planos. Las tarjetas de línea reenvían los paquetes en hardware, sin pérdida. El procesador de rutas atiende lo que va dirigido al propio equipo, como las respuestas ICMP «tiempo excedido» que necesita mtr, y las limita por política. Por eso un salto del proveedor puede mostrar pérdida en mtr mientras los saltos siguientes tienen cero: esa pérdida no la sufre el tráfico que pasa.",
  });
}
