// 画像をcanvasで縮小・圧縮してdata URLにする。
// メモに貼る画像がフル解像度のbase64のままだと保存ペイロードが肥大化し、
// クラウド保存(約4.5MB上限)やlocalStorage(約5MB)を超えて保存エラーになるため、
// 貼り付け・添付時にここを通して十分小さくする。

/** data URL を最大辺 maxDim・JPEG品質 quality で圧縮する。 */
export function compressDataUrl(dataUrl: string, maxDim = 1400, quality = 0.72): Promise<string> {
  return new Promise((resolve) => {
    // 画像でなければそのまま返す
    if (!/^data:image\//i.test(dataUrl)) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (!width || !height) { resolve(dataUrl); return; }
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      // 透過画像でもJPEGにすると背景が黒くなるため、白で塗ってから描画
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      try {
        const out = canvas.toDataURL("image/jpeg", quality);
        resolve(out.length < dataUrl.length ? out : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * 既にHTML内に埋め込まれている大きなインライン画像(data URL)を圧縮する。
 * 旧データで保存不能になったメモを開いたときに縮小して救済する用途。
 * 変更があれば true を返す（呼び出し側でコミットする）。
 */
export async function shrinkInlineImages(root: HTMLElement | null, maxLen = 300_000): Promise<boolean> {
  if (!root) return false;
  const imgs = Array.from(root.querySelectorAll("img"))
    .filter((im) => im.src.startsWith("data:image/") && im.src.length > maxLen);
  let changed = false;
  for (const im of imgs) {
    const out = await compressDataUrl(im.src);
    if (out !== im.src) { im.src = out; im.style.maxWidth = "100%"; changed = true; }
  }
  return changed;
}

/** File を読み込んで圧縮済み data URL を返す。 */
export function fileToCompressedDataUrl(file: File, maxDim = 1400, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => compressDataUrl(reader.result as string, maxDim, quality).then(resolve);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
