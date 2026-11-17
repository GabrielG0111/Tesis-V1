#!/usr/bin/env python3
"""Empaqueta el simulador en un solo archivo HTML: simulador.html.

Copia dentro de la página todas las hojas de estilo y todos los scripts que
index.html carga desde css/, js/ y lib/. El resultado no depende de ningún
otro archivo ni de internet, así que se puede enviar por correo o Drive y
abrir con doble clic en Chrome, Firefox, Safari o Edge.

Uso (desde esta carpeta o desde cualquier otra):

    python3 construir_un_archivo.py

Vuelva a ejecutarlo cada vez que cambie index.html, css/, js/ o lib/.
Solo usa la biblioteca estándar de Python 3.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
ENTRADA = RAIZ / "index.html"
SALIDA = RAIZ / "simulador.html"


def leer(ruta: str) -> str:
    archivo = (RAIZ / ruta).resolve()
    if RAIZ not in archivo.parents:
        sys.exit(f"Ruta fuera del simulador: {ruta}")
    return archivo.read_text(encoding="utf-8")


def css_en_linea(m: re.Match) -> str:
    return f"<style>/* {m.group(1)} */\n{leer(m.group(1))}\n</style>"


def js_en_linea(m: re.Match) -> str:
    codigo = leer(m.group(1))
    # Un "</script" dentro del código cerraría la etiqueta antes de tiempo.
    codigo = re.sub(r"</(script)", r"<\\/\1", codigo, flags=re.IGNORECASE)
    return f"<script>/* {m.group(1)} */\n{codigo}\n</script>"


def main() -> None:
    html = ENTRADA.read_text(encoding="utf-8")
    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', css_en_linea, html)
    html, n_js = re.subn(r'<script src="([^"]+)"></script>', js_en_linea, html)
    restos = re.findall(r'(?:src|href)="(?!#|https?:|data:|mailto:)([^"]+)"', html)
    if restos:
        sys.exit(f"Quedan referencias a archivos externos: {restos}")
    aviso = ("<!-- Archivo generado por construir_un_archivo.py a partir de index.html. "
             "No editar a mano. -->\n")
    # El aviso va después del doctype, para no activar el modo de compatibilidad.
    doctype, _, resto = html.partition("\n")
    SALIDA.write_text(doctype + "\n" + aviso + resto, encoding="utf-8")
    tam = SALIDA.stat().st_size / 1e6
    print(f"{SALIDA.name}: {n_css} hojas de estilo y {n_js} scripts en línea, {tam:.1f} MB")


if __name__ == "__main__":
    main()
