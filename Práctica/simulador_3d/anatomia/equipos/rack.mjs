// Equipos de rack de 19 pulgadas: bastidor de dos postes graduado en U, chasis
// abierto (piso, paredes, frente con puertos y tapa) y el interior de cada equipo.
// Escala: 1 unidad = 2 mm. 1U = 44,45 mm = 22,2 unidades.
import { figura } from "../base.mjs";

export const UNI = 22.2;
const HOYOS = [3.2, 11.1, 19.0]; // centros de los agujeros cuadrados dentro de cada U

/** Geometría común de un equipo de rack. */
export function geometria({ U = 1, fondo = 120 }) {
  const z0 = 1.5 + UNI; // apoyado en el borde de la segunda U del bastidor
  const h = U * UNI - 0.4;
  return { U, D: fondo, z0, h, top: z0 + h, pared: 0.8, piso: z0 + 0.8, tapaZ: z0 + h - 0.8, postes: (U + 2) * UNI, x: 110 };
}

/** Bastidor de dos postes sobre el banco, con agujeros, regla de U y orejas atornilladas. */
export function bastidor(f, g) {
  const { k, at, L, D } = f;
  const alto = g.postes;
  for (const lado of [-1, 1]) {
    const cx = lado * 119;
    f.losa("base", { x: cx - 11, y: -14, w: 22, d: 18, r: 1.2 }, 0, 1.5, { tono: "lo", nombre: "stand.pie-poste", bisel: 0.5,
      extra: f.L([k.ring(cx - 6.5, 1, 1.4, 1.5, f.P, 12), k.ring(cx + 6.5, 1, 1.4, 1.5, f.P, 12)].join(""), { tone: "lo" }) + D([at([cx - 6.5, 1, 1.5]), at([cx + 6.5, 1, 1.5])], { size: 0.45 }) });
    const c = f.frente(0);
    let caraPoste = "";
    for (let u = 0; u < g.U + 2; u++) for (const o of HOYOS) {
      const z = 1.5 + u * UNI + o;
      caraPoste += f.hueco(c, { s0: cx - 2.2, s1: cx + 2.2, t0: -z - 2.2, t1: -z + 2.2, r: 0.3 }, 1.4, { claseFondo: "an-hueco-hondo" });
    }
    // Regla de U: marca mayor en cada límite de U y menor en cada agujero, colgando del canto interior.
    const canto = cx - 7; // canto izquierdo: siempre es silueta del poste, así las marcas nacen de un trazo
    const marcas = [];
    for (let u = 0; u <= g.U + 2; u++) {
      const z = 1.5 + u * UNI;
      if (u > 0 && u < g.U + 2) marcas.push(`M${canto} ${-z}H${canto + 2.6}`);
      if (u < g.U + 2) for (const o of HOYOS) marcas.push(`M${canto} ${-(z + o)}H${canto + 1.2}`);
    }
    caraPoste += f.enCara(c, marcas.join(""), { tone: "lo" });
    f.losa("base", { x: cx - 7, y: -10, w: 14, d: 10, r: 0.6 }, 1.5, alto, { tono: "mid", nombre: "stand.poste", bisel: 0.4, extra: caraPoste });
    f.losa("base", { x: cx - 7.6, y: -10.6, w: 15.2, d: 11.2, r: 0.8 }, 1.5 + alto, 1.4, { tono: "mid", nombre: "stand.tapa-poste", bisel: 0.4 });
  }
}

/** Orejas de montaje con dos tornillos cada una (parte del chasis, atornilladas al poste). */
export function orejas(f, g) {
  for (const lado of [-1, 1]) {
    const x0 = lado > 0 ? 104 : -121, x1 = lado > 0 ? 121 : -104;
    const c = f.frente(1.2);
    const extra = f.enCara(c, f.rect(lado > 0 ? 112.6 : -120.4, -(g.top - 2), lado > 0 ? 120.4 : -112.6, -(g.z0 + 2), 0.8), { tone: "faint" });
    f.caja("chasis", [x0, 0, g.z0], [x1, 1.2, g.top], { tono: "mid", nombre: "chasis.oreja", extra, r: 0.8 });
    const tz = g.U === 1 ? [HOYOS[0], HOYOS[2]] : [HOYOS[0], HOYOS[2], UNI * (g.U - 1) + HOYOS[0], UNI * (g.U - 1) + HOYOS[2]];
    for (const z of tz) {
      const cx = lado * 116.5;
      const zz = g.z0 + z;
      f.disco("chasis", [cx, 1.2, zz], [0, 1, 0], 1.8, 0.9, { tono: "mid", nombre: "chasis.tornillo-oreja",
        extra: f.L(f.k.pathOf([f.at([cx - 0.9, 2.1, zz]), f.at([cx + 0.9, 2.1, zz])]) + f.k.pathOf([f.at([cx, 2.1, zz - 0.9]), f.at([cx, 2.1, zz + 0.9])]), { tone: "lo" }) });
    }
  }
}

/** Chasis abierto: piso, paredes (la trasera con aberturas para módulos extraíbles) y frente. */
export function chasis(f, g, { frontal = "", lado = "", huecosTraseros = [], frente = true } = {}) {
  const { D, z0, h, top, piso, tapaZ } = g;
  f.caja("chasis", [-110, -D, z0], [110, -1.2, piso], { tono: "lo", nombre: "chasis.piso" });
  let x = -110;
  for (const [a, b] of [...huecosTraseros].sort((p, q) => p[0] - q[0])) {
    if (a - x > 0.2) f.caja("chasis", [x, -D, piso], [a, -D + 0.8, tapaZ], { tono: "mid", nombre: "chasis.pared-trasera" });
    x = b;
  }
  if (110 - x > 0.2) f.caja("chasis", [x, -D, piso], [110, -D + 0.8, tapaZ], { tono: "mid", nombre: "chasis.pared-trasera" });
  f.caja("chasis", [-110, -D + 0.8, piso], [-109.2, -1.2, tapaZ], { tono: "mid", nombre: "chasis.pared-izq" });
  f.caja("chasis", [109.2, -D + 0.8, piso], [110, -1.2, tapaZ], { tono: "mid", nombre: "chasis.pared-der", extra: lado });
  if (frente) f.caja("chasis", [-110, -1.2, z0], [110, 0, top], { tono: "mid", nombre: "chasis.frente", bisel: 0.3, extra: frontal });
}

/** Tapa superior con ranuras, tornillos perimetrales y etiqueta. */
export function tapa(f, g, { ranurasEn = [], etiqueta = [-70, -64], pieza = "tapa" } = {}) {
  const { k, at } = f;
  const { D, top, tapaZ } = g;
  const c = f.arriba(top);
  let extra = "";
  for (const [x0, x1, y0, y1] of ranurasEn) {
    const out = [];
    for (let x = x0; x + 1.4 <= x1; x += 3.4) out.push(f.rect(x, y0, x + 1.4, y1, 0.7, 3));
    extra += f.enCara(c, out.join(""), { tone: "faint" });
  }
  const tor = [];
  for (let x = -100; x <= 100; x += 40) tor.push([x, -D + 3]);
  for (let y = -D + 20; y < -10; y += 34) tor.push([-107, y], [107, y]);
  extra += f.L(tor.map(([x, y]) => k.ring(x, y, 1.1, top, f.P, 12)).join(""), { tone: "lo" }) + f.D(tor.map(([x, y]) => at([x, y, top])), { size: 0.4 });
  extra += f.placa(c, etiqueta[0], etiqueta[1], 40, 14);
  f.caja(pieza, [-110, -D, tapaZ], [110, -1.2, top], { tono: "mid", nombre: `${pieza}.tapa`, bisel: 0.6, extra, dentro: f.L(k.sideSeam({ x: -110, y: -D, w: 220, d: D - 1.2, r: 0 }, tapaZ + 0.3, f.P, 2), { tone: "faint" }) });
}

/** Puerto RJ45 en una cara: abertura con muesca del pestillo, contactos y LED. */
export function rj45(f, c, s0, zb, { arriba = true, ancho = 6.2, alto = 6, led = 0, prof = 3 } = {}) {
  const s1 = s0 + ancho, t0 = -(zb + alto), t1 = -zb, sc = (s0 + s1) / 2, m = 1.3;
  const anillo = arriba
    ? [[s0, t1], [s1, t1], [s1, t0], [sc + m, t0], [sc + m, t0 + 1.2], [sc - m, t0 + 1.2], [sc - m, t0], [s0, t0]]
    : [[s0, t0], [s1, t0], [s1, t1], [sc + m, t1], [sc + m, t1 - 1.2], [sc - m, t1 - 1.2], [sc - m, t1], [s0, t1]];
  const contactos = [];
  for (let i = 0; i < 8; i++) {
    const s = sc - 2.45 + i * 0.7;
    contactos.push(arriba ? f.rect(s - 0.17, t0 + 1.6, s + 0.17, t0 + 3.2, 0.1, 1) : f.rect(s - 0.17, t1 - 3.2, s + 0.17, t1 - 1.6, 0.1, 1));
  }
  let out = f.hueco(c, { anillo }, prof, { fondoExtra: f.L(contactos.join(""), { tone: "lo" }) });
  if (led) out += f.leds(c, [[arriba ? s0 + 0.9 : s1 - 0.9, arriba ? t0 + 0.7 : t1 - 0.7]], { latido: led === 2, tono: led ? "hi" : "lo" });
  return out;
}

/** Abertura de jaula SFP: boca rectangular con el muelle de masa visible al fondo. */
export function bocaSFP(f, c, s0, zb, { ancho = 7.2, alto = 4.4 } = {}) {
  const t0 = -(zb + alto), t1 = -zb;
  const fondo = f.L(f.rect(s0 + 1.2, t0 + 1.2, s0 + ancho - 1.2, t1 - 1.2, 0.3, 2), { tone: "lo" });
  return f.hueco(c, { s0, s1: s0 + ancho, t0, t1, r: 0.2 }, 6, { fondoExtra: fondo });
}

/** Ventilador de 40 mm con el eje en x, visto por su cara +x. */
export function ventilador(f, pieza, x0, yc, zc, { lado = 19.6, prof = 10, nombre } = {}) {
  const { k, P } = f;
  const x1 = x0 + prof;
  const r = lado / 2 - 1.2;
  const centro = [x1, yc, zc];
  const aspas = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const p0 = [x1, yc + Math.cos(a) * 3.2, zc + Math.sin(a) * 3.2];
    const p1 = [x1, yc + Math.cos(a + 0.9) * r, zc + Math.sin(a + 0.9) * r];
    const pm = [x1, yc + Math.cos(a + 0.35) * (r * 0.62), zc + Math.sin(a + 0.35) * (r * 0.62)];
    aspas.push(k.pathOf([f.at(p0), f.at(pm), f.at(p1)]));
  }
  const extra =
    `<g class="an-aro">${f.L(k.sideRing(centro, r, "x", P, 36), { tone: "lo" })}</g>` +
    f.L(aspas.join(""), { tone: "faint" }) +
    f.S(f.G.disc(0, 0.6, 3.2, f.G.frameAlong(centro, [1, 0, 0]), P), { tone: "mid" }) +
    f.D([[yc - lado / 2 + 1.6, zc - lado / 2 + 1.6], [yc + lado / 2 - 1.6, zc - lado / 2 + 1.6], [yc - lado / 2 + 1.6, zc + lado / 2 - 1.6], [yc + lado / 2 - 1.6, zc + lado / 2 - 1.6]].map(([y, z]) => f.at([x1, y, z])), { size: 0.45 });
  return f.caja(pieza, [x0, yc - lado / 2, zc - lado / 2], [x1, yc + lado / 2, zc + lado / 2], { tono: "mid", nombre: nombre ?? `${pieza}.ventilador`, r: 1.2, extra });
}

/** Disipador de aletas sobre un chip: base, aletas paralelas a y y cuatro pasadores. */
export function disipador(f, pieza, { x0, y0, x1, y1, z, alto = 9, aletas = 10 }) {
  const { k, P } = f;
  const base = 1.6;
  const partes = [f.S(k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.6 }, z, base, P, 3), { tone: "mid" })];
  const paso = (x1 - x0 - 0.8) / (aletas - 1);
  for (let i = 0; i < aletas; i++) {
    const x = x0 + i * paso;
    partes.push(f.S(k.slabOf({ x, y: y0 + 0.6, w: 0.8, d: y1 - y0 - 1.2, r: 0 }, z + base, alto, P, 2), { tone: "hi", crease: "lo" }));
  }
  const pas = [[x0 + 1.2, y0 + 1.2], [x1 - 1.2, y0 + 1.2], [x0 + 1.2, y1 - 1.2], [x1 - 1.2, y1 - 1.2]];
  partes.push(f.D(pas.map(([x, y]) => f.at([x, y, z + base])), { size: 0.5 }));
  const forma = f.A.box([x0, y0, z], [x1, y1, z + base + alto], { name: f.R.nameFor(`${pieza}.disipador`) });
  return f.item(pieza, [(x0 + x1) / 2, (y0 + y1) / 2, z + (base + alto) / 2], partes.join(""), [forma]);
}

/** Chip en encapsulado plano con marca de pin 1 y, si se pide, contorno interior del sustrato. */
export function chip(f, pieza, [x0, y0, x1, y1], z, alto, o = {}) {
  const { k, P, at } = f;
  const extra = f.D([at([x0 + 1, y0 + 1, z + alto])], { size: 0.45, tone: "lo" }) + (o.sustrato ? f.L(k.planOutline(k.insetPlan({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0.4 }, o.sustrato), z + alto, P, 3), { tone: "lo" }) : "");
  return f.caja(pieza, [x0, y0, z], [x1, y1, z + alto], { tono: o.tono ?? "mid", lit: o.lit, r: 0.4, nombre: o.nombre, extra, bisel: o.bisel, monta: o.monta });
}

/** Encaje común para la cámara de un equipo de rack. */
export function encajeRack(g, extra = []) {
  const pts = [];
  for (const x of [-132, 132]) for (const y of [-g.D - 14, 24]) pts.push([x, y, -10], [x, y, 0]);
  for (const x of [-126, 126]) pts.push([x, -10, 1.5 + g.postes + 1.4], [x, 0, 1.5 + g.postes + 1.4]);
  return [...pts, ...extra];
}

/* ------------------------------------------------------------------ */
/*  Switch de acceso PoE (24 o 16 puertos)                             */
/* ------------------------------------------------------------------ */
export function switchAcceso({ id = "switch", puertos = 24, poe = true, fig = "Fig 3" } = {}) {
  const g = geometria({ U: 1, fondo: 120 });
  const { D, z0, piso, top } = g;
  const pcbZ = piso + 2.4, pcbT = pcbZ + 0.8;
  const TAPA = [0, -(g.D + 8), 60];
  const piezas = {
    asic: { nombre: "ASIC de conmutación", dice: "ASIC · reenvía tramas por dirección MAC en capa 2 · no resta TTL, así que mtr no lo ve", mueve: [0, 0, 0] },
    disipador: { nombre: "Disipador del ASIC", dice: "disipador de aletas · el ASIC disipa unos 15 W a plena carga", mueve: [0, 0, 26] },
    cpu: { nombre: "CPU de gestión y memoria", dice: "CPU de gestión · plano de control (STP, LLDP, SNMP) · no toca las tramas", mueve: [0, 0, 0] },
    poe: { nombre: poe ? "Controladores PoE" : "Reguladores de tensión", dice: poe ? "PoE 802.3at · hasta 30 W por puerto · alimenta al punto de acceso" : "reguladores · bajan 12 V a las tensiones del ASIC", mueve: [0, 0, 0] },
    puertos: { nombre: `${puertos} puertos RJ45 y jaulas SFP`, dice: `${puertos} × 1000BASE-T · el punto de acceso cuelga del puerto 1 · 4 jaulas SFP de subida`, mueve: [0, 0, 0] },
    sfp: { nombre: "Transceptores SFP de subida", dice: "SFP 1000BASE-LX · enlace de fibra hacia el núcleo", mueve: [0, 0, 0] },
    fuente: { nombre: "Fuente de alimentación", dice: poe ? "fuente interna · 100–240 V CA · 370 W, casi todo para PoE" : "fuente interna · 100–240 V CA · 60 W", mueve: [0, 0, 30] },
    ventiladores: { nombre: "Ventiladores", dice: "2 ventiladores de 40 mm · flujo de aire de lado a lado", mueve: [0, 0, 32] },
    placa: { nombre: "Placa base", dice: "placa base · une puertos, ASIC y CPU", mueve: [0, 0, 0] },
    tapa: { nombre: "Tapa", dice: "tapa de acero · se retira para ver el interior", mueve: TAPA },
    chasis: { nombre: "Chasis 1U", dice: `chasis 1U · 440 × 44 × ${D * 2} mm · orejas de 19 pulgadas`, mueve: [0, 0, 0] },
    base: { nombre: "Bastidor", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["tapa", "ventiladores", "fuente", "disipador", "sfp", "asic", "cpu", "poe", "puertos", "placa", "chasis", "base"];
  const f = figura({ encaje: encajeRack(g, [[-110 + TAPA[0], -D + TAPA[1], top + TAPA[2]], [110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]], [-110 + TAPA[0], -1.2 + TAPA[1], top + TAPA[2]]]), piezas, orden });
  const { k, P, at } = f;

  f.banco({ x: -132, y: -D - 14, w: 264, d: D + 38, r: 6 });
  bastidor(f, g);

  // Frente: consola, LED de sistema, 2 filas de puertos, jaulas SFP, botón de modo y placa de datos.
  const c = f.frente(0);
  let fr = "";
  fr += rj45(f, c, -105.6, z0 + 11.4, { ancho: 5.6 });
  fr += f.hueco(c, { s0: -105.4, s1: -100.2, t0: -(z0 + 7.2), t1: -(z0 + 5), r: 0.3 }, 2.4);
  fr += f.leds(c, [[-97.4, -(z0 + 17)], [-97.4, -(z0 + 14)], [-97.4, -(z0 + 11)]], { tono: "hi" });
  const columnas = puertos / 2;
  const sIni = -93;
  const sDe = (i) => sIni + i * 7 + Math.floor(i / 6) * 2.4;
  for (let i = 0; i < columnas; i++) {
    fr += rj45(f, c, sDe(i), z0 + 11.4, { arriba: true, led: i === 0 ? 2 : i % 3 === 1 ? 1 : 0 });
    fr += rj45(f, c, sDe(i), z0 + 3.6, { arriba: false, led: i % 4 === 2 ? 1 : 0 });
  }
  const finPuertos = sDe(columnas - 1) + 6.2;
  const sfpIni = finPuertos + 6;
  for (let i = 0; i < 4; i++) fr += bocaSFP(f, c, sfpIni + i * 8.6, z0 + 7.2);
  const sBoton = sfpIni + 4 * 8.6 + 4;
  fr += f.leds(c, [[sBoton, -(z0 + 17)], [sBoton + 3, -(z0 + 17)], [sBoton + 6, -(z0 + 17)]], { tono: "hi" });
  fr += f.enCara(c, f.k.pathOf(f.k.circleRing(sBoton + 3, -(z0 + 7), 1.7, 14), true), { tone: "lo" });
  const sPlaca = Math.max(sBoton + 12, 62);
  fr += f.placa(c, sPlaca, -(z0 + 17.6), 100 - sPlaca, 12);
  const lado = f.ranuras(f.lado(110), 12, 100, -(z0 + 17), -(z0 + 5), 3.2, 1.2);
  chasis(f, g, { frontal: fr, lado });
  orejas(f, g);
  f.disco("puertos", [sBoton + 3, 0, z0 + 7], [0, 1, 0], 1.2, 0.6, { tono: "hi", nombre: "puertos.boton-modo" });

  // Interior: separadores y placa base en L (la fuente ocupa la esquina trasera derecha).
  for (const [x, y] of [[-100, -8], [100, -8], [-100, -40], [40, -D + 8], [-90, -D + 8], [100, -D + 62], [0, -40]]) f.cil("placa", x, y, 1.2, piso, 2.4, { tono: "lo", nombre: "placa.separador", pasos: 12 });
  const pcb = [[-106, -1.6], [106, -1.6], [106, -D + 56], [46, -D + 56], [46, -D + 4], [-96, -D + 4], [-96, -28], [-106, -28]];
  f.prisma("placa", pcb, pcbZ, 0.8, { tono: "lo", convexo: false, nombre: "placa.pcb", extra: f.L(k.onTop([[-106, -30], [-96, -30]], pcbT, P), { tone: "faint" }) });

  // Bloque de conectores y magnéticos detrás del frente, jaulas SFP.
  const xIni = sDe(0) - 1, xFin = finPuertos + 1;
  f.caja("puertos", [xIni, -15, pcbT], [xFin, -1.2, z0 + 18.4], { tono: "mid", nombre: "puertos.jacks", extra: f.L(k.lineOnTop([xIni, -8], [xFin, -8], z0 + 18.4, P), { tone: "faint" }) });
  const mag = (xFin - xIni) / 6;
  for (let i = 0; i < 6; i++) f.caja("puertos", [xIni + i * mag + 0.6, -22, pcbT], [xIni + (i + 1) * mag - 0.6, -17, pcbT + 3.2], { tono: "mid", nombre: "puertos.magnetico", r: 0.4 });
  const xS0 = sfpIni - 0.6, xS1 = sfpIni + 4 * 8.6 - 0.8;
  f.caja("puertos", [xS0, -27, pcbT], [xS1, -1.2, z0 + 12.2], { tono: "mid", nombre: "puertos.jaulas", extra: f.L([1, 2, 3].map((i) => k.lineOnTop([sfpIni + i * 8.6 - 0.7, -27], [sfpIni + i * 8.6 - 0.7, -1.2], z0 + 12.2, P)).join(""), { tone: "lo" }) });
  for (let i = 0; i < 2; i++) {
    const s = sfpIni + i * 8.6;
    f.caja("sfp", [s + 0.6, 0, z0 + 7.8], [s + 6.6, 3.2, z0 + 11], { tono: "hi", nombre: "sfp.modulo", r: 0.3, extra: f.enCara(f.frente(3.2), f.rect(s + 1.4, -(z0 + 10.4), s + 3.3, -(z0 + 8.4), 0.4) + f.rect(s + 3.9, -(z0 + 10.4), s + 5.8, -(z0 + 8.4), 0.4), { tone: "lo" }) });
    f.caja("sfp", [s + 1.6, 0, z0 + 7.2], [s + 5.6, 4.6, z0 + 7.8], { tono: "mid", nombre: "sfp.asa", r: 0.4 });
  }

  // PoE o reguladores, ASIC con su disipador, CPU con memoria y flash.
  for (let i = 0; i < 6; i++) chip(f, "poe", [xIni + 4 + i * mag, -31, xIni + 9 + i * mag, -26.5], pcbT, 1, { nombre: "poe.controlador" });
  chip(f, "asic", [18, -72, 40, -50], pcbT, 1.4, { lit: true, tono: "hi", sustrato: 3, nombre: "asic.encapsulado", bisel: 0.4 });
  disipador(f, "disipador", { x0: 16, y0: -74, x1: 42, y1: -48, z: pcbT + 1.4 });
  chip(f, "cpu", [-62, -84, -50, -72], pcbT, 1.1, { nombre: "cpu.procesador", sustrato: 2 });
  chip(f, "cpu", [-46, -84, -38, -79.5], pcbT, 0.9, { nombre: "cpu.ram" });
  chip(f, "cpu", [-46, -76.5, -38, -72], pcbT, 0.9, { nombre: "cpu.ram" });
  chip(f, "cpu", [-62, -66, -56, -61], pcbT, 0.8, { nombre: "cpu.flash" });
  f.cil("placa", 46, -46, 1.1, pcbT, 1.2, { tono: "mid", nombre: "placa.cristal", pasos: 14 });
  for (const [x, y] of [[0, -D + 62], [6, -D + 62], [12, -D + 62], [0, -D + 70], [6, -D + 70]]) f.cil("placa", x, y, 1.6, pcbT, 5, { tono: "mid", nombre: "placa.condensador", pasos: 16, extra: f.L(k.ring(x, y, 0.9, pcbT + 5, P, 10), { tone: "lo" }) });
  f.caja("placa", [48, -62, pcbT], [60, -56, pcbT + 3], { tono: "mid", nombre: "placa.conector-fuente", r: 0.3, extra: f.D([50, 52, 54, 56, 58].map((x) => at([x, -59, pcbT + 3])), { size: 0.4, tone: "lo" }) });

  // Fuente interna: tapa ventilada, placa de datos y mazo hasta el conector de la placa.
  const fz1 = piso + 17.8;
  const cf = f.arriba(fz1);
  let ef = "";
  { const out = []; for (let x = 58; x + 1.4 <= 100; x += 3.4) out.push(f.rect(x, -D + 8, x + 1.4, -D + 24, 0.7, 3)); ef += f.enCara(cf, out.join(""), { tone: "faint" }); }
  ef += f.placa(cf, 60, -D + 30, 34, 14);
  ef += f.tornillos(cf, [[54, -D + 5], [104, -D + 5], [54, -D + 47], [104, -D + 47]], 0.9);
  f.caja("fuente", [52, -D + 3, piso], [106, -D + 50, fz1], { tono: "mid", nombre: "fuente.caja", r: 0.6, bisel: 0.4, extra: ef + f.hueco(f.frente(-D + 50), { s0: 52.6, s1: 58.6, t0: -(pcbT + 8.9), t1: -(pcbT + 5.1), r: 0.3 }, 1.6) });
  f.cable("fuente", [[54, -D + 50, pcbT + 7], [54, -59, pcbT + 7], [54, -59, pcbT + 3]], 0.9, { nombre: "fuente.mazo", libre: [false, true], tono: "mid" });

  // Ventiladores junto a la pared izquierda.
  for (const yc of [-82, -56]) ventilador(f, "ventiladores", -109.2, yc, piso + 9.8);

  tapa(f, g, { ranurasEn: [[56, 102, -D + 6, -D + 26], [-104, -100, -92, -46]], etiqueta: [-80, -60] });

  return f.emitir({
    id, fig,
    titulo: `Switch de acceso · ${puertos} puertos${poe ? " PoE" : ""}`,
    pista: "Clic para despiezar · flechas para elegir",
    lectura: `1U · ${puertos} × 1 GbE + 4 SFP`,
    leyenda: ["asic", "disipador", "cpu", "poe", "puertos", "sfp", "fuente", "ventiladores", "placa", "tapa", "chasis"],
    etiqueta: `Switch de acceso de ${puertos} puertos montado en un bastidor de dos postes, con la tapa retirable, la placa base, el ASIC de conmutación bajo su disipador, la CPU de gestión, ${poe ? "los controladores PoE" : "los reguladores"}, la fuente interna y los ventiladores.`,
    pie: `El switch de acceso es el primer equipo cableado del recorrido. Conmuta en capa 2: el ASIC lee la dirección MAC de destino y reenvía la trama en microsegundos, sin restar el TTL, así que mtr y traceroute no lo muestran como salto. ${poe ? "Además alimenta al punto de acceso por el mismo cable (PoE 802.3at). " : ""}La CPU de gestión solo atiende el plano de control; un retardo anómalo en este tramo apunta a congestión del enlace de subida, no al equipo.`,
  });
}
