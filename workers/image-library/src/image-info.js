export function imageInfo(bytes) {
  const b = new Uint8Array(bytes),
    v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let width, height, mime;
  if (
    b.length >= 33 &&
    b.slice(0, 8).every((n, i) => n === [137, 80, 78, 71, 13, 10, 26, 10][i]) &&
    String.fromCharCode(...b.slice(12, 16)) === "IHDR"
  ) {
    mime = "image/png";
    width = v.getUint32(16);
    height = v.getUint32(20);
  } else if (
    b.length >= 30 &&
    String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...b.slice(8, 12)) === "WEBP" &&
    v.getUint32(4, true) + 8 === b.length
  ) {
    mime = "image/webp";
    const chunk = String.fromCharCode(...b.slice(12, 16));
    if (chunk === "VP8X") {
      width = 1 + b[24] + (b[25] << 8) + (b[26] << 16);
      height = 1 + b[27] + (b[28] << 8) + (b[29] << 16);
    } else if (chunk === "VP8L" && b[20] === 47) {
      width = 1 + b[21] + ((b[22] & 63) << 8);
      height = 1 + (b[22] >> 6) + (b[23] << 2) + ((b[24] & 15) << 10);
    } else if (
      chunk === "VP8 " &&
      b[23] === 157 &&
      b[24] === 1 &&
      b[25] === 42
    ) {
      width = v.getUint16(26, true) & 16383;
      height = v.getUint16(28, true) & 16383;
    }
  } else if (
    b.length >= 32 &&
    String.fromCharCode(...b.slice(4, 8)) === "ftyp" &&
    /avif|avis/.test(String.fromCharCode(...b.slice(8, 32)))
  ) {
    mime = "image/avif";
    for (let offset = 4; offset + 16 <= b.length; offset++)
      if (
        b[offset] === 105 &&
        b[offset + 1] === 115 &&
        b[offset + 2] === 112 &&
        b[offset + 3] === 101 &&
        v.getUint32(offset - 4) >= 20
      ) {
        width = v.getUint32(offset + 8);
        height = v.getUint32(offset + 12);
        break;
      }
  } else if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    mime = "image/jpeg";
    let offset = 2;
    while (offset + 4 <= b.length) {
      if (b[offset++] !== 255) break;
      while (b[offset] === 255) offset++;
      const marker = b[offset++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (offset + 2 > b.length) break;
      const length = v.getUint16(offset);
      if (length < 2 || offset + length > b.length) break;
      if ([192, 193, 194].includes(marker) && length >= 8) {
        height = v.getUint16(offset + 3);
        width = v.getUint16(offset + 5);
        break;
      }
      offset += length;
    }
  }
  if (
    !mime ||
    !width ||
    !height ||
    width > 8192 ||
    height > 8192 ||
    width * height > 16_000_000
  )
    throw Object.assign(
      new Error(
        "Upload a valid PNG, JPEG, or WebP with at most 16 million pixels.",
      ),
      { status: 415 },
    );
  return { width, height, mime };
}
