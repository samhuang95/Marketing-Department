// 共用：讀 projects.json，依名稱找一筆專案記錄。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const REGISTRY_PATH = path.join(REPO_ROOT, "projects.json");

export function loadAllProjects() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    throw new Error(`找不到 ${REGISTRY_PATH}——先複製 projects.example.json 成 projects.json`);
  }
  return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8")).projects || [];
}

export function loadProject(name) {
  const project = loadAllProjects().find((p) => p.name === name);
  if (!project) {
    throw new Error(`projects.json 裡沒有名為 "${name}" 的專案`);
  }
  return project;
}

export { REPO_ROOT };
