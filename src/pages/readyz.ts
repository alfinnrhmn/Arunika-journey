import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { getDb } from '../server/db';

export const prerender = false;

const json = (status: number, body: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

/** Kesiapan: aplikasi hidup DAN database dapat dijangkau. Detail galat tidak dibocorkan. */
export const GET: APIRoute = async () => {
  try {
    await getDb().execute(sql`select 1`);
    return json(200, { status: 'ready' });
  } catch {
    return json(503, { status: 'unavailable' });
  }
};
