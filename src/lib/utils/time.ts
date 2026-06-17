// el-GR time/date formatters (mirrors the prototype's inline toLocale* calls).

export function timeHM(ts: number): string {
  return new Date(ts).toLocaleTimeString("el-GR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dateTimeShort(ts: number): string {
  return new Date(ts).toLocaleString("el-GR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
