/**
 * Upload CSV (fields: email,password) dan jalankan createSessions synchronously.
 * Important: route ini menjalankan Puppeteer di thread yang sama. Pastikan host mendukung proses panjang.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';
import { startCreateSessions } from '@/lib/puppeteer-manager';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const userId = (session as any).user.id;

  const formData = await req.formData();
  const file = formData.get('file') as unknown as File;
  if (!file) return NextResponse.json({ error: 'file CSV tidak ditemukan' }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const text = Buffer.from(buffer).toString('utf-8');
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

  const accounts: { email: string; password: string }[] = [];
  for (const row of parsed.data as any[]) {
    if (row.email && row.password) accounts.push({ email: row.email.trim(), password: row.password.trim() });
  }
  if (accounts.length === 0) return NextResponse.json({ error: 'CSV kosong atau kolom tidak ditemukan' }, { status: 400 });

  // jalankan tugas synchronously (sesuai requirement)
  const res = await startCreateSessions(userId, accounts);

  // simpan setiap session sukses ke DB
  const userDir = path.join(process.env.DATA_DIR || './data', userId);
  for (const r of res.results) {
    if (r.ok && r.path) {
      const name = path.basename(r.path);
      // cek duplikat
      const exists = await prisma.session.findFirst({ where: { userId, name } });
      if (!exists) {
        await prisma.session.create({ data: { userId, name, path: r.path } });
      }
    }
  }

  return NextResponse.json({ ok: true, summary: res.results });
}
