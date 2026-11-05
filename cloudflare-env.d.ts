// Minimal Cloudflare runtime types used by worker/index.ts (the build still targets
// vinext's Cloudflare entry before exporting static files).
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}
