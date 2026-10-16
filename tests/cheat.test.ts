import { describe, expect, it } from 'vitest';
import { createState } from '../src/core/state';
import { deserialize, serialize } from '../src/core/save';
import { applyCheat } from '../src/systems/cheat';
import { doPrestige } from '../src/systems/prestige';

describe('código secreto', () => {
  it('sube ambos lados al nivel 39 y da recurso y condones', () => {
    const s = createState(0);
    expect(applyCheat(s, 'climax 39')).toBe('ok');
    expect(s.sides.male.level).toBe(39);
    expect(s.sides.female.level).toBe(39);
    expect(s.sides.male.resource.gt(0)).toBe(true);
    expect(s.condoms).toBeGreaterThan(0);
  });

  it('es de un solo uso, también tras guardar y reempezar', () => {
    const s = createState(0);
    applyCheat(s, 'CLIMAX39');
    s.sides.male.level = 40;
    doPrestige(s);
    const loaded = deserialize(serialize(s));
    expect(applyCheat(loaded, 'CLIMAX39')).toBe('used');
    expect(loaded.sides.male.level).toBe(1);
  });

  it('un código incorrecto no hace nada ni gasta el uso', () => {
    const s = createState(0);
    expect(applyCheat(s, 'CLIMAX40')).toBe('wrong');
    expect(s.sides.male.level).toBe(1);
    expect(applyCheat(s, 'CLIMAX39')).toBe('ok');
  });

  it('no baja de nivel a un lado que ya está más alto', () => {
    const s = createState(0);
    s.sides.female.level = 80;
    applyCheat(s, 'CLIMAX39');
    expect(s.sides.female.level).toBe(80);
    expect(s.sides.male.level).toBe(39);
  });
});
