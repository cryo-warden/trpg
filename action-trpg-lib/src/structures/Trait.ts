import type { Entity } from "../Entity";

export type Trait = {
  mhp: number;
  mep: number;
  attack: number;
  defense: number;
};

export const applyTrait = (entity: Entity, trait: Trait) => {
  if (entity.hp != null) {
    entity.hp += trait.mhp;
  }
  if (entity.mhp != null) {
    entity.mhp += trait.mhp;
  }
  if (entity.ep != null) {
    entity.ep += trait.mep;
  }
  if (entity.mep != null) {
    entity.mep += trait.mep;
  }
  if (entity.attack != null) {
    entity.attack += trait.attack;
  }
  if (entity.defense != null) {
    entity.defense += trait.defense;
  }
};

export const trait = {
  merge: (a: Trait, b: Trait) => ({
    mhp: a.mhp + b.mhp,
    mep: a.mep + b.mep,
    attack: a.attack + b.attack,
    defense: a.defense + b.defense,
  }),
  /** A completely neutral trait useful for trait composition.  */
  zero: { mhp: 0, mep: 0, attack: 0, defense: 0 },
  small: { mhp: -1, mep: -1, attack: 0, defense: 0 },
  hero: { mhp: 5, mep: 5, attack: 0, defense: 0 },
  champion: { mhp: 2, mep: 2, attack: 0, defense: 0 },
} as const satisfies Record<string, Trait | ((...args: any[]) => Trait)>;
