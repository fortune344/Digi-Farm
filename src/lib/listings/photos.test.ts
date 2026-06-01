import { describe, expect, it } from "vitest";
import { computeKeptPhotos, isWithinPhotoLimit } from "./photos";

describe("computeKeptPhotos", () => {
  it("retire les photos marquées pour suppression", () => {
    expect(computeKeptPhotos(["a", "b", "c"], ["b"])).toEqual(["a", "c"]);
  });

  it("ignore les chemins inconnus et préserve l'ordre", () => {
    expect(computeKeptPhotos(["a", "b"], ["x"])).toEqual(["a", "b"]);
  });

  it("peut tout retirer", () => {
    expect(computeKeptPhotos(["a"], ["a"])).toEqual([]);
  });
});

describe("isWithinPhotoLimit", () => {
  it("accepte un total jusqu'à 5", () => {
    expect(isWithinPhotoLimit(2, 3)).toBe(true);
    expect(isWithinPhotoLimit(5, 0)).toBe(true);
    expect(isWithinPhotoLimit(0, 0)).toBe(true);
  });

  it("refuse un total supérieur à 5", () => {
    expect(isWithinPhotoLimit(3, 3)).toBe(false);
    expect(isWithinPhotoLimit(5, 1)).toBe(false);
  });
});
