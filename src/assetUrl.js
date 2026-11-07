export function assetUrl(path) {
  if (!path) return '';
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path)) return path;
  return `${import.meta.env.BASE_URL}${String(path).replace(/^\/+/, '')}`;
}