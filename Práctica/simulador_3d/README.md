# Simulador 3D de la caracterización extremo a extremo

Simulador interactivo que muestra cómo se conectan los equipos que intervienen en el proyecto y cómo recorren la red los paquetes de cada prueba. Cubre la medición activa con iperf3, mtr, fping, tracepath, dig y curl, y la disección pasiva con Wireshark y tcpdump, todo desde el equipo del estudiante.

## Cómo abrirlo

Abra `index.html` con doble clic en Firefox, Chrome o Edge. No necesita servidor ni conexión a internet, porque Three.js r147 viene incluido en `lib/` (licencia MIT, `lib/LICENSE-three.txt`).

Si el navegador bloquea los archivos locales, sírvalo desde esta carpeta:

```
python3 -m http.server 8000
```

y luego abra `http://localhost:8000`.

## Qué contiene

| Zona | Equipos |
|---|---|
| Aula (segmento de acceso) | Portátil del estudiante, punto de acceso Wi-Fi, roseta RJ45 para el cable de control, dispositivos de terceros, tabique que atenúa la señal en el punto P3 |
| Cuarto de telecomunicaciones | Rack con patch panel y switch de acceso PoE (capa 2) |
| Centro de datos del campus | Switch de núcleo L3 (puerta de enlace), resolutor DNS y estación de gestión (plano de gestión, fuera del alcance) |
| Laboratorio de la carrera | Switch del laboratorio y servidor iperf3 interno |
| Borde de la red | Cortafuegos o enrutador de borde con NAT |
| Internet | Enrutador del proveedor (PE), red troncal y red de tránsito |
| Centro de datos externo | Servidor público de referencia (iperf3 y web) |

El color de los cables indica el medio:

- azul: UTP Cat 6
- naranja: fibra óptica
- violeta: enlace del proveedor
- verde discontinuo: Wi-Fi
- rojo discontinuo: gestión

## Anatomía de los equipos

Las figuras de anatomía se hicieron con la skill **anatomy** (kit isométrico en SVG, licencia MIT, copiado en `anatomia/kit/`). Cada equipo es una figura con muchas piezas pequeñas y sombreado por caras. Al despiezarlo, sus conjuntos se separan con resortes escalonados y se reordenan por profundidad en cada cuadro.

1. Haga clic sobre un equipo de la escena. El panel derecho muestra su función, su dirección IP, su capa y si aparece como salto en mtr.
2. Pulse **Ver anatomía**. Se abre la figura del equipo en una tarjeta sobre la escena. Para recorrerla:
   - Un clic o la barra espaciadora despiezan el equipo y lo vuelven a montar.
   - El puntero, las flechas o los botones numerados de la leyenda eligen una pieza; la lectura de la esquina explica qué papel cumple en la medición.
   - Si nadie interactúa, la figura hace sola un recorrido por las piezas.
3. Pulse `Esc` o **Cerrar** para volver a la escena.

En el portátil y en el punto de acceso, la lectura de la tarjeta Wi-Fi y de la radio de 5 GHz se calcula con el mismo modelo de la sesión: potencia recibida, MCS, ocupación del canal y reintentos.

El botón **Despiece 3D** mantiene la vista anterior, que separa las piezas del modelo dentro de la propia escena.

| Figura | Equipo | Qué resalta |
|---|---|---|
| 1 | Portátil del estudiante | Tarjeta Wi-Fi M.2, cables de antena y adaptador USB-C a RJ45 |
| 2 | Punto de acceso | Radio de 5 GHz bajo su blindaje, antenas y etapa PoE |
| 3 | Roseta de pared | Keystone de la medición cableada y latiguillo |
| 4 | Patch panel | Keystones con bloque IDC y cableado horizontal |
| 5 y 8 | Switch de acceso y del laboratorio | ASIC de conmutación de capa 2 |
| 6 | Switch de núcleo | ASIC de capa 3 (puerta de enlace) y módulo de CPU |
| 7 y 13 | Servidores DNS y público | Tarjeta de red sobre elevador PCIe |
| 9 y 10 | PC del laboratorio y estación de gestión | Tarjeta de red PCIe |
| 11 | Cortafuegos de borde | Procesador de red (NAT y filtrado de ICMP) |
| 12 | Enrutador del proveedor | Procesador de rutas frente a tarjetas de línea |
| 14 | Teléfono de un tercero | Módulo Wi-Fi que comparte el canal |

Las figuras se generan con Node.js (20.10 o superior) desde `anatomia/`:

```
node build.mjs                 # todas las figuras: escribe js/anatomia-datos.js y css/anatomia.css
node build.mjs --solo switch   # una sola figura
node build.mjs --audit         # auditoría geométrica de la skill
```

La auditoría comprueba, en reposo, despiezado y en cada cuadro de la animación, cinco cosas:

- que ningún cable ni pieza atraviese a otra
- que cada extremo de cable termine sobre un conector
- que ninguna pieza flote sin apoyo
- que nada quede dibujado delante de lo que lo tapa
- que ninguna línea quede suelta

Las 14 figuras la pasan. Los equipos no están a escala entre sí.

## Escenarios de prueba

| Escenario | Qué muestra |
|---|---|
| mtr | Sondas ICMP con TTL creciente. Muestra el retardo y la pérdida por salto, los equipos de capa 2 que mtr no ve y la «pérdida» falsa que causa un enrutador cuando limita sus respuestas ICMP. |
| iperf3 TCP | Los tres pasos de la RFC 6349: MTU, RTT base y cuello de botella, y flujo TCP. Calcula el TCP Transfer Time Ratio, la eficiencia TCP y el retardo por búfer, e indica qué es medible desde el extremo y qué solo puede estimarse. |
| iperf3 UDP + fping | 1000 sondas en un minuto. Calcula la IPDV de la Y.1541 (cuantil 1−10⁻³ menos el mínimo) y la compara con el jitter suavizado de iperf3 (RFC 3550). |
| tracepath | La MTU de la ruta. Con la opción «El cortafuegos de borde descarta ICMP», reproduce el agujero negro de PMTUD y su solución con PLPMTUD. |
| dig + curl | Las fases DNS, TCP, TLS, primer byte y transferencia, con las variables de curl. Con la opción HTTP/3, muestra QUIC. |
| Captura | DHCP, DNS, TCP y TLS del propio equipo, capturados sin modo promiscuo y con el filtro `host 10.20.34.57`. El tráfico de terceros comparte el medio, pero no entra en la captura. |

Las condiciones de cada sesión se eligen en el panel izquierdo:

- la franja horaria
- el punto de asociación (P1, P2 o P3)
- el medio de acceso: Wi-Fi o cable de control
- el destino: interno o público
- el ahorro de energía de la interfaz

La pestaña **Contraste ITU-T Y.1541** acumula las sesiones ejecutadas y las evalúa por clase de forma conservadora:

- **IPTD:** un RTT por debajo del umbral garantiza que se cumple; uno por encima es «no concluyente».
- **IPDV e IPLR:** se evalúan solo con n ≥ 1000.

## Importante

Los valores son **sintéticos**. Los genera `js/red.js` con distribuciones que reproducen el comportamiento esperado: cola larga en el Wi-Fi, congestión en la franja alta y limitación de ICMP en el proveedor. No son mediciones de la institución. Las direcciones IP públicas pertenecen a los rangos reservados para documentación (RFC 5737).

El simulador sirve para:

- explicar el diseño del protocolo de medición
- ensayar la lectura de los resultados

Los datos de la tesis provienen de la campaña real.

## Parámetros en la URL (opcional)

Los parámetros de la URL permiten abrir directamente una situación. Por ejemplo:

```
index.html?prueba=udp&franja=alta&punto=lejos&pestana=y1541
index.html?equipo=swacc&anatomia=1
index.html?prueba=mtu&icmp=1&vel=2
```

Parámetros disponibles: `prueba`, `franja`, `punto`, `medio`, `destino`, `psm`, `icmp`, `quic`, `vel`, `cam`, `equipo`, `anatomia` (`1` abre la figura, `3d` el despiece en la escena) y `pestana`.

## Archivos

```
index.html        estructura de la página
css/estilos.css   estilos
js/modelos.js     modelos 3D de los equipos en la escena, construidos por partes
js/escena.js      zonas, ubicación de equipos, cableado, selección y vista anatómica
js/red.js         metadatos de cada equipo y modelo de retardo, pérdida y capacidad
js/pruebas.js     escenarios animados y resultados con formato de cada herramienta
js/ui.js          controles, panel de información, pestañas y capa de anatomía
js/anatomia.js    despiece, selección y lectura en vivo de las figuras de anatomía
js/anatomia-datos.js  figuras generadas (no editar a mano)
css/anatomia.css  estilos del kit anatomy y de las figuras (generado)
anatomia/         fuente de las figuras: base.mjs, equipos/*.mjs, build.mjs y el kit de la skill
lib/              Three.js r147 y OrbitControls
```
