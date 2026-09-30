// scroll-demo-video 範本：把 capture/ 錄到的 webm 轉成正式的 mp4。
// 依 app-marketing-assets skill 的「Final encode」教訓：瀏覽器算出來的畫面是 full-range RGB，
// 直接轉檔容易被標成 yuvj420p；這裡做一次真正的重新編碼，標準化成 yuv420p(tv) + faststart。
//
// 用法：node render/encode-scroll-video.mjs <專案名稱>

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";
import { loadProject, REPO_ROOT } from "../scripts/lib/projects.mjs";

const projectName = process.argv[2];
if (!projectName) {
  console.error("用法：node render/encode-scroll-video.mjs <專案名稱>");
  process.exit(1);
}

// 打錯字直接失敗，不要靜默建出一個沒註冊的 output 資料夾
loadProject(projectName);

const RAW_VIDEO_DIR = path.join(REPO_ROOT, "capture", "output", projectName, "raw-video");
const INPUT = path.join(RAW_VIDEO_DIR, "scroll-demo.webm");
const META = path.join(RAW_VIDEO_DIR, "scroll-demo.meta.json");
const OUT_DIR = path.join(REPO_ROOT, "output", projectName);
const OUTPUT = path.join(OUT_DIR, "scroll-demo.mp4");

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit" });
    proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))));
  });
}

async function main() {
  if (!fs.existsSync(INPUT)) {
    console.error(`找不到 ${INPUT}——先跑 capture/ 底下的 scroll-video flow（記得帶 CAPTURE_PROJECT_NAME=${projectName}）`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 錄影檔前面有一段「頁面還在載入」的空白，實際長度由 capture/ 那支腳本量測
  // （不是猜的固定值——見 scroll-demo.meta.json），這裡剪掉。
  let leadInSeconds = 0;
  if (fs.existsSync(META)) {
    leadInSeconds = JSON.parse(fs.readFileSync(META, "utf-8")).leadInSeconds ?? 0;
  }
  console.log(`裁掉前導空白：${leadInSeconds}s`);

  await run(ffmpegPath, [
    "-y",
    "-ss", String(leadInSeconds),
    "-i", INPUT,
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    "-preset", "slow",
    "-movflags", "+faststart",
    OUTPUT,
  ]);

  console.log(`[產出] ${OUTPUT}`);
}

main();
