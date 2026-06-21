import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

const SVG_CONTENT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Vibrant indigo gradient for background -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#4f46e5" />
    </linearGradient>
    
    <!-- Gold gradient for bookmark/accents -->
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fbbf24" />
      <stop offset="100%" stop-color="#d97706" />
    </linearGradient>

    <!-- Page split shadow -->
    <linearGradient id="pageShadow" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="rgba(0, 0, 0, 0.15)" />
      <stop offset="100%" stop-color="rgba(0, 0, 0, 0)" />
    </linearGradient>

    <!-- Deep professional drop shadow for the notebook -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#1e1b4b" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Complete edge-to-edge background -->
  <rect width="512" height="512" fill="url(#bgGrad)" />

  <!-- Embedded Artwork group (fully inside the 60% safe zone: x/y from 102 to 410) -->
  <g filter="url(#shadow)">
    <!-- Main Notebook Cover (Darker indigo/slate backing) -->
    <rect x="120" y="120" width="272" height="272" rx="24" fill="#1e1b4b" />
    
    <!-- Left Hand Page Cover backing (shows as subtle borders) -->
    <rect x="128" y="124" width="124" height="264" rx="16" fill="#4338ca" />
    <!-- Right Hand Page Cover backing -->
    <rect x="260" y="124" width="124" height="264" rx="16" fill="#4338ca" />

    <!-- Left Page Inner (subtle off-white/light gray) -->
    <rect x="134" y="132" width="114" height="248" rx="12" fill="#fafafa" />
    <!-- Right Page Inner (pure white) -->
    <rect x="264" y="132" width="114" height="248" rx="12" fill="#ffffff" />

    <!-- Spine shadow on the right page to give depth -->
    <rect x="264" y="132" width="16" height="248" fill="url(#pageShadow)" />

    <!-- Elegant Gold Ribbon Bookmark dropping on Right Page -->
    <path d="M 290 132 L 290 280 L 305 264 L 320 280 L 320 132 Z" fill="url(#goldGrad)" opacity="0.95" />

    <!-- Stylized notebook ruling (Left page) -->
    <rect x="154" y="170" width="74" height="6" rx="3" fill="#e2e8f0" />
    <rect x="154" y="200" width="74" height="6" rx="3" fill="#e2e8f0" />
    <rect x="154" y="230" width="74" height="6" rx="3" fill="#e2e8f0" />
    <rect x="154" y="260" width="74" height="6" rx="3" fill="#e2e8f0" />
    <rect x="154" y="290" width="74" height="6" rx="3" fill="#e2e8f0" />
    <rect x="154" y="320" width="74" height="6" rx="3" fill="#e2e8f0" />

    <!-- Stylized notebook ruling (Right page, respecting the bookmark) -->
    <rect x="330" y="170" width="32" height="6" rx="3" fill="#f1f5f9" />
    <rect x="330" y="200" width="32" height="6" rx="3" fill="#f1f5f9" />
    <rect x="330" y="230" width="32" height="6" rx="3" fill="#f1f5f9" />
    <rect x="330" y="260" width="32" height="6" rx="3" fill="#f1f5f9" />
    <rect x="284" y="290" width="78" height="6" rx="3" fill="#f1f5f9" />
    <rect x="284" y="320" width="78" height="6" rx="3" fill="#f1f5f9" />

    <!-- Wire spiral notebook rings (centered on spine) -->
    <!-- Ring 1 -->
    <rect x="246" y="152" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="156" width="12" height="4" rx="2" fill="#cbd5e1" />
    
    <!-- Ring 2 -->
    <rect x="246" y="184" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="188" width="12" height="4" rx="2" fill="#cbd5e1" />

    <!-- Ring 3 -->
    <rect x="246" y="216" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="220" width="12" height="4" rx="2" fill="#cbd5e1" />

    <!-- Ring 4 -->
    <rect x="246" y="248" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="252" width="12" height="4" rx="2" fill="#cbd5e1" />

    <!-- Ring 5 -->
    <rect x="246" y="280" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="284" width="12" height="4" rx="2" fill="#cbd5e1" />

    <!-- Ring 6 -->
    <rect x="246" y="312" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="316" width="12" height="4" rx="2" fill="#cbd5e1" />

    <!-- Ring 7 -->
    <rect x="246" y="344" width="20" height="12" rx="6" fill="#94a3b8" />
    <rect x="250" y="348" width="12" height="4" rx="2" fill="#cbd5e1" />
  </g>
</svg>
`;

async function main() {
  const publicDir = join(process.cwd(), 'public');
  await mkdir(publicDir, { recursive: true });

  // For standard transparent icons, we strip out the background <rect>
  const transparentSvgContent = SVG_CONTENT.replace('<rect width="512" height="512" fill="url(#bgGrad)" />', '');
  const transparentSvgBuffer = Buffer.from(transparentSvgContent.trim());
  const maskableSvgBuffer = Buffer.from(SVG_CONTENT.trim());

  console.log('Generating PWA icons...');

  // 1. Generate transparent pwa-icon-192.png (192x192)
  console.log(' - Generating transparent pwa-icon-192.png (180px apple touch equivalent & normal)...');
  await sharp(transparentSvgBuffer)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'pwa-icon-192.png'));

  // 2. Generate transparent pwa-icon-512.png (512x512)
  console.log(' - Generating transparent pwa-icon-512.png...');
  await sharp(transparentSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'pwa-icon-512.png'));

  // 3. Generate pwa-maskable-512.png (512x512 with safe area and styled solid/gradient background)
  // Note: Maskable icons MUST have a solid/filled background (no transparency) per PWA specs
  console.log(' - Generating filled background pwa-maskable-512.png...');
  await sharp(maskableSvgBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'pwa-maskable-512.png'));

  console.log('Successfully generated all PWA icons under public/! ✨');
}

main().catch((err) => {
  console.error('Failed to generate PWA icons:', err);
  process.exit(1);
});
