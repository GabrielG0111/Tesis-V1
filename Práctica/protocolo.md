# Protocolo de medición desde el extremo

**Versión 0.1 (borrador, 2026-11-18).** Extraído del simulador 3D (`simulador_3d/js/analisis.js`, pestaña «Protocolo y datos») y ajustado según el informe de revisión del tutor del 6 de noviembre de 2026 (hallazgos C2, A1 a A5).

> **Estado.** Este documento fija el diseño. Los puntos marcados con **⚠ PILOTO** se confirman o corrigen con la campaña piloto (semanas 3 y 4). Los marcados con **⚠ TEMA 2** dependen del acuerdo de entrega de datos con el tutor y con el estudiante del Tema 2 (hallazgo C3). Cada cambio se anota en el registro de versiones del final.
>
> Ningún valor de este documento es un resultado. Los valores que muestra el simulador son sintéticos y no se usan en la tesis.

## 1. Plano de observación y límites

- Todas las mediciones se ejecutan desde el portátil del estudiante, con las credenciales y privilegios de cualquier usuario autorizado de la red.
- Se caracteriza el **servicio entregado en el extremo**, no el estado interno de la infraestructura. No hay acceso al plano de gestión (SNMP, NetFlow/IPFIX, consolas de los equipos ni controladora inalámbrica).
- La topología interna de la red (núcleo, cortafuegos, armarios) es desconocida. La que dibuja el simulador es ilustrativa.

## 2. Equipo de medición

| Elemento | Valor | Estado |
|---|---|---|
| Portátil | Marca, modelo, CPU, RAM | ⚠ PILOTO: completar |
| Sistema operativo | GNU/Linux (preferente); Windows como alternativa | ⚠ PILOTO: elegir según A3 |
| Adaptador inalámbrico | Modelo, controlador, versión de firmware, estándares 802.11 | ⚠ PILOTO: completar |
| Adaptador cableado | Interfaz integrada o adaptador USB-C a RJ45 de 1 Gbit/s | ⚠ PILOTO: completar |
| Reloj | Sincronizado por NTP antes de cada jornada (`timedatectl` o `w32tm /query /status`) | Fijo |
| Herramientas | iperf3, fping, ping, mtr, tracepath, dig, curl, tcpdump, tshark, Wireshark, iw (o netsh wlan), Python con pandas, SciPy y matplotlib | Registrar versiones en el piloto |

### 2.1 Verificación de indicadores inalámbricos (A3)

Antes de la campaña se comprueba, con el adaptador y el sistema operativo reales, qué indicadores entrega el controlador y con qué resolución temporal. El resultado se transcribe a la tabla siguiente.

| Indicador (OE4) | GNU/Linux (`iw`) | Windows (`netsh wlan`) | Disponible | Resolución |
|---|---|---|---|---|
| Potencia recibida (RSSI, dBm) | `iw dev IF link` → `signal` | `Signal` en % (algunas versiones muestran `Rssi`) | ⚠ PILOTO | ⚠ PILOTO |
| Ruido del canal (dBm) | `iw dev IF survey dump` → `noise` | No disponible | ⚠ PILOTO | ⚠ PILOTO |
| SNR (dB) | RSSI − ruido | No disponible | ⚠ PILOTO | — |
| MCS y tasa nominal | `iw dev IF link` → `tx bitrate` (MCS, ancho, NSS) | `Receive rate`, `Transmit rate` | ⚠ PILOTO | ⚠ PILOTO |
| Reintentos | `iw dev IF station dump` → `tx retries`, `tx failed` | No disponible | ⚠ PILOTO | ⚠ PILOTO |
| Ocupación del canal | `survey dump` → `channel busy time` / `channel active time` | No disponible | ⚠ PILOTO | ⚠ PILOTO |
| Canal y ancho | `iw dev IF info` | `Channel` | ⚠ PILOTO | — |

Si un indicador del OE4 no está disponible, se prueba otro sistema operativo o un adaptador del laboratorio. Si tampoco así se obtiene, se ajusta la redacción del OE4 con la aprobación del tutor.

## 3. Diseño muestral

Diseño no experimental, descriptivo y correlacional. Unidad de análisis: la **sesión de medición**.

| Factor | Niveles | Estado |
|---|---|---|
| Punto de asociación | P1 (cerca del punto de acceso), P2 (distancia media), P3 (detrás de un muro o en el borde de la cobertura), todos en espacios de uso común | ⚠ PILOTO: ubicar y describir cada punto (edificio, piso, espacio, BSSID, banda, canal) |
| Franja horaria | Baja (inicio de la jornada, 07:00 a 08:30) y alta (11:00 a 13:00) | ⚠ PILOTO: confirmar con el horario de clases |
| Destino | Interno (servidor iperf3 en el laboratorio de la carrera) y público (servidor iperf3 de referencia) | ⚠ PILOTO: ver la sección 4 |
| Medio | Wi-Fi en P1, P2 y P3; cable de control en un punto de red de un espacio común | ⚠ PILOTO: ubicar el punto cableado |
| Repeticiones | Al menos 5 por estrato, cada una en un día lectivo distinto, distribuidas entre lunes y viernes | Fijo (mínimo) |

Estratos: 3 puntos Wi-Fi × 2 franjas × 2 destinos = 12, más el cable de control × 2 franjas × 2 destinos = 4. Hay 16 estratos, y cada jornada suma 16 sesiones (8 por franja).

Con 5 repeticiones resultan 80 sesiones. De ellas, 60 son de Wi-Fi y alimentan la correlación del OE4 (n = 60 por destino y franja agregados).

## 4. Destinos

| Destino | Uso | Requisitos | Estado |
|---|---|---|---|
| Servidor iperf3 interno | Acota la ruta al interior del campus. Sirve para iperf3 TCP y UDP, fping y mtr | Equipo del laboratorio de la carrera con `iperf3 -s`, IP fija, cableado a 1 Gbit/s y permiso escrito del responsable del laboratorio | ⚠ PILOTO: pedir permiso, registrar IP, ubicación y capacidad de la interfaz |
| Servidor iperf3 público | Ruta completa: campus, salida a Internet y red externa | Servidor de referencia con ubicación, capacidad declarada y disponibilidad documentadas. Se elige uno principal y uno de respaldo | ⚠ PILOTO: elegir y documentar |
| Resolutor DNS institucional | Tiempos de resolución | El que entrega DHCP; registrar su dirección | ⚠ PILOTO |
| Servicios para las fases | Descomposición DNS/TCP/TLS/primer byte/transferencia | Dos servicios institucionales (plataforma de aprendizaje y sistema académico) y dos externos de uso frecuente | ⚠ PILOTO: elegir y fijar las URL |

En cada sesión se registra el servidor efectivamente usado. Los resultados se separan siempre por tipo de destino (A1-d).

## 5. Lista de comprobación previa a cada sesión

1. Portátil conectado al cargador.
2. Ahorro de energía de la interfaz desactivado y verificado: `iw dev IF set power_save off` y luego `iw dev IF get power_save` (debe decir `off`). En Windows, plan de energía de máximo rendimiento y «Modo de ahorro de energía» del adaptador en «Máximo rendimiento» (A4-a).
3. Sin VPN, sin actualizaciones en curso y con el resto de aplicaciones de red cerradas.
4. Conexión al SSID institucional. Se anotan BSSID, banda y canal.
5. Hoja de registro abierta (sección 9).

## 6. Secuencia de una sesión

`IF` es la interfaz de la sesión, `DST` el destino, `MI_IP` la dirección propia y `URL` el servicio de la fase.

| # | Paso | Comando | Duración aprox. |
|---|---|---|---|
| 0 | Registro inalámbrico en segundo plano, cada 1 s, durante toda la sesión | `while :; do date +%s.%N; iw dev IF link; iw dev IF station dump; sleep 1; done > wifi.log` y `iw dev IF survey dump` al inicio y al final | — |
| 1 | Captura propia, sin modo promiscuo, durante toda la sesión (A5) | `tcpdump -i IF -p -s 128 -w sesion.pcapng host MI_IP` | — |
| 2 | MTU de la ruta (RFC 6349, paso 1) | `tracepath -n DST` y `ping -M do -s 1472 -c 3 DST` (bajar `-s` hasta que pase) | 10 s |
| 3 | RTT, IPDV e IPLR por paquete (Y.1540) | `fping -C 1000 -p 60 -q DST 2> icmp.txt` (1000 sondas en 60 s; conserva el RTT de cada sonda) | 60 s |
| 4 | Goodput TCP de bajada (RFC 6349, paso 3) con RTT concurrente para el retardo por búfer | `ping -i 0.2 DST > rtt_carga.txt &` y `iperf3 -c DST -R -t 10 -O 2 -J > tcp_bajada.json` | 12 s |
| 5 | Goodput TCP de subida | `iperf3 -c DST -t 10 -O 2 -J > tcp_subida.json` | 12 s |
| 6 | Jitter (RFC 3550), pérdida y reordenamiento UDP | `iperf3 -c DST -u -b 1M -l 1200 -t 30 -J > udp.json` | 30 s |
| 7 | Resolución DNS (con y sin caché) | `dig URL_HOST @RESOLUTOR +stats` dos veces seguidas | 2 s |
| 8 | Fases del servicio, forzando TCP (A4-b) | `curl --http2 -so /dev/null -w @formato_curl.txt URL` × 3 por servicio | 10 s |
| 9 | Ruta y pérdida por salto | `mtr -n -r -c 30 DST` | 30 s |

`formato_curl.txt` contiene: `%{time_namelookup},%{time_connect},%{time_appconnect},%{time_starttransfer},%{time_total},%{size_download},%{http_version}`.

La duración por sesión es de unos 3 minutos de medición. Las sesiones de una misma franja quedan espaciadas al menos 10 minutos (A5).

**⚠ PILOTO.** Se calibran la tasa UDP (`-b`), la duración TCP (`-t`) y el número de sondas. Se comprueba también que el servidor interno no sea el cuello de botella.

## 7. Variables registradas (diccionario de datos)

Una fila por sesión en `datos/sesiones.csv`.

| Columna | Unidad | Origen | Definición |
|---|---|---|---|
| `id`, `fecha`, `hora_inicio` | — | Hoja de registro | Identificación de la sesión |
| `punto`, `franja`, `destino`, `medio` | — | Diseño | Estrato |
| `interfaz`, `bssid`, `banda`, `canal`, `ancho_canal` | — / MHz | `iw` | Contexto del enlace |
| `psm` | sí/no | `iw get power_save` | Ahorro de energía al inicio y al final |
| `rssi`, `ruido`, `snr` | dBm / dBm / dB | `iw` (mediana de la sesión) | Capa física |
| `mcs`, `nss`, `tasa_nominal` | — / — / Mbit/s | `iw` (moda o mediana) | Tasa de la capa física |
| `reintentos` | % | `station dump` (Δ`tx retries` / Δ`tx packets`) | Capa de enlace |
| `ocupacion` | % | `survey dump` (Δbusy / Δactive) | Ocupación del canal |
| `mtu_ruta` | bytes | tracepath / ping `-M do` | MTU efectiva |
| `rtt_min`, `rtt_media`, `rtt_p50`, `rtt_p95` | ms | fping `-C` | RTT de las sondas recibidas |
| `ipdv_y1541` | ms | fping `-C` | Cuantil 1−10⁻³ del RTT menos el RTT mínimo (n ≥ 1000) |
| `iplr` | — | fping `-C` | Sondas sin respuesta / sondas enviadas |
| `n_sondas` | — | fping | Sondas enviadas |
| `goodput_bajada`, `goodput_subida` | Mbit/s | iperf3 JSON (`end.sum_received`) | Goodput tras omitir el arranque |
| `retx_bajada`, `retx_subida` | segmentos | iperf3 JSON y captura | Retransmisiones |
| `eficiencia_tcp` | % | RFC 6349 | (bytes transmitidos − retransmitidos) / bytes transmitidos |
| `retardo_bufer` | % | RFC 6349 | (RTT medio con carga − RTT base) / RTT base |
| `rwnd` | KiB | captura | Ventana de recepción anunciada |
| `limitacion` | categoría | captura (bytes en vuelo) | cwnd, rwnd o capacidad |
| `jitter_udp`, `perdida_udp`, `fuera_orden_udp` | ms / % / paquetes | iperf3 UDP | RFC 3550 y pérdida |
| `dns_frio`, `dns_cache` | ms | dig | Primera y segunda consulta |
| `t_tcp`, `t_tls`, `t_primer_byte`, `t_transferencia`, `t_total` | ms | curl (diferencias entre marcas) | Fases del servicio |
| `version_http` | — | curl | Debe ser 1.1 o 2 (TCP) |
| `volumen_mb` | MB | iperf3 + fping | Volumen inyectado en la sesión |
| `valida`, `motivo_descarte` | — | Sección 8 | Validez |

Las capturas (`.pcapng`) y los JSON quedan fuera del repositorio. Se guardan cifrados en un almacenamiento propio y solo se versionan los CSV derivados (B1).

## 8. Criterios de validez y descarte

Una sesión se descarta, y queda registrado el motivo, si cumple al menos uno de estos criterios:

1. El ahorro de energía estaba activo al inicio o al final.
2. La mediana de RSSI se aparta más de 6 dB de la mediana habitual del punto (el portátil no estaba en el punto o cambió el punto de acceso).
3. iperf3 no completa la prueba (servidor ocupado, error o duración menor que la pedida).
4. fping envía menos de 1000 sondas.
5. La ruta del mtr difiere de la ruta de referencia del destino (cambio de ruta durante la campaña). Se anota y se analiza aparte.
6. curl negocia HTTP/3. Ese caso se trata por separado (A4-b).
7. Valor atípico de goodput o RTT dentro del estrato, con la regla de Tukey a 3 × RIC. Se aplica después de la campaña.

**⚠ PILOTO.** Se revisa el umbral de 6 dB con la dispersión real de la señal en cada punto.

## 9. Hoja de registro de la sesión

| Campo | Ejemplo de formato |
|---|---|
| Fecha y hora de inicio y fin | 2026-11-24 07:12 a 07:16 |
| Punto, franja, destino y medio | P2 · baja · interno · Wi-Fi |
| BSSID, banda, canal y ancho | aa:bb:… · 5 GHz · 36 · 80 MHz |
| Ocupación observada del espacio | Número aproximado de personas o «aula en clase» |
| Ahorro de energía | off / off (inicio / fin) |
| Incidencias | Texto libre |
| Volumen inyectado | MB |

## 10. Procesamiento y contraste con Y.1541 (A1)

- **Línea base.** Por estrato se calculan la mediana, el rango intercuartílico, el percentil 95 y el coeficiente de variación. Los resultados se presentan en tablas y gráficos de caja.
- **Correlación (OE4).** ρ de Spearman entre los indicadores de capa física y de enlace (RSSI, SNR, MCS, reintentos, ocupación) y el desempeño (goodput, RTT, IPDV, IPLR, carga del servicio), separando por destino.
- **Aporte por segmento.** Se calculan diferencias entre medianas: Wi-Fi − cable al mismo destino interno estima la contribución del acceso inalámbrico, y destino público − interno por cable estima la de la salida a Internet.
- **Contraste con Y.1541.** Se aplica una regla conservadora por estrato:
  - IPTD: si el RTT medio es menor o igual al objetivo de la clase, el objetivo **se cumple**, porque el retardo en cada sentido no supera el RTT. Si es mayor, el resultado es **no concluyente**.
  - IPDV: se evalúa solo con n ≥ 1000. Se calcula sobre el RTT por sonda y se declara como aproximación de la IPDV en un sentido.
  - IPLR: la pérdida de ida y vuelta acota por exceso la de cada sentido, así que si la pérdida medida es menor o igual a 10⁻³, el objetivo se cumple.
  - Clases de referencia: 0 y 1 para voz y videoconferencia; 2 y 3 para la plataforma de aprendizaje y la web interactiva; 4 para descargas y video en flujo continuo.
- **RFC 6349 adaptada (A2).** Se reportan la MTU, el RTT base, la eficiencia TCP y el retardo por búfer. El ancho de banda del cuello de botella solo se estima (máximo goodput observado por cable hacia el destino interno). La relación de tiempos de transferencia se calcula sobre esa estimación y se declara como tal.
- **Matriz de hallazgos.** Se clasifica según NIST SP 800-30: la probabilidad es la frecuencia en el diseño muestral y el impacto es el efecto sobre el usuario.

## 11. Ética y carga sobre el medio compartido (A5)

- Captura solo de la interfaz propia, con `-p` (sin modo promiscuo) y con un filtro por la dirección propia, y truncada a 128 bytes por trama (solo cabeceras).
- Sin escaneo de hosts ni de puertos, sin descifrado de tráfico, sin acceso al plano de gestión.
- El flujo TCP ocupa el cuello de botella unos 24 s por sesión, y las sesiones están espaciadas al menos 10 min. El volumen de cada sesión se registra.
- Antes de la campaña se revisa la política de uso aceptable de la red y, si el tutor lo considera oportuno, se informa del calendario al área de TI.

## 12. Entrega de datos al Tema 2 (C3)

| Elemento | Propuesta | Estado |
|---|---|---|
| Variables | Goodput de bajada y de subida (mediana y RIC), RTT p50 y p95, IPDV (Y.1541), IPLR, MTU de la ruta y aporte por segmento, con las condiciones de medición (punto, franja, destino, medio) | ⚠ TEMA 2: acordar |
| Formato | `entrega_tema2.csv` más `diccionario_datos.md` (sección 7) | ⚠ TEMA 2: acordar |
| Fecha | Compatible con la semana 6 del Tema 2. Si la campaña no está lista, se entrega el piloto marcado como provisional | ⚠ TEMA 2: acordar con el tutor |

## 13. Campaña piloto (semanas 3 y 4)

Objetivos del piloto:

- Verificar la instrumentación (sección 2.1).
- Medir la duración real de una sesión.
- Calibrar los parámetros de la sección 6.
- Comprobar los criterios de la sección 8.
- Obtener la ruta de referencia de cada destino.

Alcance: 1 jornada, ambas franjas, los 4 puntos y los 2 destinos, es decir, 16 sesiones.

**⚠ PILOTO.** Resultados pendientes: se documentarán en el Capítulo II y en este archivo.

## Registro de versiones

| Versión | Fecha | Cambio |
|---|---|---|
| 0.1 | 2026-11-18 | Primera versión, extraída del simulador y ajustada al informe del tutor |
