import { SIDES, type GameState } from '../core/state';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { BALANCE } from '../data/balance';
import { GENERATORS } from '../data/generators';
import { UPGRADES } from '../data/upgrades';
import { addXp, xpForLevel } from './levels';

export function achievementProgress(state: GameState, a: AchievementDef): number {
  const s = SIDES.map((id) => state.sides[id]);
  const c = a.cond;
  switch (c.type) {
    case 'clicks': return s[0].clicks + s[1].clicks;
    case 'produced': return state.stats.lifetimeProduced.toNumber();
    case 'level': return Math.max(s[0].level, s[1].level);
    case 'bothLevel': return Math.min(s[0].level, s[1].level);
    case 'flies': return state.stats.flies;
    case 'goldenFlies': return state.stats.goldenFlies;
    case 'generators': return s.reduce((t, side) => t + GENERATORS.reduce((u, g) => u + (side.generators[g.id] ?? 0), 0), 0);
    case 'choices': return s.reduce((t, side) => t + UPGRADES.filter((u) => u.group && (side.upgrades[u.id] ?? 0) > 0).length, 0);
    case 'prestiges': return state.stats.prestiges;
  }
}

/** Comprueba logros nuevos; cada uno da XP a ambos lados. Devuelve los desbloqueados. */
export function checkAchievements(state: GameState): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (state.achievements[a.id]) continue;
    if (achievementProgress(state, a) >= a.cond.value) {
      state.achievements[a.id] = true;
      unlocked.push(a);
      for (const id of SIDES) {
        const side = state.sides[id];
        addXp(side, xpForLevel(side.level).mul(BALANCE.xp.achievementFraction));
      }
    }
  }
  return unlocked;
}
