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
- **Prestigio («Reempezar con multiplicador»)**: al principio solo al nivel 200; ahora desde el nivel 40, con puntos Σ floor((nivel/20)^1.4) para que llegar más lejos compense más que reempezar muchas veces muy pronto. Cada punto +25 % a toda la producción. Se conservan logros, condones, ajustes y estadísticas.

## Arte y audio
- Sin assets externos: sprites pixel art procedurales dibujados en canvas a baja resolución. El arte final se declara en `assets/assets.json` (tira de 9 fotogramas, uno por etapa); así no se piden archivos inexistentes y no hay 404 en consola.
- Mascotas no explícitas: un cohete (lado masculino) y una almeja (lado femenino), con gotas, onomatopeyas y confeti.
- Sonido y música chiptune con Web Audio API, sin dependencias.

## Segunda versión (condones, sobreuso, skins)
- **Condones** = moneda compartida y permanente (sobrevive al prestigio). Fuentes: +1 por nivel (+5 en múltiplos de 10), +1 por mosca (+5 dorada), +3 por logro y un 0.4 % por click manual. Sus mejoras son pequeñas por nivel pero acumulables, y algunas superan el ×1.5 de la mosca (hasta ×2.5).
- **Sobreuso**: calor por click (3) que baja solo (14/s, ~4.7 clicks/s sostenibles por lado). Al llegar a 100: problema de 25 s (clicks ×0.1, sin combo, automatización ×0.5). Es humor cartoon: bolsa de hielo / bolsa de agua caliente y cara de «X X».
- **Clicks y multiplicadores más fuertes**: «Dedos ágiles» +2 por nivel (hasta 20 niveles), «Técnica depurada» ×2, «Muñecas» con el doble de %, globales ×2/×3, mejoras de generador hasta ×4, combo +4 % por stack (máx. 40).
- Para que el ritmo siga en los objetivos: **cada click automático vale el 25 % de uno manual** (si no, la automatización con clicks tan fuertes rompía la economía; además así tus clicks son los que de verdad cuentan), XP base 300 y ritmo de generadores ×90.

## Tercera versión (estética más picante)
- Se sube el tono con doble sentido, ropa atrevida, censura de broma, salpicones y ambiente de motel, pero sin dibujar genitales ni actos sexuales explícitos: el juego está publicado en abierto y el humor funciona mejor sugiriendo.

## Paso final («Sexo»)
- Se implementa como un minijuego de ritmo que cierra el juego («La gran noche»), desbloqueado tras 3 reinicios. Mismo criterio visual que el resto: todo bajo las sábanas, con censura de broma y sin dibujar actos sexuales explícitos.
- Es repetible y su recompensa es multiplicativa con la de reempezar, para que siga teniendo sentido tras el primer final.

## Código secreto
- Se introduce como texto en Ajustes (funciona igual en móvil que en escritorio). Código `CLIMAX39`, sin distinguir mayúsculas, espacios ni acentos. Un solo uso por partida guardada (`cheatUsed`, se conserva al reempezar). Sube ambos lados al 39 (nunca baja a un lado que ya esté más alto) y da 0.5 niveles de producción de recurso a cada lado; con eso se llega al 40 enseguida.
