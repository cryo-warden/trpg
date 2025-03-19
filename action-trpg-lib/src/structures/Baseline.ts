import type { Engine } from "../Engine";
import type { Entity } from "../Entity";

export type Baseline = {
  mhp: number;
  mep: number;
  attack: number;
  defense: number;
};

export const applyBaseline = (
  engine: Engine,
  entity: Entity,
  baseline: Baseline
) => {
  if (entity.hp != null && entity.mhp != null) {
    entity.hp += baseline.mhp - entity.mhp;
  }
  engine.world.addComponent(entity, "mhp", baseline.mhp);
  engine.world.addComponent(entity, "hp", baseline.mhp);
  entity.mhp = baseline.mhp;

  if (entity.ep != null && entity.mep != null) {
    entity.ep += baseline.mep - entity.mep;
  }
  engine.world.addComponent(entity, "mep", baseline.mep);
  engine.world.addComponent(entity, "ep", baseline.mep);
  entity.mep = baseline.mep;

  engine.world.addComponent(entity, "attack", baseline.attack);
  entity.attack = baseline.attack;

  engine.world.addComponent(entity, "defense", baseline.defense);
  entity.defense = baseline.defense;
};

export const baseline = {
  human: { mhp: 5, mep: 5, attack: 0, defense: 0 },
  bat: { mhp: 3, mep: 2, attack: 0, defense: 0 },
  slime: { mhp: 1, mep: 1, attack: 0, defense: 0 },
} as const satisfies Record<string, Baseline>;
