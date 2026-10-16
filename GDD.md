# GDD — Clicker Clímax

## 1. Concepto
Clicker/idle +18 de humor cartoon. Dos fábricas paralelas:

| Lado | Mascota | Recurso (interno / visible) | Estética |
|---|---|---|---|
| Masculino | Cohete con cara | `semen` / «Semen» | cielo nocturno, planetas, chorro de gotas blancas desde el morro |
| Femenino | Almeja con perla sonriente | `squirt` / «Squirt» | atardecer rosa, corazones, chorro de gotas aguamarina |

Cada click provoca el «clímax» cómico de la mascota: squash & stretch, gotas con gravedad que salpican el suelo, onomatopeyas («¡PLOF!», «¡FSSSH!») y números flotantes. Nada explícito: todo son metáforas visuales. Pantalla de confirmación de edad al entrar. Todos los textos visibles están en `src/i18n/es.ts`.

## 2. Bucle de juego
```
click / automatización / generadores ──► recurso ──► compras (click, generadores, multiplicadores)
        ▲                                   │
        │                                   └──► XP (1 recurso = 1 XP) ──► niveles (200 por lado)
        │                                                                     │
        └────────── desbloqueos, etapas visuales, hitos, logros ◄────────────┘
                                                                              │
                                              nivel 200 en un lado ──► prestigio (+25 %/punto)
```

## 3. Ritmo (objetivos y resultado del simulador)
Objetivos del prompt y resultado de `npm run sim` (estrategia «óptimo», jugador normal: 4 clicks/s la primera media hora, luego 1/s hasta las 4 h y después 0.4/s; atrapa el 70 % de las moscas):

| Hito | Objetivo | Simulado |
|---|---|---|
| Primera compra | < 10 s | 8 s ✔ |
| Primer hito (nivel 10, automatización) | < 3 min | 1 min 42 s ✔ |
| Nivel 25 | — | 5 min 54 s |
| Nivel 50 | 3–5 h | 3 h 29 min ✔ |
| Nivel 100 | — | 16 h 44 min |
| Nivel 150 | — | 25 h 16 min |
| Nivel 200 | varias decenas de horas | 35 h 30 min ✔ |

Tiempo por nivel (lado masculino, minutos): nivel 10 → 0.1 · 25 → 0.4 · 30 → 2 · 40 → 6 · 50 → 17 · 60 → 15 · 80 → 12 · 100 → 7–14 · 150 → 6–12 · 200 → 12–27. Es decir: arranque en segundos, una subida fuerte entre los niveles 30 y 50 (aquí entran la planificación y la gestión de los dos lados) y después un ritmo estable de 10–20 min por nivel, con picos breves justo antes de cada nuevo generador. Sin muros: ningún nivel supera los 30 min en la partida simulada. El offline (tope 8 h) y el jugador activo acortan estos tiempos (ver §6).

## 4. Mecánicas

### 4.1 Click y combo
- Valor por click = (1 + «Dedos ágiles») × mejoras de click × logros × prestigio + un % de la producción/s («Muñecas» y algunas elecciones A).
- El click **no** se multiplica por el nivel ni por las mejoras globales: así nunca eclipsa a los generadores y el % de producción lo mantiene relevante todo el juego.
- Combo: cada click a menos de 0.45 s del anterior suma un stack (+2 % por stack, máximo 25; ampliable a 50/100 con mejoras). Se pierde al parar.

### 4.2 XP, niveles y etapas
- XP = recurso producido (por cualquier fuente) + 25 % del nivel actual por cada logro.
- `xp(n) = 60 · 1.3^n` para pasar del nivel n al n+1 (ver DECISIONES: el 1.12 del ejemplo hacía la producción casi plana).
- Cada nivel multiplica ×1.03 la producción de los generadores.
- Etapa visual cada 25 niveles (9 etapas: Novato → Cósmico): cambia la paleta y aparecen gafas de sol, banda/lazo, cadena de oro, corona, aura, halo y brillo cósmico.
- Hitos: 10 (automatización), 25 (asesor «comprar la mejor» y etapa), 50 (moscas doradas, nuevos generadores), 100, 150 (generadores cósmicos), 200 (prestigio). Cada uno se anuncia con un aviso grande.

### 4.3 Mejoras (tres familias)
1. **Click**: «Dedos ágiles» (+1, ×10), «Técnica depurada» (×1.5 repetible), «Muñecas» (+% de producción por click), combos, automatización y «Turbo» (+1 click automático/s, ×6), asesor.
2. **Generadores**: 12 por lado, desbloqueados en los niveles 1, 4, 10, 18, 28, 40, 55, 72, 92, 115, 140 y 170. Coste `base · 1.15^cantidad`; compra ×1/×10/Máx.
3. **Multiplicadores**: 19 afrodisíacos globales (×1.5/×2), «×2» por generador al tener 10/25/50/100/150/200 unidades, **Química de pareja** (sinergia: +0.3 % por cada nivel del otro lado y por nivel de mejora, hasta ×10) y 5 **elecciones excluyentes**:

| Nivel | A (activo) | B (pasivo) |
|---|---|---|
| 14 | Manitas: click ×3, +2 % de producción por click, generadores ×0.85 | Paciencia: generadores ×1.5, click ×0.7 |
| 40 | Amor propio: producción ×1.6 | Pareja abierta: química ×1.8 (mejor a la larga si se equilibran los lados) |
| 80 | Señor de las moscas: moscas ×1.4 más frecuentes, efecto ×2 de largo, piloto ×1.2 | Constancia: piloto automático ×1.5 siempre |
| 120 | Frenesí: combo máx. +50, bonus de combo ×2, +7 % de producción por click | Rentista: generadores ×1.35 |
| 170 | Clímax total: +8 % de producción por click, piloto ×1.5 | Producción en cadena: generadores ×1.6 |

Precios: expresados como «niveles de producción» a su nivel de desbloqueo (`at(nivel, k)` = k · xp(nivel)), de modo que siguen siendo coherentes si se cambia la curva.

**Retorno estimado**: cada compra muestra `ingreso antes/s → después/s` (pasivo + automático + clicks al ritmo real del jugador), el tiempo de amortización (coste / ganancia) y, si aún no se puede pagar, cuánto falta. La ⭐ marca la compra con menor «espera + amortización». Las elecciones A/B muestran lado a lado la ganancia de cada opción con el ritmo actual.

### 4.4 Automatización y mosca
- Automatización (nivel 10): 2 clicks automáticos/s, ampliable con «Turbo» y elecciones.
- Mosca: aparece cada 30–90 s (aleatorio), vuela con trayectoria errática por toda la pantalla durante 7 s y zumba.
  - Con la automatización desbloqueada: **velocidad automática ×1.5 durante 30 s** (verificado por test). Atrapar otra durante el efecto lo alarga.
  - Sin automatización: ráfaga de 20 s de producción (mínimo 25 clicks).
  - Mosca dorada (desde el nivel 50, 12 %): ráfaga ×8 y efecto de doble duración.
- Accesibilidad: área de toque grande; desactivar moscas → la automatización recibe ×1.15 fijo.

### 4.5 Offline, prestigio y logros
- Offline: producción pasiva + automatización mientras no se juega (también con la pestaña oculta), con tope de 8 h y aviso de bienvenida con lo ganado y los niveles subidos.
- Prestigio: con un lado al nivel 200. Puntos = Σ floor(nivel / 20) por lado (20 con ambos al 200). Cada punto: +25 % a toda la producción para siempre.
- 36 logros (clicks, producción total, niveles, ambos lados, moscas, moscas doradas, generadores, elecciones, prestigios): +2 % de producción cada uno y XP extra.

## 5. Los cuatro pilares (implementación)
1. **Ritmo de recompensas**: primera compra a los 8 s, nueva mejora o generador cada pocos segundos durante los primeros minutos, automatización antes de 2 min. Después las compras son más caras y espaciadas (tabla §3) y los objetivos piden planificar: ahorrar para el siguiente generador, elegir A/B, equilibrar lados.
2. **Decisiones significativas**: elecciones excluyentes con trade-offs activo/pasivo, sinergia que premia equilibrar ambos lados, generadores viejos que pierden rentabilidad frente a los nuevos (mismo coste ×1.15 pero menos multiplicador relativo) y mejoras baratas de poco impacto frente a caras de mucho. Ver análisis §6.
3. **Cambios de ritmo**: interacción activa (clicks, combos, moscas) → gestión (tienda, elecciones, dos lados) → progreso automático (generadores, automatización, offline). Cada tramo trae algo nuevo: generadores en 4, 10, 18…; automatización en 10; química en 20; asesor en 25; mosca dorada en 50; elecciones en 14/40/80/120/170; prestigio en 200.
4. **Progreso comprensible**: barra de XP con cifras, nivel y etapa siempre visibles; «Siguiente objetivo» destacado (qué comprar o para qué ahorrar y cuánto falta, y el próximo hito); efecto exacto antes → después en cada compra; desglose de producción por fuente y de multiplicadores en «Estadísticas»; avisos al subir de nivel, desbloquear generadores, etapas, hitos y logros.

## 6. Análisis: no hay una estrategia trivial dominante
`npm run sim -- --strategy=todas` (y `--play=activo` para un jugador que hace 6 clicks/s todo el tiempo). Tiempo de juego del lado masculino:

**Jugador normal** (activo la primera media hora, después casual):

| Estrategia | Nivel 25 | Nivel 50 | Nivel 100 | Nivel 150 | Nivel 200 |
|---|---|---|---|---|---|
| Óptimo (mejor retorno; elige A/B según su ritmo de la próxima hora) | 5 min 54 s | 3 h 29 min | 16 h 44 min | 25 h 16 min | 35 h 30 min |
| Comprar siempre lo más barato | 17 min 37 s | 5 h 53 min | 2 d 7 h | — | — |
| Solo generadores | 1 h 18 min | — | — | — | — |
| Siempre A (activo) | 5 min 54 s | 3 h 29 min | 16 h 17 min | 24 h 10 min | 33 h 23 min |
| Siempre B (pasivo) | 10 min 36 s | 3 h 43 min | 15 h | 21 h 23 min | 30 h 17 min |
| Un solo lado | 3 min 31 s | 3 h 37 min | 23 h 43 min | 43 h 58 min | 3 d 8 h |

**Jugador activo** (6 clicks/s todo el tiempo, mantiene el combo):

| Estrategia | Nivel 25 | Nivel 50 | Nivel 100 | Nivel 150 | Nivel 200 |
|---|---|---|---|---|---|
| Óptimo | 3 min 58 s | 2 h 51 min | 15 h 29 min | 22 h 16 min | 29 h 58 min |
| Comprar siempre lo más barato | 6 min 46 s | 4 h 38 min | 2 d 19 h | — | — |
| Solo generadores | 1 h 7 min | — | — | — | — |
| Siempre A (activo) | 3 min 58 s | 2 h 51 min | 14 h 59 min | 21 h 28 min | 28 h 42 min |
| Siempre B (pasivo) | 8 min 24 s | 3 h 27 min | 13 h 35 min | 19 h 51 min | 28 h 4 min |
| Un solo lado | 2 min 45 s | 2 h 46 min | 20 h 13 min | 34 h 23 min | 2 d 7 h |

(«—»: no llega en 100 h de juego.)

Conclusiones:
- **Comprar siempre lo más barato** es mucho más lento (llega al 50 tarde y no alcanza el 200 en 100 h): las mejoras baratas suelen ser generadores viejos con mal retorno. Hay que comparar el retorno estimado.
- **Solo generadores** (sin mejoras de click ni multiplicadores) se atasca en los primeros niveles.
- **Un solo lado** va más rápido al principio (concentra los clicks) pero pierde la sinergia y llega al 200 casi el doble de tarde: compensa cuidar ambos.
- **Siempre A / siempre B**: ninguna domina. A es claramente mejor al principio (nivel 25 casi el doble de rápido) y B a la larga; para un jugador activo acaban empatadas (28 h 42 min frente a 28 h 4 min) y para uno casual B gana un ~10 %. El bot «óptimo», que elige en cada tramo lo que más rinde a su ritmo de la próxima hora, no siempre acierta: la mejor elección depende de cómo vas a jugar, que es justo la decisión que queremos.

## 7. Interfaz
- Escritorio: lado masculino | tienda | lado femenino. Móvil: ambos lados arriba, la tienda debajo.
- Cada lado: recurso, producción/s, nivel y etapa, barra de XP, valor por click y combo, chips de automatización y efecto de la mosca.
- Tienda: selector de lado (con punto verde si hay algo asequible), pestañas Click / Generadores / Multiplicadores / Logros / Estadísticas / Ajustes, ×1/×10/Máx y «Comprar la mejor».
- Tutorial de 5 burbujas (≈ 2 min) que avanza solo al hacer lo que pide; se puede saltar y repetir.
- Feedback: partículas, números flotantes, onomatopeyas, sacudida leve (desactivable), avisos y sonidos.

## 8. Arte y audio
- Pixel art procedural a 120×120 px por lado, escalado con `image-rendering: pixelated`. Paleta limitada por lado y etapa. Fondo con parallax (estrellas/planetas o corazones a distintas velocidades) y suelo animado.
- Sprites sustituibles: ver README («Cómo sustituir el arte»).
- Audio Web Audio API: clicks con tono distinto por lado, compra, nivel, etapa, logro, zumbido de la mosca, captura, mosca dorada, prestigio y un bucle chiptune (bajo triangular + melodía cuadrada + hi-hat de ruido). Volumen de efectos y música y silencio.

## 9. Palancas de balance
Ver README («Cómo ajustar el balance»). Las principales: `xp.base`/`xp.growth` (escala y pendiente de la curva), `pace` de cada generador (ritmo de cada tramo), `levelGrowth`, multiplicadores globales y los efectos de las elecciones A/B.
