// Bound recurring D1 metadata imports without truncating complete galleries.
export function assertImportBudget(galleries) {
  const imageCount = galleries.reduce(
    (total, gallery) => total + gallery.images.length,
    0,
  );
  if (galleries.length > 100 || imageCount > 1500) {
    throw new Error(
      `Scan exceeds the import budget (${galleries.length} galleries, ${imageCount} image entries; limits: 100 galleries, 1500 image entries). No galleries were imported. Review usage before increasing the limits.`,
    );
  }
  if (Buffer.byteLength(JSON.stringify(galleries), "utf8") > 2_000_000) {
    throw new Error(
      "Scan exceeds the 2 MB metadata import budget. No galleries were imported.",
    );
  }
}
