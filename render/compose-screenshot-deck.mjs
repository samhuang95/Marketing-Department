// screenshot-deck 範本：把 capture/ 拍到的原始 viewport 截圖，加上瀏覽器窗框，
// 排版成最終行銷素材。品牌色讀自 projects.json 的 brandKit.colors——
// sam-showcase 目前的三個值是直接從實際渲染出來的截圖用 sharp 取樣得到的真實值，
// 不是憑印象猜的（見 specs/task1.md 階段三備註）；換一個專案要重新取樣它自己的顏色，
// 不能沿用這組預設值（見下方 DEFAULT_BRAND 的用途）。
//
// 用法：node render/compose-screenshot-deck.mjs <專案名稱>

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { loadProject, REPO_ROOT } from "../scripts/lib/projects.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const projectName = process.argv[2];
if (!projectName) {
  console.error("用法：node render/compose-screenshot-deck.mjs <專案名稱>");
  process.exit(1);
}

// loadProject 會在 projects.json 裡找不到這個名稱時丟出錯誤——刻意不接住，
// 讓打錯字的情況直接失敗，而不是靜默建出一個沒註冊的 output 資料夾
const project = loadProject(projectName);

const RAW_DIR = path.join(REPO_ROOT, "capture", "output", projectName, "screenshots");
const OUT_DIR = path.join(REPO_ROOT, "output", projectName);

// 只在專案完全沒設定品牌色時使用的預設值（沿用 sam-showcase 取樣結果只是巧合，
// 不代表其他專案該套用同一組色票）
const DEFAULT_BRAND = { background: "#f6f4ee", accent: "#c8ff00", dark: "#0f0f0f" };
const colors = project.brandKit?.colors || {};
const BRAND = {
  background: colors.background || DEFAULT_BRAND.background,
  accent: colors.accent || DEFAULT_BRAND.accent,
  dark: colors.dark || DEFAULT_BRAND.dark,
};
if (!colors.background || !colors.accent || !colors.dark) {
  console.log(`[提醒] projects.json 裡 "${projectName}" 的 brandKit.colors 沒有完整設定，缺的欄位先用預設值代替`);
}

const PADDING = 60;
const CHROME_HEIGHT = 44;
const CORNER_RADIUS = 14;

function windowChromeSvg(width, height) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="round">
          <rect x="0" y="0" width="${width}" height="${height}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}" />
        </clipPath>
      </defs>
      <g clip-path="url(#round)">
        <rect x="0" y="0" width="${width}" height="${height}" fill="white" />
        <rect x="0" y="0" width="${width}" height="${CHROME_HEIGHT}" fill="${BRAND.dark}" />
        <circle cx="24" cy="${CHROME_HEIGHT / 2}" r="6" fill="#f2555a" />
        <circle cx="46" cy="${CHROME_HEIGHT / 2}" r="6" fill="#f5bd4f" />
        <circle cx="68" cy="${CHROME_HEIGHT / 2}" r="6" fill="#61c454" />
      </g>
      <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${CORNER_RADIUS}" ry="${CORNER_RADIUS}"
        fill="none" stroke="${BRAND.dark}" stroke-opacity="0.12" stroke-width="1" />
    </svg>
  `);
}

async function composeOne(inputFile, outputFile) {
  const shot = sharp(inputFile);
  const meta = await shot.metadata();
  const shotBuffer = await shot.toBuffer();

  const frameWidth = meta.width;
  const frameHeight = meta.height + CHROME_HEIGHT;

  const window = await sharp({
    create: { width: frameWidth, height: frameHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 0 } },
  })
    .composite([
      { input: windowChromeSvg(frameWidth, frameHeight), left: 0, top: 0 },
      { input: shotBuffer, left: 0, top: CHROME_HEIGHT },
    ])
    .png()
    .toBuffer();

  const canvasWidth = frameWidth + PADDING * 2;
  const canvasHeight = frameHeight + PADDING * 2;

  // 左上角一個小圓點，呼應網站本身「標題旁一個強調色圓點」的視覺語彙
  const accentDotSvg = Buffer.from(
    `<svg width="${canvasWidth}" height="${canvasHeight}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${PADDING / 2}" cy="${PADDING / 2}" r="7" fill="${BRAND.accent}" />
    </svg>`
  );

  await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 3, background: BRAND.background },
  })
    .composite([
      { input: window, left: PADDING, top: PADDING },
      { input: accentDotSvg, left: 0, top: 0 },
    ])
    .png()
    .toFile(outputFile);
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`找不到原始截圖：${RAW_DIR}——先跑 capture/ 底下的 screenshot-deck flow（記得帶 CAPTURE_PROJECT_NAME=${projectName}）`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".png"));
  if (files.length === 0) {
    console.error(`${RAW_DIR} 底下沒有任何 .png`);
    process.exit(1);
  }

  for (const file of files) {
    const outputFile = path.join(OUT_DIR, file.replace(/\.png$/, "-framed.png"));
    await composeOne(path.join(RAW_DIR, file), outputFile);
    console.log(`[產出] ${outputFile}`);
  }
}

main();
