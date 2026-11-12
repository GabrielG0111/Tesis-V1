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

Para ver la anatomía de un equipo:

1. Haga clic sobre el equipo. El panel derecho muestra su función en el proyecto, su dirección IP, su capa, sus interfaces y si aparece como salto en mtr.
2. Pulse **Ver anatomía**. Los equipos montados en rack salen del bastidor y se separan en sus partes, cada una con una etiqueta numerada que se describe en el panel. Por ejemplo, el portátil muestra su tarjeta Wi-Fi M.2 con antenas y el switch de acceso muestra su ASIC de conmutación.
3. Pulse `Esc` para cerrar la vista.

Los modelos están hechos por código en `js/modelos.js`, con geometrías de Three.js. No están a escala: los equipos se agrandan para que se distingan.

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

Parámetros disponibles: `prueba`, `franja`, `punto`, `medio`, `destino`, `psm`, `icmp`, `quic`, `vel`, `cam`, `equipo`, `anatomia` y `pestana`.

## Archivos

```
index.html        estructura de la página
css/estilos.css   estilos
js/modelos.js     modelos 3D de los equipos, construidos por partes (anatomía)
js/escena.js      zonas, ubicación de equipos, cableado, selección y vista anatómica
js/red.js         metadatos de cada equipo y modelo de retardo, pérdida y capacidad
js/pruebas.js     escenarios animados y resultados con formato de cada herramienta
js/ui.js          controles, panel de información y pestañas
lib/              Three.js r147 y OrbitControls
```
