import { useEffect, useState } from "react";

export interface ExtractedColor {
  r: number;
  g: number;
  b: number;
}

function vibrantScore(r: number, g: number, b: number): number {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  if (max === 0) return 0;
  const saturation = (max - min) / max;
  // Favor saturated mid-bright colors; penalize near-black and near-white
  return saturation * max * (1 - Math.abs(max - 0.55) * 1.5);
}

function hashColor(str: string): ExtractedColor {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return {
    r: 80  + (Math.abs(h & 0xFF) % 120),
    g: 50  + (Math.abs((h >> 8) & 0xFF) % 100),
    b: 100 + (Math.abs((h >> 16) & 0xFF) % 120),
  };
}

export function useColorExtraction(imageUrl: string | undefined): ExtractedColor | null {
  const [color, setColor] = useState<ExtractedColor | null>(null);

  useEffect(() => {
    if (!imageUrl) { setColor(null); return; }

    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (cancelled) return;
      try {
        const SIZE = 80;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, SIZE, SIZE);
        const { data } = ctx.getImageData(0, 0, SIZE, SIZE);

        let bestR = 80, bestG = 80, bestB = 200, bestScore = -Infinity;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;
          const score = vibrantScore(r, g, b);
          if (score > bestScore) { bestScore = score; bestR = r; bestG = g; bestB = b; }
        }

        if (!cancelled) setColor({ r: bestR, g: bestG, b: bestB });
      } catch {
        if (!cancelled) setColor(hashColor(imageUrl));
      }
    };

    img.onerror = () => { if (!cancelled) setColor(null); };
    img.src = imageUrl;

    return () => { cancelled = true; };
  }, [imageUrl]);

  return color;
}
