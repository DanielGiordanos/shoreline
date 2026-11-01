// Optional Cloudflare Worker for shoreline.pravix.app/*.
// This is NOT active until the domain owner routes requests through this Worker.
// Edge TLS/HTTP redirects and headers must be verified after deployment.
const CSP_ENFORCE = "frame-ancestors 'self'; upgrade-insecure-requests";
const CSP_REPORT_ONLY = [
  "default-src 'self' https: data: blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' https: 'unsafe-inline'",
  "img-src 'self' https: data: blob:",
  "connect-src 'self' https: wss:",
  "font-src 'self' https: data:",
  "form-action 'self' https:"
].join('; ');

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.protocol === 'http:') {
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 308);
    }
    const upstream = await fetch(request);
    // Response.headers is immutable for a fetched origin response in Workers.
    const headers = new Headers(upstream.headers);
    if (url.protocol === 'https:') {
      // Start short; increase to 31536000 only after certificate/redirect QA.
      headers.set('Strict-Transport-Security', 'max-age=300');
    }
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Frame-Options', 'SAMEORIGIN');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(self), camera=(self)');
    // Header-based frame-ancestors is required; HTML CSP meta cannot replace it.
    headers.set('Content-Security-Policy', CSP_ENFORCE);
    // Trial script/network policy: monitor violations before enforcing.
    headers.set('Content-Security-Policy-Report-Only', CSP_REPORT_ONLY);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers
    });
  }
};
