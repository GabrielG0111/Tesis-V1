// Equipos fuera del rack: portátil del estudiante, punto de acceso, roseta,
// teléfono de un tercero y PC de torre. Escala: 1 unidad = 1 mm (la torre, 2 mm).
import { figura } from "../base.mjs";
import { rj45, chip, disipador } from "./rack.mjs";
import { ventiladorY } from "./rack2.mjs";

const GRADO = Math.PI / 180;

/* ------------------------------------------------------------------ */
/*  Portátil del estudiante (vista en corte)                           */
/* ------------------------------------------------------------------ */
export function portatil({ id = "portatil", fig = "Fig 1" } = {}) {
  const TH = 12 * GRADO, sT = Math.sin(TH), cT = Math.cos(TH);
  const piezas = {
    wifi: { nombre: "Tarjeta Wi-Fi M.2", dice: "tarjeta Wi-Fi 802.11ac 2×2 · origen de las sondas; aquí actúa el ahorro de energía", mueve: [0, 0, 30] },
    antenas: { nombre: "Cables de antena", dice: "2 coaxiales · llevan la señal a las antenas del marco de la pantalla", mueve: [0, 0, 30] },
    placa: { nombre: "Placa base y SoC", dice: "placa base · el núcleo pone la marca de tiempo a cada paquete; tcpdump la lee aquí", mueve: [0, 0, 0] },
    ventilacion: { nombre: "Ventilación", dice: "ventilador centrífugo, tubo de calor y aletas sobre el SoC", mueve: [0, 0, 24] },
    memoria: { nombre: "Memoria", dice: "SO-DIMM DDR4 de 16 GB", mueve: [0, 0, 18] },
    adaptador: { nombre: "Adaptador USB-C a RJ45", dice: "adaptador USB-C a Gigabit Ethernet · la medición cableada de control, sin Wi-Fi", mueve: [34, 0, 0] },
    teclado: { nombre: "Teclado y reposamanos", dice: "cubierta superior, recortada para ver el interior", mueve: [0, 0, 0] },
    pantalla: { nombre: "Pantalla", dice: "pantalla · mtr en curso; las antenas Wi-Fi van en su marco superior", mueve: [0, 0, 0] },
    carcasa: { nombre: "Carcasa inferior", dice: "carcasa inferior de aluminio · puertos a la derecha", mueve: [0, 0, 0] },
    base: { nombre: "Mesa", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["adaptador", "ventilacion", "wifi", "antenas", "memoria"];
  const P0 = [-100, 15];
  const w = [-sT, cT], n = [cT, sT];
  const lid = [P0, [P0[0] + 205 * w[0], P0[1] + 205 * w[1]], [P0[0] + 205 * w[0] - 7 * n[0], P0[1] + 205 * w[1] - 7 * n[1]], [P0[0] - 7 * n[0], P0[1] - 7 * n[1]]];
  const encaje = [];
  for (const x of [-190, 260]) for (const y of [-150, 132]) encaje.push([x, y, -14], [x, y, 0]);
  for (const x of [-150, 150]) encaje.push([x, lid[1][0], lid[1][1]], [x, lid[2][0], lid[2][1]]);
  const f = figura({ encaje, piezas, orden, azimut: 52, elevacion: 32 });
  const { k, P, at, G } = f;
  f.banco({ x: -190, y: -150, w: 450, d: 282, r: 8 }, { grosor: 8, pata: 6 });

  // Carcasa inferior: patas, piso y paredes; puertos en la pared derecha.
  for (const [x, y] of [[-128, -78], [128, -78], [-128, 78], [128, 78]]) f.cil("carcasa", x, y, 6, 0, 2, { tono: "lo", nombre: "carcasa.pata", pasos: 20 });
  f.caja("carcasa", [-150, -100, 2], [150, 100, 3.5], { tono: "lo", nombre: "carcasa.piso" });
  f.caja("carcasa", [-150, -100, 3.5], [150, -98.5, 12], { tono: "mid", nombre: "carcasa.pared-trasera" });
  f.caja("carcasa", [-150, -98.5, 3.5], [-148.5, 98.5, 12], { tono: "mid", nombre: "carcasa.pared-izq" });
  f.caja("carcasa", [-150, 98.5, 3.5], [150, 100, 12], { tono: "mid", nombre: "carcasa.pared-frontal" });
  const cd = f.lado(150);
  let pu = "";
  for (const y of [-40, -26]) pu += f.hueco(cd, { s0: -y - 4.3, s1: -y + 4.3, t0: -9.1, t1: -6.4, r: 1.3 }, 3);
  pu += f.hueco(cd, { s0: 2, s1: 14, t0: -10.3, t1: -5.8, r: 0.4 }, 4);
  pu += f.hueco(cd, { s0: -22, s1: -8, t0: -10, t1: -5.6, r: 0.8 }, 3);
  pu += f.enCara(cd, k.pathOf(k.circleRing(-34, -7.8, 1.8, 14), true), { tone: "lo" });
  pu += f.leds(cd, [[47, -8]], { tono: "hi" });
  f.caja("carcasa", [148.5, -98.5, 3.5], [150, 98.5, 12], { tono: "mid", nombre: "carcasa.pared-der", extra: pu });

  // Bisagras y pantalla inclinada 12° hacia atrás.
  for (const [a, b] of [[-125, -95], [95, 125]]) f.disco("pantalla", [a, -104.6, 14], [1, 0, 0], 4.5, b - a, { tono: "mid", nombre: "pantalla.bisagra", dueno: "pantalla" });
  const Fx = G.frameOf([0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const arriba = [-150, lid[1][0], lid[1][1]];
  const cp = f.cara(arriba, [1, 0, 0], [0, sT, -cT]);
  const lineas = ["$ mtr -rwc 100 203.0.113.50", "HOST               Loss%   Avg", "1. 10.20.32.1       0.0%   3.1", "2. 10.20.255.1      0.0%   3.6", "3. 198.51.100.1     0.0%   5.2", "4. 198.51.100.9    30.0%   9.8", "5. 203.0.113.1      0.0%   9.4", "6. 203.0.113.50     0.0%  10.1"];
  const texto = lineas.map((l, i) => `<text class="an-texto" x="22" y="${(34 + i * 15).toFixed(1)}" font-size="9.5" xml:space="preserve">${l}</text>`).join("") + `<rect class="an-cursor" x="22" y="${(34 + 8 * 15 - 8).toFixed(1)}" width="5.6" height="9.5"/>`;
  const pantallaSvg = f.hueco(cp, { s0: 10, s1: 290, t0: 8, t1: 191, r: 1.5 }, 1.2, { claseFondo: "an-pantalla", fondoExtra: texto }) + f.leds(cp, [[150, 4]], { tono: "lo" });
  f.prismaEje("pantalla", Fx, lid, -150, 150, { tono: "mid", nombre: "pantalla.tapa", extra: pantallaSvg, dueno: "pantalla" });

  // Cubierta superior en corte: franja frontal completa y parte izquierda; el cuadrante trasero derecho queda abierto.
  const teclas = (x0, x1, y0, y1) => {
    const out = [];
    for (let fila = 0; fila < 6; fila++) for (let col = 0; col < 15; col++) {
      const x = -126 + col * 17, y = -86 + fila * 16;
      if (x < x0 || x + 15.2 > x1 || y < y0 || y + 14.6 > y1) continue;
      out.push({ x, y, d: k.depthOf([x + 7.6, y + 7.3, 18], P) });
    }
    return out.sort((a, b) => a.d - b.d).map(({ x, y }) => f.S(k.slabOf({ x, y, w: 15.2, d: 14.6, r: 1.6 }, 18, 1.1, P, 3), { tone: "mid" })).join("");
  };
  const ct = f.arriba(18);
  f.caja("teclado", [-150, -100, 12], [10, -6, 18], { tono: "mid", nombre: "teclado.izquierda", bisel: 0.6, extra: teclas(-150, 10, -100, -6) + f.D([at([-140, -92, 18])], { size: 0.5, tone: "lo" }) });
  f.caja("teclado", [-150, -6, 12], [150, 100, 18], { tono: "mid", nombre: "teclado.frente", bisel: 0.6, extra: teclas(-150, 150, -6, 100) + f.enCara(ct, f.rect(-55, 32, 55, 90, 4), { tone: "lo" }) + f.enCara(ct, f.rect(-53.4, 33.6, 53.4, 88.4, 3), { tone: "faint" }) + f.leds(ct, [[140, -2]], { tono: "hi" }) });

  // Interior visible en el corte: placa en L alrededor del ventilador.
  for (const [x, y] of [[14, -14], [144, -14], [144, -94], [62, -94], [62, -56]]) f.cil("placa", x, y, 2, 3.5, 1.5, { tono: "lo", nombre: "placa.separador", pasos: 12 });
  f.prisma("placa", [[10, -10], [147, -10], [147, -97], [58, -97], [58, -52], [10, -52]], 5, 0.8, { tono: "lo", convexo: false, nombre: "placa.pcb", extra: f.L([k.lineOnTop([58, -52], [58, -97], 5.8, P)].join(""), { tone: "faint" }) });
  chip(f, "placa", [64, -50, 86, -28], 5.8, 1.2, { tono: "hi", nombre: "placa.soc", sustrato: 2.5 });
  for (const [x, y] of [[90, -20], [98, -20], [106, -20]]) f.caja("placa", [x, y - 6, 5.8], [x + 6, y, 9.2], { tono: "mid", nombre: "placa.inductor", r: 0.6 });
  chip(f, "placa", [126, -26, 138, -14], 5.8, 1, { nombre: "placa.usb-c" });
  chip(f, "placa", [40, -40, 52, -28], 5.8, 1, { nombre: "placa.pch" });

  // Ventilación: ventilador centrífugo, aletas, placa de cobre y tubo de calor.
  const fan = [34, -74], fr = 20;
  const aspas = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; aspas.push(k.lineOnTop([fan[0] + Math.cos(a) * 7, fan[1] + Math.sin(a) * 7], [fan[0] + Math.cos(a + 0.3) * 16.5, fan[1] + Math.sin(a + 0.3) * 16.5], 11.5, P)); }
  f.cil("ventilacion", fan[0], fan[1], fr, 3.5, 8, { tono: "mid", pasos: 48, nombre: "ventilacion.ventilador", extra: f.L(k.ring(fan[0], fan[1], 16.5, 11.5, P, 40), { tone: "lo" }) + f.L(aspas.join(""), { tone: "faint" }) + f.S(k.cylinder(fan[0], fan[1], 7, 11.5, 0.6, P, 24), { tone: "mid" }) });
  const aletas = []; for (let x = 15.5; x < 57; x += 2.2) aletas.push(k.lineOnTop([x, -98.5], [x, -94.5], 11, P));
  f.caja("ventilacion", [14, -98.5, 3.5], [58, -94.5, 11], { tono: "mid", nombre: "ventilacion.aletas", extra: f.L(aletas.join(""), { tone: "lo" }) });
  f.caja("ventilacion", [66, -54, 7], [90, -24, 10], { tono: "hi", nombre: "ventilacion.cobre", extra: f.D([[68, -52], [88, -52], [68, -26], [88, -26]].map(([x, y]) => at([x, y, 10])), { size: 0.5 }) });
  f.cable("ventilacion", [[66, -40, 8.5], [56.5, -40, 8.5], [56.5, -94.5, 8.5]], 1, { curva: 8, nombre: "ventilacion.tubo", tono: "hi", trozo: 20 });

  // Memoria SO-DIMM con su zócalo.
  f.caja("placa", [134, -93, 5.8], [140, -61, 9], { tono: "lo", nombre: "placa.zocalo-ram" });
  f.caja("memoria", [64, -92, 7.4], [134, -62, 8.2], { tono: "mid", nombre: "memoria.sodimm", extra: f.L([70, 86, 102, 118].map((x) => k.planOutline({ x, y: -88, w: 12, d: 9, r: 0.4 }, 8.2, P, 2)).join(""), { tone: "lo" }) });
  f.caja("placa", [62, -78, 5.8], [64, -74, 7.4], { tono: "lo", nombre: "placa.pestillo-ram" });

  // Tarjeta Wi-Fi (sujeto) con su blindaje, conectores u.FL y cables de antena hasta la bisagra.
  f.caja("placa", [96, -51, 5.8], [100, -27, 8.2], { tono: "lo", nombre: "placa.zocalo-wifi" });
  f.cil("placa", 132, -39, 1.6, 5.8, 0.8, { tono: "lo", nombre: "placa.tornillo-wifi", pasos: 12 });
  f.caja("wifi", [100, -50, 6.6], [130, -28, 7.4], { tono: "mid", nombre: "wifi.tarjeta" });
  f.caja("wifi", [116, -47, 7.4], [128, -31, 8.8], { tono: "hi", lit: true, nombre: "wifi.blindaje", bisel: 0.3 });
  for (const x of [110, 113.6]) f.caja("wifi", [x - 0.8, -40.8, 7.4], [x + 0.8, -39.2, 8.6], { tono: "hi", nombre: "wifi.ufl" });
  f.caja("placa", [106, -97, 5.8], [126, -93, 13.5], { tono: "mid", nombre: "placa.sujetacables", r: 0.6 });
  f.cable("antenas", [[110, -40, 8.6], [110, -40, 12], [110, -93, 12]], 0.5, { nombre: "antenas.coaxial", tono: "mid", libre: [false, true], monta: "wifi" });
  f.cable("antenas", [[113.6, -40, 8.6], [113.6, -40, 12.4], [113.6, -82, 12.4], [120, -82, 12.4], [120, -93, 12.4]], 0.5, { nombre: "antenas.coaxial", tono: "mid", libre: [false, true], monta: "wifi" });

  // Adaptador USB-C a RJ45 sobre la mesa.
  f.caja("adaptador", [150, -45, 5], [162, -35, 10.5], { tono: "mid", nombre: "adaptador.clavija", r: 1.5 });
  f.cable("adaptador", [[162, -40, 7.75], [176, -40, 7.75], [194, -48, 7], [194, -58, 7]], 1.6, { nombre: "adaptador.cable", tono: "mid" });
  const cdg = f.lado(206);
  f.caja("adaptador", [182, -92, 0], [206, -58, 14], { tono: "mid", nombre: "adaptador.cuerpo", r: 3, bisel: 0.5, extra: rj45(f, cdg, 66, 1.4, { ancho: 13.6, alto: 11.2, prof: 6, led: 2 }) });

  return f.emitir({
    id, fig, titulo: "Portátil del estudiante", pista: "Clic para despiezar · flechas para elegir", lectura: "cliente · Wi-Fi 2×2 + adaptador cableado",
    leyenda: ["wifi", "antenas", "placa", "ventilacion", "memoria", "adaptador", "teclado", "pantalla", "carcasa"],
    etiqueta: "Portátil abierto sobre una mesa, con la cubierta superior recortada en la esquina trasera derecha para mostrar la tarjeta Wi-Fi, sus cables de antena hacia la bisagra, la memoria, la placa base y la ventilación, y un adaptador USB-C a RJ45 conectado al costado.",
    permitir: { crowd: [["antenas.coaxial*", "carcasa.pared-trasera*"], ["ventilacion.tubo*", "carcasa.pared-trasera*"]] },
    pie: "El portátil es el extremo de medición: genera las sondas, pone la marca de tiempo a cada paquete y guarda las capturas. Su tarjeta Wi-Fi es la mitad inalámbrica del primer salto; si tiene activado el ahorro de energía, retiene los paquetes de bajada hasta la siguiente baliza y el retardo sube decenas de milisegundos. El adaptador cableado permite repetir la sesión sin Wi-Fi como medición de control.",
  });
}

/* ------------------------------------------------------------------ */
/*  Punto de acceso Wi-Fi                                               */
/* ------------------------------------------------------------------ */
export function puntoAcceso({ id = "ap", fig = "Fig 2" } = {}) {
  const PLACA = [0, 0, 24];
  const piezas = {
    radio5: { nombre: "Radio de 5 GHz", dice: "radio de 5 GHz · 802.11ac 2×2 en el canal 36 de 80 MHz · atiende al portátil", mueve: PLACA },
    radio24: { nombre: "Radio de 2,4 GHz", dice: "radio de 2,4 GHz · 802.11n · el portátil no la usa en las sesiones", mueve: PLACA },
    soc: { nombre: "Procesador y memoria", dice: "SoC de red · puentea las tramas Wi-Fi a Ethernet; el AP no es un salto IP", mueve: PLACA },
    antenas: { nombre: "Antenas y cables", dice: "4 antenas internas de doble banda · 2 por radio", mueve: [0, 0, 48] },
    poe: { nombre: "Etapa PoE", dice: "controlador PoE y transformador · toma 25 W del mismo cable de datos", mueve: PLACA },
    placa: { nombre: "Placa principal", dice: "placa principal", mueve: PLACA },
    tapa: { nombre: "Cubierta (radomo)", dice: "cubierta de plástico transparente a la radiofrecuencia", mueve: [0, 0, 72], desvanece: 0.84 },
    carcasa: { nombre: "Base y disipador", dice: "base metálica · disipa el calor y sostiene el puerto Ethernet", mueve: [0, 0, 0] },
    cable: { nombre: "Cable PoE", dice: "cable UTP Cat 6 · datos y energía desde el puerto 1 del switch de acceso", mueve: [0, 0, 0] },
    base: { nombre: "Soporte", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["tapa", "antenas", "placa", "radio5", "radio24", "soc", "poe"];
  const encaje = [];
  for (const x of [-150, 190]) for (const y of [-140, 140]) encaje.push([x, y, -12], [x, y, 0]);
  encaje.push([-100, -100, 112], [100, 100, 112], [-100, 100, 112], [100, -100, 112]);
  const f = figura({ encaje, piezas, orden, azimut: 48, elevacion: 34 });
  const { k, P, at } = f;
  f.banco({ x: -150, y: -140, w: 340, d: 280, r: 8 }, { grosor: 8, pata: 4 });

  // Soporte de techo y base metálica con el puerto Ethernet en el costado +x.
  f.caja("base", [-70, -70, 0], [70, 70, 2], { tono: "lo", nombre: "stand.soporte", r: 4, extra: f.L([-40, 40].map((y) => k.planOutline({ x: -56, y: y - 3, w: 112, d: 6, r: 3 }, 2, P, 4)).join(""), { tone: "faint" }) });
  const cx = f.lado(100);
  let puerto = rj45(f, cx, -7, 5.2, { ancho: 14, alto: 8.8, prof: 8, led: 0 }) + f.leds(cx, [[12, -12]], { tono: "hi" });
  f.losa("carcasa", { x: -100, y: -100, w: 200, d: 200, r: 26 }, 2, 14, { tono: "mid", pasos: 8, bisel: 0.8, nombre: "carcasa.base", extra: puerto + f.L(k.planOutline({ x: -92, y: -92, w: 184, d: 184, r: 20 }, 16, P, 8), { tone: "faint" }) });

  // Placa principal sobre separadores; radios bajo blindajes, SoC, memoria y etapa PoE.
  for (const [x, y] of [[-74, -74], [74, -74], [-74, 74], [74, 74]]) f.cil("carcasa", x, y, 2.4, 16, 4, { tono: "lo", nombre: "carcasa.separador", pasos: 12 });
  f.losa("placa", { x: -84, y: -84, w: 168, d: 168, r: 14 }, 20, 1.6, { tono: "lo", pasos: 6, nombre: "placa.pcb", extra: f.D([[-74, -74], [74, -74], [-74, 74], [74, 74]].map(([x, y]) => at([x, y, 21.6])), { size: 0.5 }) });
  const blindaje = (pieza, [x0, y0, x1, y1], o = {}) => {
    const ag = []; for (let x = x0 + 4; x < x1 - 2; x += 4) for (let y = y0 + 4; y < y1 - 2; y += 4) ag.push(at([x, y, 25.2]));
    f.caja(pieza, [x0, y0, 21.6], [x1, y1, 25.2], { tono: o.lit ? "hi" : "mid", lit: o.lit, nombre: `${pieza}.blindaje`, bisel: 0.4, monta: "placa", extra: f.D(ag, { size: 0.35, tone: "lo" }) });
  };
  blindaje("radio5", [8, -54, 52, -10], { lit: true });
  blindaje("radio24", [-52, -54, -8, -10]);
  for (const [x, y] of [[56, -50], [56, -14]]) f.cil("radio5", x, y, 1.3, 21.6, 1.4, { tono: "hi", nombre: "radio5.ufl", pasos: 12, monta: "placa" });
  for (const [x, y] of [[-56, -50], [-56, -14]]) f.cil("radio24", x, y, 1.3, 21.6, 1.4, { tono: "hi", nombre: "radio24.ufl", pasos: 12, monta: "placa" });
  chip(f, "soc", [-16, 6, 16, 38], 21.6, 1.6, { tono: "hi", sustrato: 3, nombre: "soc.procesador", monta: "placa" });
  chip(f, "soc", [-40, 10, -24, 22], 21.6, 1, { nombre: "soc.ram", monta: "placa" });
  chip(f, "soc", [-40, 26, -24, 34], 21.6, 1, { nombre: "soc.flash", monta: "placa" });
  chip(f, "poe", [30, 14, 42, 26], 21.6, 1.2, { nombre: "poe.controlador", monta: "placa" });
  f.caja("poe", [48, 10, 21.6], [66, 30, 30], { tono: "mid", nombre: "poe.transformador", r: 1, monta: "placa", extra: f.L(k.lineOnTop([48, 20], [66, 20], 30, P), { tone: "faint" }) });
  for (const [x, y] of [[36, 40], [44, 40], [52, 40]]) f.cil("poe", x, y, 2.6, 21.6, 7, { tono: "mid", nombre: "poe.condensador", pasos: 16, monta: "placa", extra: f.L(k.ring(x, y, 1.4, 28.6, P, 12), { tone: "lo" }) });

  // Antenas en las esquinas, cada una con su cable desde el conector de su radio.
  const ANT = [[60, -68], [60, 62], [-60, -68], [-60, 62]];
  const RUTAS = [
    [[56, -50, 23], [56, -50, 27], [60, -54, 27], [60, -67, 27]],
    [[56, -14, 23], [56, -14, 27], [72, -14, 27], [72, 48, 27], [60, 54, 27], [60, 61, 27]],
    [[-56, -50, 23], [-56, -50, 27], [-60, -54, 27], [-60, -67, 27]],
    [[-56, -14, 23], [-56, -14, 27], [-64, -14, 27], [-64, 48, 27], [-60, 54, 27], [-60, 61, 27]],
  ];
  ANT.forEach(([x, y], i) => {
    f.caja("antenas", [x - 9, y - 1, 22.4], [x + 9, y + 1, 33], { tono: "hi", nombre: "antenas.elemento", extra: f.enCara(f.frente(y + 1), f.rect(x - 7, -31, x + 7, -23.6, 0.4), { tone: "lo" }) });
    f.caja("antenas", [x - 9, y - 4, 21.6], [x + 9, y + 4, 22.4], { tono: "mid", nombre: "antenas.pie" });
    f.cable("antenas", RUTAS[i], 0.7, { nombre: "antenas.coaxial", tono: "mid", libre: [true, false] });
  });

  // Cubierta con su hueco interior (para la auditoría) y aro de LED.
  const cav = f.A.slab({ x: -96, y: -96, w: 192, d: 192, r: 22 }, 14, 24, {}, 8);
  const anillo = f.L(k.ring(0, 0, 14, 40, P, 48), { tone: "lo" }) + f.L(k.ring(0, 0, 11, 40, P, 48), { tone: "faint" }) + `<g class="an-led an-late">${f.D([at([0, 0, 40])], { size: 1.1, tone: "hi", pulse: true })}</g>`;
  f.losa("tapa", { x: -100, y: -100, w: 200, d: 200, r: 26 }, 16, 24, { tono: "mid", pasos: 8, bisel: 1.4, nombre: "tapa.radomo", corte: cav, extra: anillo + f.L(k.planOutline({ x: -88, y: -88, w: 176, d: 176, r: 18 }, 40, P, 8), { tone: "faint" }), dentro: f.L(k.sideSeam({ x: -100, y: -100, w: 200, d: 200, r: 26 }, 20, P, 8), { tone: "faint" }) });

  // Cable PoE: conector RJ45 en el puerto y cable hasta el pasacables de la mesa.
  f.caja("cable", [100, -6.4, 6], [114, 6.4, 13.2], { tono: "hi", nombre: "cable.conector", r: 1 });
  f.caja("cable", [114, -5.4, 6.4], [126, 5.4, 12.8], { tono: "mid", nombre: "cable.funda", r: 2 });
  f.cil("base", 164, 0, 8, 0, 2, { tono: "mid", nombre: "stand.pasacables", pasos: 32, extra: f.S(k.cylinder(164, 0, 4.4, 2, 0.01, P, 28), { tone: "lo" }) });
  f.cable("cable", [[126, 0, 9.6], [150, 0, 9.6], [164, 0, 9.6], [164, 0, 2]], 2.8, { nombre: "cable.utp", tono: "mid" });

  return f.emitir({
    id, fig, titulo: "Punto de acceso Wi-Fi", pista: "Clic para despiezar · flechas para elegir", lectura: "802.11ac · 2 radios · PoE",
    leyenda: ["radio5", "radio24", "soc", "antenas", "poe", "placa", "tapa", "carcasa", "cable"],
    etiqueta: "Punto de acceso de techo apoyado en su soporte: base metálica con el puerto Ethernet, placa principal con las radios de 5 y 2,4 GHz bajo sus blindajes, el procesador, la etapa PoE, cuatro antenas en las esquinas y la cubierta, más el cable PoE que llega del switch.",
    pie: "El punto de acceso es un puente: convierte las tramas 802.11 en tramas Ethernet y no aparece como salto en mtr. Aquí se decide gran parte de la variabilidad del retardo: la radio de 5 GHz comparte el canal con todos los dispositivos del aula, reintenta las tramas que no llegan y retiene las de bajada para los clientes en ahorro de energía. Se alimenta por PoE desde el switch de acceso.",
  });
}

/* ------------------------------------------------------------------ */
/*  Roseta RJ45 de pared                                                */
/* ------------------------------------------------------------------ */
export function roseta({ id = "roseta", fig = "Fig 3" } = {}) {
  const ZC = 100;
  const piezas = {
    keystone: { nombre: "Keystone de la medición", dice: "keystone Cat 6 · aquí entra el latiguillo del adaptador del portátil en la medición cableada", mueve: [0, 0, 0] },
    keystone2: { nombre: "Segunda toma", dice: "toma libre · mismo cable horizontal hasta el patch panel", mueve: [0, 0, 0] },
    placa: { nombre: "Placa frontal", dice: "placa frontal de 86 × 86 mm con dos tomas", mueve: [0, 54, 0], desvanece: 0.8 },
    latiguillo: { nombre: "Latiguillo", dice: "latiguillo Cat 6 con conector RJ45 · une la roseta con el adaptador del portátil", mueve: [0, 96, 12] },
    cable: { nombre: "Cable horizontal", dice: "cable UTP Cat 6 dentro de la pared · llega al patch panel del cuarto de telecomunicaciones", mueve: [0, 0, 0] },
    pared: { nombre: "Pared y caja", dice: "caja de empotrar en la pared", mueve: [0, 0, 0] },
    base: { nombre: "Suelo", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["latiguillo", "placa"];
  const encaje = [];
  for (const x of [-130, 130]) { encaje.push([x, -40, -10], [x, 150, -10], [x, -30, 172]); }
  encaje.push([-43, 62, ZC + 43], [43, 62, ZC - 43], [-16, 216, ZC + 12], [-16, 216, 14]);
  const f = figura({ encaje, piezas, orden, azimut: 64, elevacion: 24 });
  const { k, P, at } = f;
  f.banco({ x: -130, y: -40, w: 260, d: 190, r: 6 }, { grosor: 8, pata: 4, regla: false });

  // Pared con la boca de la caja de empotrar (recortada en la forma para la auditoría).
  const BOCA = { x0: -34, x1: 34, z0: ZC - 34, z1: ZC + 34, prof: 28 };
  const cw = f.frente(0);
  const boca = f.hueco(cw, { s0: BOCA.x0, s1: BOCA.x1, t0: -BOCA.z1, t1: -BOCA.z0, r: 2 }, BOCA.prof, { claseFondo: "an-hueco" });
  const tornillosCaja = f.tornillos(cw, [[0, -(BOCA.z1 - 4)], [0, -(BOCA.z0 + 4)]].map(([s, t]) => [s, t]), 1.6);
  const corte = f.A.box([BOCA.x0, -BOCA.prof, BOCA.z0], [BOCA.x1, 0.5, BOCA.z1]);
  f.caja("pared", [-110, -30, 0], [110, 0, 170], { tono: "mid", nombre: "stand.pared", corte, extra: boca + tornillosCaja });
  f.caja("base", [-110, 0, 0], [110, 8, 12], { tono: "mid", nombre: "stand.zocalo", bisel: 0.5 });

  // Keystones dentro de la caja de empotrar, con su bloque IDC arriba.
  [[-16, "keystone"], [16, "keystone2"]].forEach(([x, p]) => {
    const cf = f.frente(0);
    const idc = []; for (let j = 0; j < 4; j++) for (const y of [-14, -9]) idc.push(k.planOutline({ x: x - 5 + j * 2.6, y, w: 1, d: 3, r: 0.4 }, ZC + 9, P, 2));
    f.caja(p, [x - 7.4, -20, ZC - 9], [x + 7.4, 0, ZC + 9], { tono: p === "keystone" ? "hi" : "mid", lit: p === "keystone", nombre: `${p}.cuerpo`, r: 0.8,
      extra: rj45(f, cf, x - 6.2, ZC - 6, { ancho: 12.4, alto: 10, prof: 10 }) + f.L(idc.join(""), { tone: "lo" }) });
  });
  // Cable horizontal: entra a la caja por el tubo del fondo.
  [-16, 16].forEach((x) => f.cable("cable", [[x, -20, ZC], [x, -28, ZC]], 2.6, { nombre: "cable.utp", tono: "mid" }));

  // Placa frontal con agujeros pasantes y tornillos.
  const cp = f.frente(8);
  const ag = f.agujeros(cp, [{ s0: -23.4, s1: -8.6, t0: -(ZC + 9), t1: -(ZC - 9), r: 0.8 }, { s0: 8.6, s1: 23.4, t0: -(ZC + 9), t1: -(ZC - 9), r: 0.8 }], 8);
  const cortes = [-16, 16].map((x) => f.A.box([x - 7.4, -1, ZC - 9], [x + 7.4, 9, ZC + 9]));
  const plano = { x: -43, y: 0, w: 86, d: 8, r: 0 };
  const placaSvg = f.S(k.slabOf(plano, ZC - 43, 86, P, 2, 0.8), { tone: "mid" }) + f.tornillos(cp, [[0, -(ZC + 36)], [0, -(ZC - 36)]], 2) + f.placa(cp, -26, -(ZC + 28), 52, 10);
  const formaPlaca = f.A.box([-43, 0, ZC - 43], [43, 8, ZC + 43], { name: f.R.nameFor("placa.marco"), cut: cortes });
  f.item("placa", [0, 4, ZC], ag.abre + placaSvg + ag.cierra + ag.paredes, [formaPlaca]);

  // Latiguillo: conector en la toma izquierda, funda y cable hasta el pasacables del suelo.
  f.caja("latiguillo", [-24.4, 8, ZC - 10], [-7.6, 10, ZC + 10], { tono: "mid", nombre: "latiguillo.collar", r: 1.2 });
  f.caja("latiguillo", [-22.6, 10, ZC - 5.4], [-9.4, 22, ZC + 5.4], { tono: "hi", nombre: "latiguillo.conector", r: 0.8 });
  f.caja("latiguillo", [-21.6, 22, ZC - 4.6], [-10.4, 34, ZC + 4.4], { tono: "mid", nombre: "latiguillo.funda", r: 2 });
  f.cil("base", -16, 120, 9, 0, 2, { tono: "mid", nombre: "stand.pasacables", pasos: 32, extra: f.S(k.cylinder(-16, 120, 5, 2, 0.01, P, 28), { tone: "lo" }) });
  f.cable("latiguillo", [[-16, 34, ZC], [-16, 50, ZC], [-16, 74, ZC - 22], [-16, 104, 30], [-16, 120, 14], [-16, 120, 2]], 2.6, { nombre: "latiguillo.cable", tono: "mid", libre: [false, true] });

  return f.emitir({
    id, fig, titulo: "Roseta RJ45 de pared", pista: "Clic para despiezar · flechas para elegir", lectura: "2 tomas Cat 6 · T568B",
    leyenda: ["keystone", "keystone2", "placa", "latiguillo", "cable", "pared"],
    etiqueta: "Roseta de pared con placa frontal de dos tomas, los conectores keystone dentro de la caja de empotrar, el cable horizontal que sube por la pared y un latiguillo conectado que baja hasta un pasacables del suelo.",
    pie: "La roseta es la puerta de la medición cableada de control. El latiguillo une el adaptador del portátil con el keystone; detrás, el cable horizontal recorre la pared hasta el patch panel y de allí al switch de acceso. Medir por aquí elimina el tramo inalámbrico: la diferencia entre ambas sesiones aísla lo que aporta el Wi-Fi al retardo y a su variación.",
  });
}

/* ------------------------------------------------------------------ */
/*  Teléfono de un tercero                                              */
/* ------------------------------------------------------------------ */
export function telefono({ id = "telefono", fig = "Fig 14" } = {}) {
  const PLACA = [0, 0, 26];
  const piezas = {
    wifi: { nombre: "Módulo Wi-Fi", dice: "módulo Wi-Fi y Bluetooth · compite por el mismo canal: cada trama suya ocupa tiempo de aire del aula", mueve: PLACA },
    placa: { nombre: "Placa lógica y SoC", dice: "placa lógica con el procesador y la memoria", mueve: PLACA },
    bateria: { nombre: "Batería", dice: "batería de 4500 mAh", mueve: [0, 0, 14] },
    pantalla: { nombre: "Pantalla", dice: "pantalla · reproduce video; ese tráfico sube la ocupación del canal", mueve: [0, 0, 46] },
    marco: { nombre: "Marco", dice: "marco de aluminio con los botones", mueve: [0, 0, 0] },
    trasera: { nombre: "Tapa trasera", dice: "tapa trasera de vidrio", mueve: [0, 0, 0] },
    base: { nombre: "Mesa", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["pantalla", "placa", "wifi", "bateria"];
  const encaje = [];
  for (const x of [-70, 70]) for (const y of [-110, 110]) encaje.push([x, y, -8], [x, y, 0]);
  encaje.push([-38, -80, 8.5 + 46], [38, 80, 8.5 + 46]);
  const f = figura({ encaje, piezas, orden, azimut: 40, elevacion: 38 });
  const { k, P, at } = f;
  f.banco({ x: -70, y: -110, w: 140, d: 220, r: 6 }, { grosor: 6, pata: 3, regla: false });

  f.losa("trasera", { x: -37.5, y: -80, w: 75, d: 160, r: 9 }, 0, 1, { tono: "lo", pasos: 6, nombre: "trasera.vidrio" });
  f.caja("marco", [-37.5, -80, 1], [-35.5, 80, 7], { tono: "mid", nombre: "marco.izq" });
  const cb = f.lado(37.5);
  f.caja("marco", [35.5, -80, 1], [37.5, 80, 7], { tono: "mid", nombre: "marco.der", extra: f.enCara(cb, f.rect(30, -6, 50, -2.4, 1.2) + f.rect(54, -6, 64, -2.4, 1.2), { tone: "lo" }) });
  f.caja("marco", [-35.5, -80, 1], [35.5, -78, 7], { tono: "mid", nombre: "marco.arriba" });
  f.caja("marco", [-35.5, 78, 1], [35.5, 80, 7], { tono: "mid", nombre: "marco.abajo", extra: f.hueco(f.frente(80), { s0: -4.5, s1: 4.5, t0: -5.4, t1: -2.6, r: 1.4 }, 2) });

  f.caja("bateria", [-31, -26, 1], [31, 62, 5.8], { tono: "mid", nombre: "bateria.celda", r: 2, extra: f.placa(f.arriba(5.8), -20, -10, 40, 22) });
  f.caja("placa", [-33, -76, 1], [33, -30, 1.8], { tono: "lo", nombre: "placa.logica" });
  chip(f, "placa", [-6, -66, 14, -46], 1.8, 1.2, { tono: "hi", nombre: "placa.soc", sustrato: 2.5 });
  chip(f, "wifi", [-28, -66, -12, -52], 1.8, 1.4, { lit: true, tono: "hi", nombre: "wifi.modulo", bisel: 0.3, monta: "placa" });
  for (const [x, y] of [[22, -66], [28, -66]]) f.cil("placa", x, y, 3.2, 1.8, 3.6, { tono: "mid", nombre: "placa.camara", pasos: 20, extra: f.L(k.ring(x, y, 1.8, 6, P, 16), { tone: "lo" }) });
  f.caja("placa", [-28, -46, 1.8], [-12, -36, 3], { tono: "mid", nombre: "placa.conector" });

  const cs = f.arriba(8.5);
  const pant = `<g transform="${cs.m}"><path class="an-pantalla" d="${f.rect(-33.5, -76, 33.5, 76, 6)}"/>` +
    `<text class="an-texto" x="-28" y="-68" font-size="4">12:41</text><text class="an-texto" x="6" y="-68" font-size="4">Wi-Fi</text>` +
    `<path class="an-video" d="${f.rect(-30, -40, 30, -6, 1.5)}"/><path class="an-barra" d="M-28 4H28"/><path class="an-avance" d="M-28 4H6"/></g>`;
  f.losa("pantalla", { x: -37.5, y: -80, w: 75, d: 160, r: 9 }, 7, 1.5, { tono: "mid", pasos: 6, bisel: 0.5, nombre: "pantalla.vidrio", extra: pant + f.L(k.planOutline({ x: -33.5, y: -76, w: 67, d: 152, r: 6 }, 8.5, P, 6), { tone: "lo" }) });

  return f.emitir({
    id, fig, titulo: "Dispositivo de un tercero", pista: "Clic para despiezar · flechas para elegir", lectura: "teléfono · Wi-Fi 802.11ac",
    leyenda: ["wifi", "placa", "bateria", "pantalla", "marco", "trasera"],
    etiqueta: "Teléfono inteligente sobre una mesa, con la pantalla, la placa lógica con el módulo Wi-Fi y el procesador, la batería, el marco y la tapa trasera.",
    pie: "Los teléfonos de otros estudiantes comparten el canal del punto de acceso. Su tráfico no se mide ni se captura: la captura se hace sin modo promiscuo y filtrada por la dirección del propio portátil. Aun así influye en los resultados, porque cada trama ajena ocupa tiempo de aire; por eso las sesiones se repiten en franjas de baja y de alta ocupación.",
  });
}

/* ------------------------------------------------------------------ */
/*  PC de torre (servidor iperf3 del laboratorio o estación de gestión)  */
/* ------------------------------------------------------------------ */
export function torre({ id = "torre", fig = "Fig 9", gestion = false } = {}) {
  const LADO = [70, -160, 0];
  const piezas = {
    nic: { nombre: "Tarjeta de red PCIe", dice: gestion ? "NIC en la VLAN de gestión · recibe SNMP e IPFIX; fuera del alcance de la medición" : "NIC 1 GbE · aquí escucha iperf3 -s, el destino interno de referencia", mueve: [46, 0, 0] },
    cpu: { nombre: "Disipador de torre", dice: "disipador de torre con ventilador de 120 mm sobre la CPU", mueve: [44, 0, 0] },
    memoria: { nombre: "Memoria", dice: "4 módulos DDR4", mueve: [30, 0, 0] },
    placa: { nombre: "Placa base", dice: "placa base ATX", mueve: [0, 0, 0] },
    fuente: { nombre: "Fuente", dice: "fuente ATX de 550 W", mueve: [0, 0, 0] },
    discos: { nombre: "Unidades", dice: "jaula con dos unidades", mueve: [0, 0, 0] },
    lado: { nombre: "Panel lateral", dice: "panel lateral de acero", mueve: LADO },
    caja: { nombre: "Caja", dice: "caja de torre con frente ventilado", mueve: [0, 0, 0] },
    base: { nombre: "Suelo", dice: "", mueve: [0, 0, 0] },
  };
  const orden = ["lado", "cpu", "nic", "memoria"];
  const encaje = [];
  for (const x of [-80, 150]) for (const y of [-280, 50]) encaje.push([x, y, -8], [x, y, 0], [x, y, 228]);
  const f = figura({ encaje, piezas, orden, azimut: 36, elevacion: 26 });
  const { k, P, at } = f;
  f.banco({ x: -80, y: -280, w: 230, d: 330, r: 6 }, { grosor: 6, pata: 3, regla: false });

  for (const [x, y] of [[-40, -120], [40, -120], [-40, -10], [40, -10]]) f.cil("caja", x, y, 5, 0, 6, { tono: "lo", nombre: "caja.pata", pasos: 20 });
  f.caja("caja", [-50, -130, 6], [50, 0, 8], { tono: "lo", nombre: "caja.piso" });
  f.caja("caja", [-50, -130, 8], [-48, 0, 224], { tono: "mid", nombre: "caja.lado-izq" });
  f.caja("caja", [-48, -130, 8], [48, -128, 224], { tono: "mid", nombre: "caja.trasera" });
  f.caja("caja", [-50, -130, 224], [50, 0, 226], { tono: "mid", nombre: "caja.techo", bisel: 0.4, extra: f.ranuras(f.arriba(226), -36, 36, -100, -40, 4, 1.6) });
  const cf = f.frente(0);
  let fr = f.ranuras(cf, -40, 40, -200, -60, 4, 1.6);
  fr += f.enCara(cf, k.pathOf(k.circleRing(0, -214, 4, 20), true), { tone: "lo" }) + f.leds(cf, [[12, -214]], { tono: "hi", latido: true });
  fr += f.hueco(cf, { s0: -30, s1: -24, t0: -216, t1: -212, r: 0.4 }, 3) + f.hueco(cf, { s0: -20, s1: -14, t0: -216, t1: -212, r: 0.4 }, 3);
  f.caja("caja", [-48, -4, 8], [48, 0, 224], { tono: "mid", nombre: "caja.frente", bisel: 0.5, extra: fr });

  // Placa base sobre la pared izquierda (plano y-z) y lo que sale de ella hacia +x.
  f.caja("placa", [-48, -124, 60], [-47, -6, 212], { tono: "lo", nombre: "placa.atx" });
  f.caja("placa", [-47, -96, 100], [-44, -60, 104], { tono: "lo", nombre: "placa.ranura" });
  f.caja("cpu", [-47, -82, 158], [-44, -50, 190], { tono: "mid", nombre: "cpu.base" });
  const aletas = []; for (let z = 150; z <= 200; z += 3) aletas.push(k.pathOf([at([-44, -50, z]), at([16, -50, z]), at([16, -82, z])]));
  f.caja("cpu", [-44, -82, 148], [16, -50, 202], { tono: "mid", nombre: "cpu.aletas", extra: f.L(aletas.join(""), { tone: "lo" }) });
  ventiladorY(f, "cpu", -14, -50, 175, { lado: 54, prof: 8, nombre: "cpu.ventilador" });
  const ram = [];
  for (const y of [-36, -32, -28, -24]) {
    ram.push(f.S(k.slabOf({ x: -47, y: y - 0.8, w: 3, d: 2.4, r: 0 }, 140, 66, P, 2), { tone: "lo" }));
    ram.push(f.S(k.slabOf({ x: -44, y, w: 16, d: 0.8, r: 0 }, 141, 64, P, 2), { tone: "hi", crease: "lo" }));
  }
  f.item("memoria", [-36, -30, 173], ram.join(""), [f.A.box([-47, -36.8, 140], [-28, -23.2, 206], { name: f.R.nameFor("memoria.modulos") })]);
  // Tarjeta de red horizontal con soporte trasero.
  f.caja("nic", [-44, -126, 100], [10, -62, 101], { tono: "lo", nombre: "nic.tarjeta" });
  chip(f, "nic", [-24, -104, -8, -88], 101, 1.4, { lit: true, tono: "hi", nombre: "nic.controlador", sustrato: 2.4, bisel: 0.3 });
  f.caja("nic", [-44, -128, 92], [12, -126, 118], { tono: "mid", nombre: "nic.soporte" });
  f.caja("nic", [-6, -124, 101], [8, -112, 112], { tono: "mid", nombre: "nic.jack" });
  // Fuente abajo atrás y jaula de unidades abajo adelante.
  f.caja("fuente", [-48, -128, 8], [26, -60, 50], { tono: "mid", nombre: "fuente.caja", bisel: 0.5, extra: f.placa(f.lado(26), 74, -44, 50, 26) });
  f.caja("discos", [-20, -44, 8], [46, -4, 46], { tono: "mid", nombre: "discos.jaula", extra: f.enCara(f.lado(46), f.rect(6, -42, 38, -30, 1) + f.rect(6, -26, 38, -14, 1), { tone: "lo" }) });
  // Panel lateral (+x), que sale hacia atrás.
  f.caja("lado", [48, -130, 8], [50, 0, 224], { tono: "mid", nombre: "lado.panel", bisel: 0.4, extra: f.ranuras(f.lado(50), 20, 60, -200, -150, 4, 1.6) });

  return f.emitir({
    id, fig, titulo: gestion ? "Estación de gestión" : "Servidor iperf3 del laboratorio", pista: "Clic para despiezar · flechas para elegir", lectura: gestion ? "plano de gestión · fuera del alcance" : "destino interno · 1 GbE",
    leyenda: ["nic", "cpu", "memoria", "placa", "fuente", "discos", "lado", "caja"],
    etiqueta: `PC de torre sin el panel lateral derecho: placa base, disipador de torre con ventilador, memoria, tarjeta de red PCIe, fuente y jaula de unidades.`,
    pie: gestion
      ? "La estación de gestión recoge contadores SNMP y flujos IPFIX de la infraestructura. El estudiante no tiene acceso a ella: la caracterización se hace desde el extremo, y estos datos solo servirían para contrastar en un trabajo con permisos de administración."
      : "El servidor del laboratorio es el destino interno: con permiso del responsable del laboratorio ejecuta iperf3 -s dentro del campus. Comparar contra él y contra el servidor público separa lo que aporta la red del campus de lo que aporta el tramo del proveedor.",
  });
}
