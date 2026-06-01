import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import {
  deleteListingDir,
  isValidImageFile,
  saveListingPhotos,
} from "./uploads";

const TEST_ID = "__test__listing";

afterAll(async () => {
  await deleteListingDir(TEST_ID);
});

async function makeImageFile(): Promise<File> {
  // Image 2000x1500 → doit être réduite et convertie en WebP.
  const png = await sharp({
    create: {
      width: 2000,
      height: 1500,
      channels: 3,
      background: { r: 200, g: 60, b: 60 },
    },
  })
    .png()
    .toBuffer();
  return new File([new Uint8Array(png)], "photo.png", { type: "image/png" });
}

describe("isValidImageFile", () => {
  it("accepte une image PNG de taille correcte", async () => {
    expect(isValidImageFile(await makeImageFile())).toBe(true);
  });

  it("rejette un fichier non-image", () => {
    const txt = new File([new TextEncoder().encode("bonjour")], "note.txt", {
      type: "text/plain",
    });
    expect(isValidImageFile(txt)).toBe(false);
  });

  it("rejette un fichier vide", () => {
    expect(isValidImageFile(new File([], "x.png", { type: "image/png" }))).toBe(
      false,
    );
  });
});

describe("saveListingPhotos", () => {
  it("compresse en WebP ≤ 1280px et écrit le fichier", async () => {
    const file = await makeImageFile();
    const [publicPath, ...rest] = await saveListingPhotos(TEST_ID, [file]);

    expect(rest).toHaveLength(0);
    expect(publicPath).toMatch(
      new RegExp(`^/uploads/listings/${TEST_ID}/.+\\.webp$`),
    );

    const absolute = path.join(process.cwd(), "public", publicPath);
    expect(existsSync(absolute)).toBe(true);

    const meta = await sharp(absolute).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(1280); // 2000 réduit à 1280 (fit inside)
  });
});
