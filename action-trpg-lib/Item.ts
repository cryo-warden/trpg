type DecorInteraction = {};
type EquipmentItem = {} & (
  | {
      type: "armament";
      attack: number;
      armamentType: string; // TODO
    }
  | {
      type: "helmet" | "armor" | "cloak";
      defense: number;
    }
  | {
      type: "accessory";
    }
);

export type Item =
  | {
      type: "decor";
      description: string;
      interactions: DecorInteraction[];
    }
  | {
      type: "consumable";
      quantity: number;
    }
  | EquipmentItem;
