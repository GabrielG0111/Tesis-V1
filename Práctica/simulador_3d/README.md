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
| mtr | Sondas ICMP con TTL creciente: retardo y pérdida por salto, los equipos de capa 2 que mtr no ve, la «pérdida» falsa de un enrutador que limita sus respuestas ICMP y la verificación de la simetría de la ruta por el TTL de las respuestas. |
| iperf3 TCP | Los tres pasos de la RFC 6349 (MTU, RTT base y cuello de botella, flujo TCP de 10 s). Registra la ventana de recepción, los 2 s de arranque descartados (`-O 2`), la salida JSON (`-J`), el volumen inyectado y el goodput frente a la tasa nominal 802.11. Indica qué es medible desde el extremo y qué solo puede estimarse. |
| iperf3 UDP + fping | 1000 sondas en un minuto con los parámetros de Y.1540 (IPTD, IPDV como cuantil 1−10⁻³ menos el mínimo, IPLR), más el jitter de iperf3 (RFC 3550), la pérdida y los datagramas fuera de orden. |
| tracepath | La MTU de la ruta y su verificación con `ping -M do` (bit de no fragmentación). Con la opción «El cortafuegos de borde descarta ICMP», reproduce el agujero negro de PMTUD y su solución con PLPMTUD. |
| dig + curl | Las fases DNS, TCP, TLS, primer byte y transferencia, con las variables de curl, contra un servicio institucional o externo. Con la opción HTTP/3, muestra QUIC. |
| Captura | DHCP, DNS, TCP, TLS y la sesión iperf3 del propio equipo, capturados sin modo promiscuo y con el filtro `host 10.20.34.57`. Añade la información experta de tshark (retransmisiones, retransmisiones rápidas, segmentos fuera de orden, ventana llena, ACK duplicados) y el gráfico de bytes en vuelo, que indica si la sesión la limita la ventana de congestión, la de recepción o la capacidad. El tráfico de terceros comparte el medio, pero no entra en la captura. |

Las condiciones de cada sesión se eligen en el panel izquierdo:

- la franja horaria
- el punto de asociación (P1, P2 o P3)
- el medio de acceso: Wi-Fi o cable de control
- el destino: interno o público
- el ahorro de energía de la interfaz

La pestaña **Contraste ITU-T Y.1541** acumula las sesiones ejecutadas y las evalúa por clase de forma conservadora:

- **IPTD:** un RTT por debajo del umbral garantiza que se cumple; uno por encima es «no concluyente».
- **IPDV e IPLR:** se evalúan solo con n ≥ 1000.

## Campaña muestral y análisis

El botón **Ejecutar campaña** del panel izquierdo ejecuta el diseño muestral completo sin animación:

- 3 puntos de asociación × 2 franjas × 2 destinos con Wi-Fi, más el cable de control en la roseta.
- De 3 a 10 repeticiones por estrato, una por día, con sesiones espaciadas 10 minutos.
- Cada sesión registra sus variables de contexto (RSSI, ruido, SNR, canal y ancho de canal, MCS, tasa nominal, reintentos, ocupación del canal, ahorro de energía, MTU y volumen inyectado) y todas sus medidas.

Se descartan las sesiones que cumplen alguno de estos criterios de validez:

- ahorro de energía activo
- señal apartada más de 6 dB de la habitual del punto
- iperf3 que no completa los 10 s
- valores atípicos dentro del estrato (regla de Tukey, 3 × RIC)

Las pestañas que llena la campaña son:

| Pestaña | Contenido |
|---|---|
| Línea base | Mediana, rango intercuartílico, percentil 95 y coeficiente de variación por punto, franja y destino; gráfico de goodput con su dispersión; contraste por estrato con Y.1541; aporte de cada segmento (acceso inalámbrico, campus, salida a Internet) como parámetros de entrada para el trabajo complementario de modelado. |
| Correlación | ρ de Spearman entre los indicadores de capa física y de enlace y el desempeño (goodput, RTT, IPDV, IPLR, carga web), con su umbral de significación aproximado, y el diagrama de dispersión RSSI–goodput. |
| Hallazgos | Matriz de hallazgos clasificada por criticidad, con lugar y franja, impacto sobre el usuario, evidencia y recomendación técnica. |
| Protocolo y datos | El protocolo de medición documentado (plano de observación, diseño muestral, comandos, criterios de descarte, normas, ética, carga sobre el medio y cronograma) y la descarga del conjunto de datos y de la línea base en CSV. |

## Correspondencia con la propuesta del Tema 1

| Punto de la propuesta | Dónde se cumple en el simulador |
|---|---|
| Objetivo 1: diseñar el protocolo de medición | Pestaña Protocolo y datos; campaña muestral con puntos, franjas, destinos, repeticiones y criterios de descarte |
| Objetivo 2: goodput RFC 6349, RTT, IPDV, IPLR y MTU | Escenarios iperf3 TCP, iperf3 UDP + fping, mtr y tracepath |
| Objetivo 3: disección DNS, TCP, TLS y transferencia, retransmisiones, reordenamiento y ventana de congestión | Escenarios dig + curl y Captura (información experta de tshark y bytes en vuelo) |
| Objetivo 4: correlación con RSSI, SNR, MCS y reintentos | Pestañas Acceso inalámbrico y Correlación |
| Objetivo 5: contraste con Y.1541 y tasas nominales 802.11, matriz de hallazgos y recomendaciones | Pestañas Contraste ITU-T Y.1541, Línea base y Hallazgos; goodput frente a la tasa nominal en iperf3 TCP |
| Línea base por punto y franja con tendencia central y dispersión, tabular y gráfica | Pestaña Línea base |
| Conjunto de datos tabular con condiciones y validez de cada sesión | Descarga CSV en Protocolo y datos |
| Destinos institucionales e internos para acotar la ruta externa | Destino interno (laboratorio), resolutor DNS institucional y aporte por segmento |
| Inyección dimensionada, sesiones acotadas, espaciadas y con volumen registrado | Volumen por sesión y por campaña; espaciado de 10 min |
| Captura restringida a las interfaces propias | tcpdump `-p` con filtro por la dirección propia; el tráfico de terceros queda fuera |
| Exclusión del plano de gestión y del diagnóstico del equipamiento activo | Estación de gestión marcada fuera del alcance; las figuras de anatomía de la infraestructura se declaran ilustrativas |
| Herramientas: iperf3, ping, fping, mtr, tracepath, dig, curl, Wireshark, tshark, tcpdump, iw, wavemon, netsh wlan, Python o LibreOffice | Comandos de cada escenario y del protocolo |
| Marcos: Y.1540, Y.1541, RFC 6349, RFC 2544, IEEE 802.11 | Escenarios y pestaña Protocolo y datos |
| Parámetros de entrada para el tema de modelado | Aporte de cada segmento en Línea base y CSV |

## Importante

Los valores son **sintéticos**. Los genera `js/red.js` con distribuciones que reproducen el comportamiento esperado: cola larga en el Wi-Fi, congestión en la franja alta y limitación de ICMP en el proveedor. No son mediciones de la institución. Las direcciones IP públicas pertenecen a los rangos reservados para documentación (RFC 5737).

El simulador sirve para:

- explicar el diseño del protocolo de medición
- ensayar la lectura de los resultados y el análisis (línea base, correlación y hallazgos)

Los datos de la tesis provienen de la campaña real.

## Parámetros en la URL (opcional)

Los parámetros de la URL permiten abrir directamente una situación. Por ejemplo:

```
index.html?prueba=udp&franja=alta&punto=lejos&pestana=y1541
index.html?equipo=swacc&anatomia=1
index.html?prueba=mtu&icmp=1&vel=2
index.html?campana=1&repeticiones=10&pestana=hall
```

Parámetros disponibles: `prueba`, `franja`, `punto`, `medio`, `destino`, `psm`, `icmp`, `quic`, `vel`, `cam`, `equipo`, `anatomia` (`1` abre la figura, `3d` el despiece en la escena), `campana` (`1` ejecuta la campaña al abrir), `repeticiones` y `pestana` (`res`, `wifi`, `y1541`, `cap`, `base`, `corr`, `hall`, `prot`).

## Archivos

```
index.html        estructura de la página
css/estilos.css   estilos
js/modelos.js     modelos 3D de los equipos en la escena, construidos por partes
js/escena.js      zonas, ubicación de equipos, cableado, selección y vista anatómica
js/red.js         metadatos de cada equipo y modelo de retardo, pérdida y capacidad
js/pruebas.js     medidas, escenarios animados y resultados con formato de cada herramienta
js/analisis.js    campaña muestral, línea base, correlación, hallazgos, protocolo y CSV
js/ui.js          controles, panel de información, pestañas y capa de anatomía
js/anatomia.js    despiece, selección y lectura en vivo de las figuras de anatomía
js/anatomia-datos.js  figuras generadas (no editar a mano)
css/anatomia.css  estilos del kit anatomy y de las figuras (generado)
anatomia/         fuente de las figuras: base.mjs, equipos/*.mjs, build.mjs y el kit de la skill
lib/              Three.js r147 y OrbitControls
```
