// 頁面層 stale-while-revalidate 快取：切頁先渲染上次資料，背景 revalidate 後覆寫
const cache = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return cache.get(key) as T | undefined;
}

export function hasCached(key: string): boolean {
  return cache.has(key);
}

export function setCached(key: string, data: unknown): void {
  cache.set(key, data);
}

export function clearCache(): void {
  cache.clear();
}
