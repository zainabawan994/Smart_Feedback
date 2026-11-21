/** Browser-only: shrink a phone photo / screenshot to a JPEG data URL whose longest side is at most `maxSide` px.
 *  Phone images are 3-10 MB; this keeps uploads small (server actions accept 1 MB). */
export async function shrinkImage(file: File, maxSide: number, quality = 0.8) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}
