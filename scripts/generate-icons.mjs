// Generate PWA icons from the SVG template
// Run: node scripts/generate-icons.mjs

import { writeFileSync } from 'fs';

function createSvg(size) {
  const r = Math.round(size * 0.2);
  const fs = Math.round(size * 0.55);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="#dc2626"/>
  <text x="${size / 2}" y="${size / 2}" text-anchor="middle" dominant-baseline="central"
    font-family="Arial,sans-serif" font-size="${fs}" font-weight="bold" fill="white">P</text>
</svg>`;
}

// Write SVG files that can be used directly (browsers support SVG icons well now)
for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.svg`, createSvg(size));
  console.log(`Created public/icon-${size}.svg`);
}
