import { describe, it, expect } from "bun:test";
import { createEphemeralDictionary } from "../src/dictionary";

const samples = ["abc", "def", "ghi", "jkl", "mno", "pqr", "sto"];

const insertSamples = (d: { insert: (s: string) => void }) => {
  samples.forEach((s) => {
    d.insert(s);
  });
};

describe("dictionary", () => {
  describe("EphemeralDictionary", () => {
    describe("createEphemeralDictionary", () => {
      it("creates an object", () => {
        expect(createEphemeralDictionary()).toBeDefined();
      });
    });

    describe(".insert", () => {
      it("places values into the dictionary", () => {
        const d = createEphemeralDictionary<string>();
        insertSamples(d);
        const i = d.insert("some text");
        expect(i).toBe(samples.length);
      });
    });

    describe(".get", () => {
      it("retrieves expected values from the dictionary", () => {
        const d = createEphemeralDictionary<string>();
        insertSamples(d);
        const sampleI = "some text";
        const i = d.insert(sampleI);
        const sampleJ = "some different text";
        const j = d.insert(sampleJ);

        expect(d.get(i)).toBe(sampleI);
        expect(d.get(j)).toBe(sampleJ);
      });
    });

    describe(".compress", () => {
      it("retrieves expected values from the dictionary", () => {
        const d = createEphemeralDictionary<string>();
        insertSamples(d);
        const sampleI = "some text";
        const i = d.insert(sampleI);
        const sampleJ = "some different text";
        const j = d.insert(sampleJ);

        expect(d.get(i)).toBe(sampleI);
        expect(d.get(j)).toBe(sampleJ);

        const keepKeys = [2, 4, i, j];
        d.compress(keepKeys);

        expect(d.get(0)).toBe(samples[2]);
        expect(d.get(1)).toBe(samples[4]);
        expect(d.get(2)).toBe(sampleI);
        expect(d.get(3)).toBe(sampleJ);
        expect(d.get(4)).toBeUndefined();
      });
    });
  });
});
