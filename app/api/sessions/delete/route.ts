/**
 * Hapus session dari DB + hapus folder userDataDir.
 * Body JSON: { ids: string[] }
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const userId = (session as any).user.id;

  const { ids } = await req.json() as { ids: string[] };
  if (!ids || ids.length === 0) {
    return NextResponse.json({ error: "Tidak ada ID dikirim" }, { status: 400 });
  }

  // Ambil data session yang dimiliki user
  const sessions = await prisma.session.findMany({
    where: { id: { in: ids }, userId }
  });

  // Hapus di DB
  await prisma.session.deleteMany({ where: { id: { in: ids }, userId } });

  // Hapus folder userDataDir
  for (const s of sessions) {
    try {
      if (s.path) {
        const absPath = path.resolve(s.path);
        await fs.rm(absPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error("Gagal hapus folder:", s.path, e);
    }
  }

  return NextResponse.json({ ok: true, deleted: ids });
}
