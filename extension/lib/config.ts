export const DEFAULT_MAX_FILE_SIZE_BYTES = 200 * 1024;
export const HARD_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
export const MIN_MAX_FILE_SIZE_BYTES = 1024;

export function clampMaxFileSize(bytes: number): number {
  if (!Number.isFinite(bytes)) return DEFAULT_MAX_FILE_SIZE_BYTES;
  return Math.min(Math.max(bytes, MIN_MAX_FILE_SIZE_BYTES), HARD_MAX_FILE_SIZE_BYTES);
}
