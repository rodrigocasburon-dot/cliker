# PLAN — Clicker Clímax

Proyecto TypeScript + Vite en `clicker/`. Cada fase termina ejecutando el juego (build + tests + sim) y con un commit.

| Fase | Contenido | Criterio de aceptación | Estado |
|---|---|---|---|
| 1. Núcleo | Bucle de paso fijo (100 ms) + render rAF, estado tipado, números grandes (`break_eternity.js`), formato 1.23K / científico, guardado `localStorage` cada 10 s y al cerrar, exportar/importar, un lado con click | Un click suma recurso, se guarda y se carga (test `save.test.ts`) | ✅ |
| 2. Dos lados y niveles | Lados `semen` y `squirt`, XP = recurso producido + objetivos, `xp(n) = base·1.12^n`, 200 niveles, etapas cada 25, `npm run sim` | `npm run sim` imprime tiempos por nivel coherentes con la tabla del GDD | ✅ |
| 3. Mejoras y generadores | Familias Click / Generadores / Multiplicadores, coste `base·1.15^n`, sinergia cruzada, pares excluyentes A/B, retorno estimado, botón «comprar la mejor» | Sin estrategia trivial dominante: el sim compara estrategias (análisis en GDD §6) | ✅ |
| 4. Automatización y mosca | Desbloqueo nivel 10, mosca QTE 30–90 s, ×1.5 a la velocidad automática, mosca dorada, accesibilidad | Test: con la automatización desbloqueada, tocar la mosca multiplica la velocidad ×1.5 | ✅ |
| 5. Offline, prestigio y logros | Progreso offline con tope de 8 h y aviso, prestigio al nivel 200, logros con XP y bonus | Tests de offline (tope 8 h) y prestigio | ✅ |
| 6. Arte, audio y UI/UX | Sprites pixel art procedurales (sustituibles en `public/assets/`), parallax, partículas, números flotantes, sacudida, sonidos y música chiptune Web Audio, tutorial, ajustes, responsive | Jugable en móvil y escritorio sin errores de consola | ✅ |
| 7. Balance final y QA | Simular partidas completas, corregir muros, README | `npm test`, `npm run build` y `npm run sim` verdes; tiempos dentro de objetivo | ✅ |
