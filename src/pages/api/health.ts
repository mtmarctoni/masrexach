export const prerender = false;

// Deploy verification only needs to identify the build, not reproduce it: the
// short SHA matches the commit column in GitHub's deploy history. The full SHA
// is build-identifying data that has no business being publicly readable.
const COMMIT = __BUILD_SHA__.slice(0, 7);

export function GET(): Response {
  return new Response(JSON.stringify({ status: "ok", commit: COMMIT }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      // This endpoint is for the deploy smoke test, never for crawling.
      "X-Robots-Tag": "noindex",
    },
  });
}
