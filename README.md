# 💦 Clicker Clímax

Clicker/idle **+18** de humor cartoon y desvergonzado. Gestiona dos fábricas paralelas —el **Cohete** (lado masculino, recurso `semen`) y la **Almeja** (lado femenino, recurso `squirt`)—, sube cada lado hasta el **nivel 200**, caza moscas y haz prestigio. Todo es pixel art estilizado y no explícito.

## Cómo ejecutarlo

Requiere Node 20 o superior.

```bash
cd clicker
npm install
npm run dev      # servidor de desarrollo (http://localhost:5173)
npm test         # tests unitarios (Vitest)
npm run build    # comprueba tipos y genera dist/ (estático, rutas relativas)
npm run preview  # sirve el build
npm run sim      # simulación de una partida completa con tiempos por nivel
```

`dist/` se puede servir desde cualquier carpeta (GitHub Pages, itch.io, un servidor estático…).

### Opciones del simulador

```bash
npm run sim -- --levels                 # tabla nivel a nivel (por defecto, cada 10)
npm run sim -- --strategy=todas         # compara estrategias (óptimo, barato, solo generadores, siempre A, siempre B, un solo lado)
npm run sim -- --play=activo            # jugador que no para de hacer clicks (por defecto: activo 30 min y luego casual)
npm run sim -- --hours=120 --detail     # más horas y desglose final de multiplicadores
npm run sim -- --detail --at=50         # para al llegar al nivel 50 y muestra el estado
```

El simulador usa exactamente la misma lógica que el juego (`src/systems`) y marca con ✔/✘ los objetivos de ritmo del GDD.

## Cómo se juega

- **Toca a la mascota** para provocar su clímax: ganas recurso (y XP). Los clicks seguidos suben un **combo**.
- **Generadores** producen solos; cada unidad cuesta `base · 1.15^cantidad`. Elige ×1, ×10 o Máx.
- **Multiplicadores**: mejoras globales, «×2» de cada generador, **Química de pareja** (cuanto más nivel tiene el otro lado, más rinde este) y **elecciones excluyentes A/B** con ventajas e inconvenientes.
- Cada compra muestra el efecto exacto (`antes/s → después/s`) y cuánto tarda en **amortizarse**. La ⭐ marca la compra recomendada; desde el nivel 25 puedes desbloquear «Comprar la mejor».
- **Nivel 10**: automatización (el lado pulsa solo). **La mosca** aparece cada 30–90 s: tócala y la automatización va un **+50 %** durante 30 s (sin automatización, da una ráfaga de recurso). Desde el nivel 50 hay moscas doradas.
- **Offline**: al volver recibes lo producido mientras no estabas (máximo 8 h).
- **Nivel 200** en un lado: **prestigio**. Reinicia ambos lados a cambio de puntos que dan +25 % de producción permanente cada uno.
- Ajustes: volumen de efectos y música, silencio, desactivar moscas (la automatización recibe ×1.15 fijo), área de toque grande, sacudidas, notación numérica, exportar/importar/borrar partida.

La partida se guarda sola en `localStorage` cada 10 s y al cerrar la pestaña.

## Cómo ajustar el balance

Todos los números viven en `src/data/` (la lógica nunca los tiene escritos a mano):

| Archivo | Qué contiene |
|---|---|
| `balance.ts` | curva de XP (`base`, `growth`), crecimiento por nivel, combo, automatización, mosca, offline, prestigio, logros |
| `generators.ts` | los 12 generadores: nivel de desbloqueo, precio (en «niveles de producción») y `pace` (amortización nominal; más = más lento) y las mejoras ×2 por cantidad |
| `upgrades.ts` | mejoras de click, multiplicadores, sinergia y elecciones A/B (precios con `at(nivel, niveles)`) |
| `globals.ts` | multiplicadores globales por nivel |
| `achievements.ts` | logros y sus condiciones |
| `curve.ts` | precio de referencia: `at(n, k)` = k veces el XP del nivel n (como 1 recurso = 1 XP, «lo que produces en k niveles») |

Flujo recomendado: cambia un valor → `npm run sim` → compara con la tabla del GDD (§3) → `npm run sim -- --strategy=todas` para comprobar que ninguna estrategia trivial domina.

Los textos visibles (nombres de recursos, generadores, mejoras, logros, interfaz) están en `src/i18n/es.ts`.

## Cómo sustituir el arte

Los sprites son placeholders procedurales dibujados en canvas (`src/ui/sprites.ts`). Para usar arte final, coloca en `public/assets/`:

- Un PNG por mascota (p. ej. `male.png`, `female.png`): una tira horizontal de **9 fotogramas cuadrados** (uno por etapa, cada 25 niveles: 0–24, 25–49, … 200). Se dibujan con píxeles nítidos; se recomienda 64×64 px por fotograma.
- Decláralos en `public/assets/assets.json`: `{ "male": "male.png", "female": "female.png" }`. Con `null` se usan los sprites procedurales. Los fondos, partículas y la mosca siguen siendo procedurales (ver `sideView.ts` y `sprites.ts`).

El audio (efectos 8-bit y música chiptune) se genera con Web Audio API en `src/audio/audio.ts`.

## Estructura

```
src/core      bucle de paso fijo, estado, guardado, números grandes, formato
src/systems   producción, niveles, tienda, automatización y mosca, offline, prestigio, logros
src/data      balance y contenido
src/ui        componentes DOM, render canvas, sprites, estilos
src/i18n      textos (es.ts)
src/audio     sonido y música
tests/        tests unitarios
scripts/      simulador (sim.ts), sonda de paybacks (probe.ts), generador de partidas de prueba (make-save.ts)
```

Documentación de diseño: [`GDD.md`](GDD.md) · Plan por fases: [`PLAN.md`](PLAN.md) · Decisiones tomadas: [`DECISIONES.md`](DECISIONES.md).
