# 💦 Clicker Clímax

Clicker/idle **+18** de humor cartoon y desvergonzado. Gestiona dos fábricas paralelas —el **Cohete** (lado masculino, recurso `semen`) y la **Almeja** (lado femenino, recurso `squirt`)—, sube cada lado hasta el **nivel 200**, caza moscas y haz prestigio. Todo es pixel art estilizado y no explícito.

## Cómo jugar ya

Abre **`index.html`** con doble clic. Es el juego completo en un solo archivo: no hace falta instalar nada ni tener servidor. La partida se guarda en el navegador.

## Jugar en el móvil

1. Activa GitHub Pages: en el repositorio, **Settings → Pages → Build and deployment → Source: Deploy from a branch**, rama **`main`**, carpeta **`/ (root)`**, y **Save**.
2. En uno o dos minutos el juego estará en **https://rodrigocasburon-dot.github.io/cliker/**. Ábrelo en el navegador del móvil.
3. Para tenerlo como una app (pantalla completa y con icono):
   - **Android (Chrome)**: menú ⋮ → **Añadir a pantalla de inicio** / **Instalar aplicación**.
   - **iPhone (Safari)**: botón Compartir → **Añadir a pantalla de inicio**.

La partida se guarda en el navegador de cada dispositivo. Para pasarla del ordenador al móvil (o al revés) usa **Ajustes → Exportar partida** en uno e **Importar partida** en el otro.

## Desarrollo

Requiere Node 20 o superior.

```bash
npm install
npm run dev      # servidor de desarrollo (abre http://localhost:5173/dev.html)
npm test         # tests unitarios (Vitest)
npm run build    # comprueba tipos y regenera index.html (un solo archivo autónomo)
npm run sim      # simulación de una partida completa con tiempos por nivel
```

- `dev.html` es la página de desarrollo: carga el código de `src/` y **solo funciona con `npm run dev`** (si se abre con doble clic se queda en blanco).
- `index.html` es el resultado del build: después de cambiar código o balance, ejecuta `npm run build` para regenerarlo.
- El juego también se puede publicar tal cual (por ejemplo en GitHub Pages): basta con `index.html`.

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
- **Condones 🎈**: moneda **compartida** entre los dos lados (el resto de recursos va por separado: cada lado paga con lo suyo). Se ganan al subir de nivel, al atrapar moscas, con los logros y a veces al hacer click. En la pestaña 🎈 Condones compran mejoras para **ambos** lados: mosca más potente, más larga, más frecuente y más dorada; clicks, fábricas, combos y piloto automático; y resistencia al sobreuso. Se conservan al hacer prestigio.
- **Sobreuso 🌡️**: cada lado tiene un termómetro. Si machacas un lado sin parar, se recalienta y le da un problema durante unos 25 s (al Cohete, dolor de huevos; a la Almeja, la regla): sus clicks rinden al 10 % y el piloto automático va a medias. A un ritmo normal no pasa nada.
- **Skins**: la mascota crece con cada nivel, cambia de paleta y accesorios cada 25 niveles y además luce lo que has comprado: antena (automatización), cinta (mejoras de click), ribete dorado, corazón (química), matamoscas (mejoras de la mosca) y globo-condón.
- **Offline**: al volver recibes lo producido mientras no estabas (máximo 8 h).
- **♻️ Reempezar con multiplicador** (desde el nivel 40 en cualquier lado): ambos lados vuelven al nivel 1, pero toda la producción (generadores, clicks y automatización) queda multiplicada para siempre. Cada punto da +25 %, y los puntos crecen más rápido que el nivel (por ejemplo, ambos lados al 60 dan ×3; al 200, ×13.5), así que aguantar más compensa. Se conservan los condones y sus mejoras, los logros y los ajustes. El botón ♻️ de la cabecera muestra el multiplicador actual y el que tendrías.
- **💞 Sexo, el paso final** (tras reempezar 3 veces): «La gran noche». Las dos mascotas se juntan en la cama del motel; hay que tocar al Cohete y a la Almeja **alternando y a ritmo** para llenar la barra de pasión (repetir lado la baja y, si paras, se enfría). Al llenarla: clímax final con fuegos artificiales y pantalla de final del juego. Recompensa permanente: toda la producción ×2 (×3, ×4… si lo repites) y +100 🎈. Todo pasa bajo las sábanas y con censura de broma.
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

Los sprites son placeholders procedurales dibujados en canvas (`src/ui/sprites.ts`). Para usar arte final, coloca en `assets/`:

- Un PNG por mascota (p. ej. `male.png`, `female.png`): una tira horizontal de **9 fotogramas cuadrados** (uno por etapa, cada 25 niveles: 0–24, 25–49, … 200). Se dibujan con píxeles nítidos; se recomienda 64×64 px por fotograma.
- Decláralos en `assets/assets.json`: `{ "male": "male.png", "female": "female.png" }`. Con `null` se usan los sprites procedurales.
- El arte externo solo se carga cuando el juego se sirve por http(s) (`npm run dev`, GitHub Pages…); abierto con doble clic se usan los sprites procedurales. Los fondos, partículas y la mosca siguen siendo procedurales (ver `sideView.ts` y `sprites.ts`).

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
