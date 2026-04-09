export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

type Params = { name: string };

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<Params> }
): Promise<Response> {
  const { name } = await ctx.params; // Next 15: params é Promise
  const base = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
  const apikey = process.env.EVOLUTION_API_KEY ?? '';

  if (!base || !apikey) {
    return NextResponse.json(
      { error: 'EVOLUTION_API_URL/KEY ausentes' },
      { status: 500 }
    );
  }

  const evo = await fetch(`${base}/instance/delete/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    headers: { apikey },
  });

  let body: unknown = null;
  try {
    body = await evo.json();
  } catch {
    body = null;
  }

  return NextResponse.json(body ?? {}, { status: evo.status });
}
