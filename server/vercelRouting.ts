export function restoreVercelApiUrl(requestUrl: string, forwardedPath: string): string {
  const url = new URL(requestUrl, 'http://localhost');
  url.searchParams.delete('__vercel_path');
  const apiPath = forwardedPath.startsWith('/') ? forwardedPath : `/${forwardedPath}`;
  return `/api${apiPath.replace(/#/g, '%23')}${url.search}`;
}
