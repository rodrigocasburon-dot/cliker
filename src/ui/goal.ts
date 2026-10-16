import { formatDuration, formatNumber } from '../core/format';
import type { GameState, SideId } from '../core/state';
import { BALANCE } from '../data/balance';
import { ES, t } from '../i18n/es';
import { canPrestige } from '../systems/prestige';
import { bestPurchase, estimatedIncome } from '../systems/shop';
import { genName, upgradeTitle } from './shop';
import { UPGRADE_BY_ID } from '../data/upgrades';
import type { Purchase } from '../systems/shop';

function purchaseName(side: SideId, p: Purchase): string {
  return p.kind === 'gen' ? genName(side, p.id) : upgradeTitle(UPGRADE_BY_ID[p.id], side)[0];
}

/** Texto del «siguiente objetivo» para un lado: qué persigo y por qué. */
export function nextGoal(state: GameState, id: SideId): string {
  const side = state.sides[id];
  if (canPrestige(state)) {
    const both = state.sides.male.level >= BALANCE.maxLevel && state.sides.female.level >= BALANCE.maxLevel;
    return both ? ES.ui.goalDone : ES.ui.goalPrestige;
  }
  const nt = state.settings.notation;
  const best = bestPurchase(state, id, false);
  const milestone = BALANCE.milestones.find((m) => m > side.level);
  const parts: string[] = [];
  if (best) {
    const missing = best.cost.sub(side.resource);
    const name = purchaseName(id, best.purchase);
    if (missing.lte(0)) parts.push(t(ES.ui.goalAffordable, { what: `${name} (${formatNumber(best.cost, nt)})` }));
    else {
      const inc = estimatedIncome(state, id);
      const secs = inc.gt(0) ? missing.div(inc).toNumber() : Infinity;
      parts.push(t(ES.ui.goalSave, { what: name, t: formatDuration(secs) }));
    }
  }
  if (milestone) parts.push(t(ES.ui.goalLevel, { n: milestone, side: ES.sides[id].mascot, what: ES.ui.milestone[milestone] }));
  return parts.join(' · ');
}
