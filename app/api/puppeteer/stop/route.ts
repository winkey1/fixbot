/**
 * Endpoint sederhana untuk stop semua pekerjaan Puppeteer yang sedang berjalan.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { stopAll } from '@/lib/puppeteer-manager';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  stopAll();
  return NextResponse.json({ ok: true, message: 'Stop requested' });
}
