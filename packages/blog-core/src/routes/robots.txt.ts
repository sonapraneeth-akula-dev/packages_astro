import type { APIContext } from 'astro';
import { robots } from 'virtual:blog-core/robots';

export function GET(_context: APIContext): Response {
  return new Response(robots, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}