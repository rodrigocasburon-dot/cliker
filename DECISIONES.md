# DECISIONES

Ambigüedades resueltas con la opción más simple (ver prompt §0.4).

## Proyecto
- **Un solo archivo**: el build (vite-plugin-singlefile) incrusta JS y CSS en `index.html` para que el juego se abra con doble clic (`file://`), como Dibujapp. La entrada de desarrollo es `dev.html`.
- **Repositorio propio**: empezó dentro del repo de Dibujapp (`clicker/`) y se separó a su propio repositorio conservando el historial.
- **Commits por fase**: las fases 1–5 comparten la capa de lógica pura (`src/systems`), así que se desarrollaron juntas y se validaron con tests y simulador antes de la UI. Los commits agrupan fases contiguas.
- **Números grandes**: `break_eternity.js` (admite cifras más allá de 1e308, útil tras varios prestigios). Los multiplicadores internos (que nunca pasan de ~1e15) son `number` por rendimiento.

## Economía y XP
- **XP = recurso producido** (1:1) más un bonus por cada logro (25 % del nivel actual a cada lado).
- **Crecimiento de XP 1.3 en vez de 1.12**: el prompt da 1.12 como ejemplo («p. ej.») y ajustable. Con XP = recurso y los objetivos de ritmo (nivel 10 < 3 min, nivel 50 en 3–5 h), un crecimiento de 1.12 obligaría a que la producción apenas se triplicase en las primeras 4 h: aburrido. Con 1.3 la producción crece ~×600 hasta el nivel 50 y hasta ~1e21/s en el 200, manteniendo la fórmula `xp(n) = base · growth^n`.
- **Precios anclados a la curva de XP**: los costes de mejoras y generadores se expresan como «N niveles de producción a su nivel de desbloqueo» (`data/curve.ts`). Así reajustar la curva de XP no rompe los precios.
- **El click no se multiplica por nivel ni por mejoras globales**: solo por sus mejoras, logros, prestigio y un % de la producción/s (estilo Cookie Clicker). Si no, el click (y la automatización) eclipsaban a los generadores todo el juego.
- **Nivel → producción**: cada nivel multiplica ×1.03 los generadores (configurable en `levelGrowth`, admite una rampa).
- **Retorno estimado**: tiempo = coste / incremento de ingreso por segundo (pasivo + automático + clicks al ritmo medido del jugador; si aún no ha hecho clicks, se asumen 4 clicks/s). «Comprar la mejor» minimiza espera + amortización y nunca elige las mejoras excluyentes (son decisión del jugador).

## Automatización y mosca
- **«+50 % cada vez que se activa el evento de la mosca»**: se interpreta como un efecto temporal ×1.5 a la velocidad automática mientras dura (30 s), no acumulable: atrapar otra mosca durante el efecto lo alarga. Antes de desbloquear la automatización la mosca da una ráfaga de recurso.
- **La mosca afecta a ambos lados** (cada lado aplica su propia regla según tenga o no la automatización).
- **QTE desactivados**: no aparecen moscas y la automatización recibe ×1.15 fijo (equivalente reducido del ×1.5 temporal).
- La mosca dorada aparece desde el nivel 50 (12 %): ráfaga ×8 y efecto de doble duración.

## Offline y prestigio
- **Offline**: se simula la ausencia en hasta 400 tramos (producción pasiva + automatización, sin moscas ni combos) para que cuenten las subidas de nivel; tope 8 h; aviso al volver si fueron > 60 s. También se aplica si la pestaña estuvo oculta.
- **Prestigio**: disponible con un lado al nivel 200; reinicia ambos lados; puntos = Σ floor(nivel/20) por lado (20 con ambos al 200); cada punto +25 % a toda la producción. Se conservan logros, ajustes y estadísticas.

## Arte y audio
- Sin assets externos: sprites pixel art procedurales dibujados en canvas a baja resolución. El arte final se declara en `public/assets/assets.json` (tira de 9 fotogramas, uno por etapa); así no se piden archivos inexistentes y no hay 404 en consola.
- Mascotas no explícitas: un cohete (lado masculino) y una almeja (lado femenino), con gotas, onomatopeyas y confeti.
- Sonido y música chiptune con Web Audio API, sin dependencias.
