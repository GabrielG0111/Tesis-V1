// Construye las figuras de anatomía de los equipos con el kit de la skill anatomy.
//   node build.mjs                    escribe ../js/anatomia-datos.js y ../css/anatomia.css
//   node build.mjs --solo switch      solo esa figura
//   node build.mjs --paginas DIR      además, una página independiente por figura (para revisar)
//   node build.mjs --claro            páginas en tema claro
//   node build.mjs --audit            corre la auditoría geométrica de la skill
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { k } from "./base.mjs";
import { switchAcceso } from "./equipos/rack.mjs";
import { switchNucleo, cortafuegos, servidor, patchPanel, enrutador } from "./equipos/rack2.mjs";
import { portatil, puntoAcceso, roseta, telefono, torre } from "./equipos/cliente.mjs";

const AQUI = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const valor = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const solo = valor("--solo");
const paginas = valor("--paginas");
const tema = args.includes("--claro") ? "light" : "dark";

// Figura por identificador y equipo del simulador que la usa.
const FIGURAS = {
  portatil: () => portatil({ id: "portatil", fig: "Fig 1" }),
  ap: () => puntoAcceso({ id: "ap", fig: "Fig 2" }),
  roseta: () => roseta({ id: "roseta", fig: "Fig 3" }),
  patch: () => patchPanel({ id: "patch", fig: "Fig 4" }),
  switch: () => switchAcceso({ id: "switch", puertos: 24, poe: true, fig: "Fig 5" }),
  nucleo: () => switchNucleo({ id: "nucleo", fig: "Fig 6" }),
  dns: () => servidor({ id: "dns", U: 1, fig: "Fig 7" }),
  switchlab: () => switchAcceso({ id: "switchlab", puertos: 16, poe: false, fig: "Fig 8" }),
  cortafuegos: () => cortafuegos({ id: "cortafuegos", fig: "Fig 11" }),
  router: () => enrutador({ id: "router", fig: "Fig 12" }),
  srvpub: () => servidor({ id: "srvpub", U: 2, fig: "Fig 13", publico: true }),
  labpc: () => torre({ id: "labpc", fig: "Fig 9" }),
  gestion: () => torre({ id: "gestion", fig: "Fig 10", gestion: true }),
  telefono: () => telefono({ id: "telefono", fig: "Fig 14" }),
};
export const EQUIPOS = { portatil: "portatil", ap: "ap", roseta: "roseta", tel1: "telefono", tel2: "telefono", labpc: "labpc", gestion: "gestion", patch: "patch", swacc: "switch", core: "nucleo", dns: "dns", swlab: "switchlab", borde: "cortafuegos", pe: "router", ispcore: "router", transito: "router", srv: "srvpub" };

const CACHE = join(AQUI, ".cache");
mkdirSync(CACHE, { recursive: true });
const unir = args.includes("--unir");
const hechas = [];
for (const [id, crear] of Object.entries(FIGURAS)) {
  if (solo && solo !== id) continue;
  if (unir) { hechas.push(JSON.parse(readFileSync(join(CACHE, `${id}.json`), "utf8"))); continue; }
  const t = Date.now();
  const fig = crear();
  hechas.push(fig);
  writeFileSync(join(CACHE, `${id}.json`), JSON.stringify({ id: fig.id, titulo: fig.titulo, html: fig.html, datos: fig.datos }));
  console.log(`${id}: ${fig.items} elementos · ${((Date.now() - t) / 1000).toFixed(1)} s`);
  if (args.includes("--audit")) fig.auditar();
}

export const CSS = `
.an-hueco{fill:var(--anatomy-shade-0)}
.an-nada{fill:none}
.an-cursor{fill:var(--anatomy-hi);animation:an-parpadeo 1.06s steps(1,end) infinite}
.an-video{fill:var(--anatomy-shade-2);stroke:var(--anatomy-lo);stroke-width:.6px;vector-effect:non-scaling-stroke}
.an-barra,.an-avance{fill:none;stroke-width:1.4px;stroke-linecap:round;vector-effect:non-scaling-stroke}
.an-barra{stroke:var(--anatomy-lo)}.an-avance{stroke:var(--anatomy-hi)}
@keyframes an-parpadeo{50%{opacity:0}}
@media (prefers-reduced-motion:reduce){.an-cursor{animation:none}}
.an-hueco-hondo{fill:var(--anatomy-page)}
.an-placa{fill:var(--anatomy-top)}
.an-pantalla{fill:var(--anatomy-shade-0)}
.an-texto{fill:var(--anatomy-hi);font-family:var(--anatomy-mono)}
.an-escenario{position:relative;cursor:pointer;touch-action:pan-y;outline:none}
.an-escenario:focus-visible{outline:1px dashed var(--anatomy-faint);outline-offset:4px}
.an-escenario[data-focus] .it:not([data-on]):not([data-piece="base"]){--anatomy-hi:var(--anatomy-mid);--anatomy-mid:var(--anatomy-lo)}
.an-escenario[data-focus] .it[data-piece="base"]{--anatomy-mid:var(--anatomy-lo)}
.it[data-on]{--anatomy-hi:var(--anatomy-lit);--anatomy-mid:var(--anatomy-hi)}
.it[data-on] .iso-top,.it[data-on] .tb-shine{fill:var(--anatomy-lit-top)}
.it[data-on] .iso-shade,.it[data-on] .tb-body{fill:var(--anatomy-lit-shade)}
.an-controles{position:absolute;left:20px;bottom:14px;display:flex;align-items:center;gap:14px}
.an-despiezar{display:inline-flex;align-items:center;gap:8px;padding:5px 12px 5px 9px;border-radius:999px;border:1px solid var(--anatomy-faint);background:var(--anatomy-paper);color:var(--anatomy-strong);font:600 10.5px/1 var(--anatomy-mono);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;box-shadow:var(--anatomy-lift)}
.an-despiezar:hover{border-color:var(--anatomy-lo)}
.an-lampara{width:7px;height:7px;border-radius:50%;background:var(--anatomy-lo);transition:background .3s var(--anatomy-ease)}
.an-despiezar[data-on] .an-lampara{background:var(--anatomy-lit)}
.an-pista{color:var(--anatomy-muted);font:10.5px/1 var(--anatomy-mono);letter-spacing:.1em;text-transform:uppercase}
.an-partes{display:flex;flex-wrap:wrap;gap:6px}
.an-parte{display:inline-flex;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;border:1px solid var(--anatomy-faint);background:transparent;color:var(--anatomy-text);font:12px/1.2 ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.an-parte:hover{border-color:var(--anatomy-lo);color:var(--anatomy-strong)}
.an-parte[data-on]{border-color:var(--anatomy-mid);color:var(--anatomy-strong);background:var(--anatomy-face)}
.an-num{font:10.5px/1 var(--anatomy-mono);color:var(--anatomy-muted)}
.an-fig .iso-plate-corner[data-corner="readout"]{white-space:normal;max-width:54%;text-align:right;line-height:1.4}
.an-pista{transition:opacity .2s}
.an-escenario[data-focus] ~ .an-controles .an-pista{opacity:0}
@media (max-width:560px){.an-controles{left:12px;bottom:12px}.an-pista{display:none}}
`;

const salidaJs = join(AQUI, "..", "js", "anatomia-datos.js");
const salidaCss = join(AQUI, "..", "css", "anatomia.css");
if (!solo) {
  const datos = { equipos: EQUIPOS, figuras: Object.fromEntries(hechas.map((f) => [f.id, { titulo: f.titulo, html: f.html, datos: f.datos }])) };
  writeFileSync(salidaJs, `/* Generado por anatomia/build.mjs con el kit de la skill anatomy. No editar a mano. */\nwindow.ANATOMIA = ${JSON.stringify(datos)};\n`);
  writeFileSync(salidaCss, `/* Generado por anatomia/build.mjs: estilos del kit anatomy (MIT) y de las figuras. */\n${k.ISO_CSS}\n${CSS}`);
  console.log(`escrito js/anatomia-datos.js (${(readFileSync(salidaJs).length / 1024).toFixed(0)} KB) y css/anatomia.css`);
}

if (paginas) {
  mkdirSync(paginas, { recursive: true });
  const vivo = readFileSync(join(AQUI, "..", "js", "anatomia.js"), "utf8");
  for (const f of hechas) {
    const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${f.titulo}</title><style>${k.ISO_CSS}${CSS}*{box-sizing:border-box}body{margin:0;background:var(--anatomy-page);color:var(--anatomy-text);font:14px/1.6 ui-sans-serif,system-ui,sans-serif}.iso-page{width:min(900px,100% - 32px);margin:48px auto 72px}</style></head><body class="iso" data-theme="${tema}"><main class="iso-page">${f.html}</main><script>${vivo}</script><script>Anatomia.montar(document.querySelector(".an-fig"), ${JSON.stringify(f.datos)});</script></body></html>`;
    writeFileSync(join(paginas, `${f.id}${tema === "light" ? "-claro" : ""}.html`), pagina);
  }
  console.log(`páginas en ${paginas}`);
}
