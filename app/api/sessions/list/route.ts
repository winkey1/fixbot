/**
 * Mengembalikan daftar session user dari DB.
 * Endpoint protected: harus login.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const userId = (session as any).user.id;

  const sessions = await prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json({ sessions });
}
