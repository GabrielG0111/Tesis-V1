/* Figuras de anatomía (skill anatomy): despiece con resortes escalonados,
   reordenación por profundidad, selección de piezas y lectura en vivo.
   Basado en el bucle de la figura del motor Raptor de la skill. */
(function () {
  'use strict';

  function montar(raiz, D, op) {
    op = op || {};
    const escenario = raiz.querySelector('.an-escenario');
    const capa = raiz.querySelector('.an-piezas');
    const lectura = raiz.querySelector('[data-readout]');
    const boton = raiz.querySelector('[data-despiezar]');
    const textoBoton = raiz.querySelector('[data-despiezar-texto]');
    const botones = Array.from(raiz.querySelectorAll('.an-parte'));
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');

    const nodos = Array.from(capa.querySelectorAll('.it')).map((el) => {
      const m = el.dataset.m.split(',').map(Number);
      return {
        el, m,
        pieza: el.dataset.piece,
        monta: el.dataset.ride || el.dataset.piece,
        clave: Number(el.dataset.k),
        alza: m[0] * D.V[0] + m[1] * D.V[1] + m[2] * D.V[2],
        sujetos: Array.from(el.querySelectorAll('[data-hold]')),
        visto: '',
      };
    });
    let orden = nodos.map((_, i) => i);
    const ids = Object.keys(D.piezas);
    const piezas = {};
    ids.forEach((id) => { piezas[id] = { x: 0, v: 0, objetivo: 0, pendiente: null }; });
    const moviles = ids.filter((id) => nodos.some((n) => n.pieza === id && (n.m[0] || n.m[1] || n.m[2])));
    const dice = {};
    ids.forEach((id) => { dice[id] = D.piezas[id].dice; });
    Object.assign(dice, op.dice || {});
    const R = D.spring;

    let reloj = 0, separado = false, elegido = null, cuadro = 0, ultimo = 0, visible = true, vivo = true;
    let gira = !quieto.matches && op.gira !== false;
    let gira_t = 0, gira_paso = 0, espera = null, salida = null;

    const decir = (t) => { if (lectura && lectura.textContent !== t) lectura.textContent = t; };
    function enMovimiento() { return moviles.some((id) => piezas[id].pendiente || Math.abs(piezas[id].x - piezas[id].objetivo) > 0.002); }
    function textoLectura() {
      if (elegido) return dice[elegido];
      if (enMovimiento()) return separado ? 'despiezando…' : 'montando…';
      return separado ? 'despiezado · ' + moviles.length + ' conjuntos fuera' : D.lectura;
    }
    function describir() {
      const t = elegido ? D.piezas[elegido].nombre + ': ' + dice[elegido] : separado ? 'Despiezado' : 'Montado';
      if (escenario.getAttribute('aria-valuetext') !== t) escenario.setAttribute('aria-valuetext', t);
    }

    function despiezar(on) {
      if (separado === on) return;
      separado = on;
      const meta = on ? 1 : 0;
      let i = 0;
      const lista = on ? D.stagger : D.stagger.slice().reverse();
      for (const id of lista) {
        const p = piezas[id];
        if (!p) continue;
        if (p.objetivo === meta) p.pendiente = null;
        else p.pendiente = { valor: meta, en: reloj + (quieto.matches ? 0 : i++ * R.stagger) };
      }
      if (boton) { boton.toggleAttribute('data-on', on); textoBoton.textContent = on ? 'Montar' : 'Despiezar'; }
      describir();
      correr();
    }

    function elegir(id) {
      if (id === 'base') id = null;
      if (elegido === id) return;
      elegido = id;
      for (const n of nodos) n.el.toggleAttribute('data-on', id !== null && n.pieza === id);
      escenario.toggleAttribute('data-focus', !!id);
      botones.forEach((b) => b.toggleAttribute('data-on', b.dataset.part === id));
      escenario.setAttribute('aria-valuenow', String(id ? D.orden.indexOf(id) + 1 : 0));
      describir();
      decir(textoLectura());
    }

    function resorte(p, dt, calma) {
      if (p.pendiente && reloj >= p.pendiente.en) { p.objetivo = p.pendiente.valor; p.pendiente = null; }
      if (calma) { p.x = p.objetivo; p.v = 0; return !!p.pendiente; }
      for (let i = 0; i < R.substeps; i++) {
        const h = dt / R.substeps;
        p.v += ((p.objetivo - p.x) * R.stiffness - p.v * R.damping) * h;
        p.x += p.v * h;
      }
      if (Math.abs(p.objetivo - p.x) < 2e-4 && Math.abs(p.v) < 2e-4) { p.x = p.objetivo; p.v = 0; return !!p.pendiente; }
      return true;
    }

    function colocar() {
      for (const n of nodos) {
        const s = piezas[n.monta] ? piezas[n.monta].x : 0;
        const tx = (D.EX[0] * n.m[0] + D.EY[0] * n.m[1] + D.EZ[0] * n.m[2]) * s;
        const ty = (D.EX[1] * n.m[0] + D.EY[1] * n.m[1] + D.EZ[1] * n.m[2]) * s;
        const t = s === 0 ? '' : 'translate(' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ')';
        const dv = D.piezas[n.pieza] && D.piezas[n.pieza].desvanece;
        if (dv) { const o = (1 - dv * Math.min(1, Math.max(0, s))).toFixed(3); if (n.el.style.opacity !== o) n.el.style.opacity = o === '1.000' ? '' : o; }
        if (t !== n.visto) {
          n.visto = t;
          if (t) n.el.setAttribute('transform', t); else n.el.removeAttribute('transform');
          for (const h of n.sujetos) { if (t) h.setAttribute('transform', 'translate(' + (-tx).toFixed(2) + ' ' + (-ty).toFixed(2) + ')'); else h.removeAttribute('transform'); }
        }
      }
      const sig = nodos.map((_, i) => i).sort((a, b) => {
        const A = nodos[a], B = nodos[b];
        return A.clave + A.alza * (piezas[A.monta] ? piezas[A.monta].x : 0) - (B.clave + B.alza * (piezas[B.monta] ? piezas[B.monta].x : 0));
      });
      if (sig.some((v, i) => v !== orden[i])) {
        const frag = document.createDocumentFragment();
        for (const i of sig) frag.appendChild(nodos[i].el);
        capa.appendChild(frag);
        orden = sig;
      }
    }

    // Recorrido automático: despieza, recorre las piezas de la leyenda y vuelve a montar.
    function pasoGira(dt) {
      gira_t -= dt;
      if (gira_t > 0) return;
      if (gira_paso === 0) { despiezar(true); gira_t = 1.6; gira_paso = 1; return; }
      if (gira_paso <= D.orden.length) { elegir(D.orden[gira_paso - 1]); gira_t = 2.3; gira_paso++; return; }
      if (gira_paso === D.orden.length + 1) { elegir(null); gira_t = 1.2; gira_paso++; return; }
      despiezar(false); gira_t = 3.4; gira_paso = 0;
    }

    function tick(ahora) {
      const dt = ultimo ? Math.min((ahora - ultimo) / 1000, 1 / 30) : 1 / 60;
      ultimo = ahora;
      reloj += dt;
      const calma = quieto.matches;
      if (gira) pasoGira(dt);
      let activo = false;
      for (const id of ids) activo = resorte(piezas[id], dt, calma) || activo;
      colocar();
      decir(textoLectura());
      cuadro = vivo && visible && (activo || gira) ? requestAnimationFrame(tick) : 0;
    }
    function correr() { if (!cuadro && visible && vivo) { ultimo = 0; cuadro = requestAnimationFrame(tick); } }

    function tomarControl() {
      gira = false;
      clearTimeout(espera);
      if (quieto.matches || op.gira === false) return;
      espera = setTimeout(() => { elegir(null); gira = true; gira_t = 0.4; gira_paso = separado ? 1 : 0; correr(); }, 9000);
    }

    // Puntero: pasar sobre una pieza la elige; un clic despieza o vuelve a montar.
    function piezaDe(t) { const it = t.closest && t.closest('.it'); return it ? it.dataset.piece : null; }
    escenario.addEventListener('pointerover', (e) => {
      const p = piezaDe(e.target);
      if (!p || p === 'base') return;
      clearTimeout(salida);
      tomarControl();
      elegir(p);
    });
    escenario.addEventListener('pointerleave', () => { clearTimeout(salida); salida = setTimeout(() => elegir(null), 500); });
    escenario.addEventListener('click', () => { tomarControl(); despiezar(!separado); escenario.focus({ preventScroll: true }); });
    if (boton) boton.addEventListener('click', () => { tomarControl(); despiezar(!separado); });
    botones.forEach((b) => {
      b.addEventListener('click', () => { tomarControl(); elegir(elegido === b.dataset.part ? null : b.dataset.part); });
      b.addEventListener('pointerenter', () => { tomarControl(); elegir(b.dataset.part); });
    });
    escenario.addEventListener('keydown', (e) => {
      const i = elegido ? D.orden.indexOf(elegido) : -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); tomarControl(); elegir(D.orden[(i + 1) % D.orden.length]); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); tomarControl(); elegir(D.orden[(i - 1 + D.orden.length) % D.orden.length]); }
      else if (e.key === 'Home') { e.preventDefault(); tomarControl(); elegir(null); }
      else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tomarControl(); despiezar(!separado); }
    });

    const obs = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { visible = en[en.length - 1].isIntersecting; if (visible) correr(); }, { rootMargin: '120px 0px' }) : null;
    if (obs) obs.observe(escenario);
    if (gira) gira_t = op.esperaInicial != null ? op.esperaInicial : 1.4;
    if (op.despiezado) { despiezar(true); gira_paso = 1; }
    decir(textoLectura());
    correr();

    return {
      despiezar, elegir,
      actualizarDice(nuevo) { Object.assign(dice, nuevo); decir(textoLectura()); },
      destruir() { vivo = false; cancelAnimationFrame(cuadro); clearTimeout(espera); clearTimeout(salida); if (obs) obs.disconnect(); },
    };
  }

  window.Anatomia = { montar };
})();
