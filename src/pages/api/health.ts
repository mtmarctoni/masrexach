export const prerender = false;

export function GET(): Response {
  return new Response(JSON.stringify({ status: "ok", commit: __BUILD_SHA__ }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
