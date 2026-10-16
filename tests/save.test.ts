import { describe, expect, it } from 'vitest';
import { D } from '../src/core/decimal';
import { createState } from '../src/core/state';
import { deserialize, exportSave, importSave, loadFromStorage, saveToStorage, serialize } from '../src/core/save';
import { click } from '../src/systems/game';
import { doPrestige, prestigePointsOnReset, canPrestige } from '../src/systems/prestige';
import { computeRates } from '../src/systems/production';

class MemoryStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
  key() { return null; }
  get length() { return this.m.size; }
}

describe('guardado', () => {
  it('un click suma recurso, se guarda y se carga', () => {
    const storage = new MemoryStorage() as unknown as Storage;
    const s = createState(0);
    click(s, 'male');
    click(s, 'male');
    saveToStorage(s, storage);
    const loaded = loadFromStorage(storage)!;
    expect(loaded.sides.male.resource.toNumber()).toBe(s.sides.male.resource.toNumber());
    expect(loaded.sides.male.clicks).toBe(2);
  });

  it('conserva números enormes', () => {
    const s = createState(0);
    s.sides.female.resource = D('1.5e5000');
    const back = deserialize(serialize(s));
    expect(back.sides.female.resource.eq(D('1.5e5000'))).toBe(true);
  });

  it('exportar e importar devuelve la misma partida', () => {
    const s = createState(0);
    s.sides.male.generators.g1 = 7;
    s.sides.male.upgrades.c_add = 3;
    s.achievements.clk1 = true;
    s.settings.notation = 'scientific';
    const back = importSave(exportSave(s));
    expect(back.sides.male.generators.g1).toBe(7);
    expect(back.sides.male.upgrades.c_add).toBe(3);
    expect(back.achievements.clk1).toBe(true);
    expect(back.settings.notation).toBe('scientific');
  });

  it('rechaza texto inválido', () => {
    expect(() => importSave('esto no es una partida')).toThrow();
  });

  it('rellena campos que falten en partidas antiguas', () => {
    const back = deserialize(JSON.stringify({ sides: { male: { level: 3 } } }));
    expect(back.sides.male.level).toBe(3);
    expect(back.sides.female.level).toBe(1);
    expect(back.settings.qteEnabled).toBe(true);
  });
});

describe('prestigio', () => {
  it('se puede reempezar desde el nivel 40 y da más puntos cuanto más lejos se llega', () => {
    const s = createState(0);
    s.sides.male.level = 39;
    expect(canPrestige(s)).toBe(false);
    s.sides.male.level = 40;
    expect(canPrestige(s)).toBe(true);
    const at40 = prestigePointsOnReset(s);
    expect(at40).toBeGreaterThanOrEqual(2);
    s.sides.male.level = 80;
    expect(prestigePointsOnReset(s)).toBeGreaterThan(at40 * 2);
  });

  it('da bonus permanente y conserva condones y logros', () => {
    const s = createState(0);
    s.achievements.clk1 = true;
    s.condoms = 7;
    s.sides.male.level = 200;
    s.sides.female.level = 60;
    // floor(10^1.4) + floor(3^1.4) = 25 + 4
    expect(prestigePointsOnReset(s)).toBe(25 + 4);
    s.sides.male.generators.g1 = 1;
    const ppsBefore = computeRates(s, 'male').pps;
    doPrestige(s);
    expect(s.prestigePoints).toBe(29);
    expect(s.sides.male.level).toBe(1);
    expect(s.condoms).toBe(7);
    expect(s.achievements.clk1).toBe(true);
    s.sides.male.generators.g1 = 1;
    s.sides.male.level = 200;
    expect(computeRates(s, 'male').pps.gt(ppsBefore)).toBe(true);
  });
});
