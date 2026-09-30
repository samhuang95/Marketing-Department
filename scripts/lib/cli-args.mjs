// 共用：解析 `--flag=value` 形式的 CLI 參數。
// 只在第一個 "=" 切一刀，不是 String.split("=")——後者遇到值本身含有 "="
// （例如網址帶 query string ?a=1&ref=x）會被從第二個 "=" 截斷，見
// specs/task1.md 記錄的實際案例（--live-url= 帶 query string 的網址被截斷）。

export function parseFlag(argv, flagName) {
  const prefix = `--${flagName}=`;
  const arg = argv.find((a) => a.startsWith(prefix));
  if (!arg) return undefined;
  return arg.slice(prefix.length);
}
