/** Logros: cada uno da un bonus permanente de producción y XP a ambos lados (ver balance.ts). */
export type AchievementCond =
  | { type: 'clicks'; value: number }
  | { type: 'produced'; value: number }
  | { type: 'level'; value: number }
  | { type: 'bothLevel'; value: number }
  | { type: 'flies'; value: number }
  | { type: 'goldenFlies'; value: number }
  | { type: 'generators'; value: number }
  | { type: 'choices'; value: number }
  | { type: 'prestiges'; value: number };

export interface AchievementDef {
  id: string;
  cond: AchievementCond;
}

const make = (prefix: string, type: AchievementCond['type'], values: number[]): AchievementDef[] =>
  values.map((value, i) => ({ id: `${prefix}${i + 1}`, cond: { type, value } as AchievementCond }));

export const ACHIEVEMENTS: AchievementDef[] = [
  ...make('clk', 'clicks', [1, 100, 1000, 10000, 50000]),
  ...make('prd', 'produced', [100, 1e4, 1e6, 1e9, 1e12, 1e15, 1e20, 1e25]),
  ...make('lvl', 'level', [10, 25, 50, 100, 150, 200]),
  ...make('both', 'bothLevel', [25, 100, 200]),
  ...make('fly', 'flies', [1, 10, 50, 200]),
  ...make('gold', 'goldenFlies', [1, 10]),
  ...make('gen', 'generators', [10, 100, 500, 1000]),
  ...make('cho', 'choices', [1, 10]),
  ...make('pre', 'prestiges', [1, 5]),
];
