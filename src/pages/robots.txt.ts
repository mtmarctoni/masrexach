import type { APIRoute } from "astro";
import { isProductionBuild, robotsTxt } from "../lib/robots";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(robotsTxt(isProductionBuild()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
