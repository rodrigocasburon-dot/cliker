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
| Primera compra | < 10 s | 7 s ✔ |
| Primer hito (nivel 10, automatización) | < 3 min | 1 min 57 s ✔ |
| Nivel 25 | — | 6 min 14 s |
| Nivel 50 | 3–5 h | 4 h 10 min ✔ |
| Nivel 100 | — | 23 h 12 min |
| Nivel 150 | — | 31 h 23 min |
| Nivel 200 | varias decenas de horas | 39 h 34 min ✔ |

Tiempo por nivel (lado masculino): segundos hasta el nivel 25, una subida fuerte entre el 30 y el 60 (hasta ~25 min por nivel: planificación, condones y equilibrio de lados) y después 4–10 min por nivel con picos breves antes de cada generador nuevo. El offline (tope 8 h) y el jugador activo acortan estos tiempos (ver §6).

## 4. Mecánicas

### 4.1 Click y combo
- Valor por click = (1 + «Dedos ágiles», +2 por nivel) × mejoras de click (×2 por nivel de «Técnica depurada», ×1.25 por «Doble capa») × logros × prestigio + un % de la producción/s («Muñecas» y algunas elecciones A).
- Cada click automático vale el 25 % de uno manual: los tuyos son los que más rinden.
- El click **no** se multiplica por el nivel ni por las mejoras globales: así nunca eclipsa a los generadores y el % de producción lo mantiene relevante todo el juego.
- Combo: cada click a menos de 0.45 s del anterior suma un stack (+4 % por stack, máximo 40; ampliable con mejoras y condones). Se pierde al parar o con un problema por sobreuso.

### 4.2 XP, niveles y etapas
- XP = recurso producido (por cualquier fuente) + 25 % del nivel actual por cada logro.
- `xp(n) = 300 · 1.3^n` para pasar del nivel n al n+1 (ver DECISIONES: el 1.12 del ejemplo hacía la producción casi plana).
- Cada nivel multiplica ×1.03 la producción de los generadores.
- Etapa visual cada 25 niveles (9 etapas: Novato → Cósmico): cambia la paleta y aparecen gafas de sol, banda/lazo, cadena de oro, corona, aura, halo y brillo cósmico.
- Hitos: 10 (automatización), 25 (asesor «comprar la mejor» y etapa), 50 (moscas doradas, nuevos generadores), 100, 150 (generadores cósmicos), 200 (prestigio). Cada uno se anuncia con un aviso grande.

### 4.3 Mejoras (tres familias)
1. **Click**: «Dedos ágiles» (+1, ×10), «Técnica depurada» (×1.5 repetible), «Muñecas» (+% de producción por click), combos, automatización y «Turbo» (+1 click automático/s, ×6), asesor.
2. **Generadores**: 12 por lado, desbloqueados en los niveles 1, 4, 10, 18, 28, 40, 55, 72, 92, 115, 140 y 170. Coste `base · 1.15^cantidad`; compra ×1/×10/Máx.
3. **Multiplicadores**: 19 afrodisíacos globales (×2/×3), mejoras por generador al tener 10/25/50/100/150/200 unidades (×2, ×2, ×2, ×3, ×3, ×4), **Química de pareja** (sinergia: +0.3 % por cada nivel del otro lado y por nivel de mejora, hasta ×10) y 5 **elecciones excluyentes**:

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

### 4.5 Condones 🎈 (moneda compartida)
- Es el único recurso común; semen y squirt siguen separados y cada lado compra con el suyo.
- Fuentes: +1 por nivel de cualquier lado (+5 en cada múltiplo de 10), +1 por mosca (+5 dorada), +3 por logro y un 0.4 % de probabilidad por click manual.
- Tienda propia (9 mejoras repetibles, coste ×1.45–1.7 por nivel) que afecta a ambos lados y se conserva al hacer prestigio:

| Mejora | Por nivel | Máx. |
|---|---|---|
| Mosca anabolizada | +0.1 al ×1.5 de la mosca | 10 (×2.5) |
| Mosca pegajosa | efecto ×1.2 más largo | 10 |
| Feromonas | moscas ×1.09 más frecuentes | 8 |
| Purpurina | +3 % moscas doradas | 8 |
| Doble capa | click ×1.25 | 15 |
| Lubricante industrial | generadores ×1.12 | 15 |
| Talla XXL | combo máx. +10 | 10 |
| Vibración incorporada | piloto automático ×1.1 | 10 |
| Resistencia | calor baja ×1.2 más rápido, problema ×0.88 | 8 |

En la partida simulada (con muchas moscas atrapadas) se ganan ~8 000 condones hasta el nivel 200: durante la mayor parte del juego no dan para todo y hay que elegir; al final se pueden completar casi todas.

### 4.6 Sobreuso: dolor de huevos / la regla
- Termómetro por lado: +3 por click manual, −14/s solo (≈ 4.7 clicks/s sostenibles por lado).
- Al llegar a 100: 25 s de problema (Cohete: dolor de huevos 🧊; Almeja: la regla 🩸). Clicks ×0.1, sin combo, automatización ×0.5. Aviso visual (vapor, barra roja) desde 70.
- Crea una decisión activa: el combo premia hacer clicks rápidos, el calor castiga pasarse. Alternar lados lo evita.

### 4.7 Skins
- Tamaño: +0.15 % por nivel (hasta +30 % en el 200). Paleta y accesorios de etapa cada 25 niveles.
- Accesorios por mejoras: antena (automatización), cinta (mejoras de click), ribete dorado (Técnica depurada ≥ 4), corazón (química), matamoscas (mejoras de mosca con condones), globo-condón (≥ 3 mejoras de condones).
- Estados: cara de «X X» con bolsa de hielo / de agua caliente durante el problema; vapor al recalentarse.
- Ropa atrevida por etapas: Cohete con bata de seda abierta (25+) y tanga de leopardo (75+); Almeja con liguero de encaje (50+) y borlas de burlesque (75+). El Cohete tiene dos depósitos redondos en la base y la Almeja labios carnosos, pestañas y guiños.
- Clímax exagerado: chorro mayor cuanto más combo, cara de éxtasis (ojos en blanco y lengua fuera) desde 12 de combo, corazones, gemidos escritos, censura de broma (barra «CENSURADO» y mosaico sobre el chorro) y salpicones que manchan la pantalla con combos altos.
- Escenario: habitación de motel con luz roja, papel pintado, neón «XXX» que parpadea, cortinas de terciopelo, cama con cabecero de corazón y moqueta.
- Todo es doble sentido y caricatura: no se dibujan genitales ni actos sexuales.

### 4.8 Offline, prestigio y logros
- Offline: producción pasiva + automatización mientras no se juega (también con la pestaña oculta), con tope de 8 h y aviso de bienvenida con lo ganado y los niveles subidos.
- **Reempezar con multiplicador** (prestigio): disponible con un lado al nivel 40. Puntos = Σ floor((nivel / 20)^1.4) por lado; cada punto +25 % a toda la producción para siempre. Ejemplos: ambos lados al 40 → 4 puntos (×2); al 60 → 8 (×3); al 100 → 18 (×5.5); al 200 → 50 (×13.5). Al ser más que lineal, aguantar más antes de reempezar compensa, y reempezar pronto sirve para salir de un tramo lento. Se conservan condones y sus mejoras, logros, estadísticas y ajustes.
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
| Óptimo (mejor retorno; elige A/B según su ritmo de la próxima hora) | 6 min 14 s | 4 h 10 min | 23 h 12 min | 31 h 23 min | 39 h 34 min |
| Comprar siempre lo más barato | 12 min 7 s | 7 h 49 min | 2 d 16 h | 4 d 3 h | — |
| Solo generadores | 21 h 38 min | — | — | — | — |
| Siempre A (activo) | 6 min 14 s | 4 h 10 min | 22 h 36 min | 29 h 34 min | 36 h 58 min |
| Siempre B (pasivo) | 14 min 38 s | 8 h 36 min | 23 h 40 min | 29 h 31 min | 35 h 29 min |
| Un solo lado | 1 min 49 s | 3 h 34 min | 28 h 59 min | 44 h 28 min | 2 d 15 h |

**Jugador activo** (6 clicks/s todo el tiempo, mantiene el combo):

| Estrategia | Nivel 25 | Nivel 50 | Nivel 100 | Nivel 150 | Nivel 200 |
|---|---|---|---|---|---|
| Óptimo | 1 min 55 s | 1 h 34 min | 17 h 46 min | 23 h 45 min | 28 h 44 min |
| Comprar siempre lo más barato | 3 min 37 s | 2 h 21 min | 2 d | 3 d 2 h | 3 d 22 h |
| Solo generadores | 9 h 25 min | — | — | — | — |
| Siempre A (activo) | 1 min 55 s | 1 h 34 min | 17 h 11 min | 22 h 24 min | 27 h 3 min |
| Siempre B (pasivo) | 4 min 52 s | 4 h 12 min | 17 h 59 min | 23 h | 27 h 52 min |
| Un solo lado | 1 min 17 s | 1 h 8 min | 20 h 8 min | 29 h 15 min | 39 h 37 min |

(«—»: no llega en 100 h de juego.)

Conclusiones:
- **Comprar siempre lo más barato** es mucho más lento (casi el doble hasta el 50 y no alcanza el 200 en 100 h jugando normal): las mejoras baratas suelen ser generadores viejos con mal retorno. Hay que comparar el retorno estimado.
- **Solo generadores** (sin mejoras de click ni multiplicadores) se atasca en los primeros niveles.
- **Un solo lado** va más rápido al principio (concentra los clicks) pero pierde la sinergia y llega al 200 casi el doble de tarde: compensa cuidar ambos.
- **Siempre A / siempre B**: ninguna domina. A es claramente mejor al principio (nivel 50 en la mitad de tiempo) y B alcanza a A más adelante; al nivel 200 quedan prácticamente empatadas (casual: 37 h frente a 35 h 29 min; activo: 27 h 3 min frente a 27 h 52 min). El bot «óptimo», que elige en cada tramo lo que más rinde a su ritmo de la próxima hora, no siempre acierta: la mejor elección depende de cómo vas a jugar, que es justo la decisión que queremos.

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
