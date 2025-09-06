/**
 * Manager Puppeteer yang menyediakan:
 * - startCreateSessions(userId, accounts)
 * - startJoinGroups(userId, sessionIds, groupLinks)
 * - startPostAndComment(userId, sessionIds, imagePath, commentText)
 * - stopAll() untuk meminta stop secara gracefull
 *
 * Catatan penting:
 * - File ini dijalankan pada server Node (bukan serverless). Pastikan deploy di server yang mendukung proses jangka panjang.
 * - Gunakan DATA_DIR dari env. Pastikan folder ada dan writable.
 */

import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import puppeteer, { Browser, Page } from 'puppeteer';
import { app } from 'electron';

const DATA_DIR = process.env.DATA_DIR || (app ? path.join(app.getPath('userData'), 'sessions') : './data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

type Account = { email: string; password: string };

const JOBS: Map<string, {
  browsers: Browser[],
  stopRequested: boolean
}> = new Map();

function sanitizeName(s: string) {
  return s.replace(/[^a-z0-9_.@-]/ig, '_');
}

// fungsi util delay
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// membuat folder user
function ensureUserDir(userId: string) {
  const dir = path.join(DATA_DIR, userId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export async function startCreateSessions(userId: string, accounts: Account[]) {
  const jobId = uuidv4();
  JOBS.set(jobId, { browsers: [], stopRequested: false });
  const job = JOBS.get(jobId)!;

  const userDir = ensureUserDir(userId);
  const concurrency = 3;
  let index = 0;
  const results: { email: string; ok: boolean; message?: string; path?: string }[] = [];

  async function worker() {
    while (index < accounts.length && !job.stopRequested) {
      const i = index++;
      const acc = accounts[i];
      const sessName = sanitizeName(acc.email);
      const sessionPath = path.join(userDir, sessName);

      try {
        // pastikan folder ada
        if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

        const browser = await puppeteer.launch({
          headless: false,
          userDataDir: sessionPath,
          args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        job.browsers.push(browser);

        const page = await browser.newPage();
        await page.goto('https://www.facebook.com', { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
        // isi form login Facebook (selector standar)
        try {
          await page.waitForSelector('#email', { timeout: 10000 });
          await page.type('#email', acc.email, { delay: 200 });
          await page.type('#pass', acc.password, { delay: 200 });
          await page.keyboard.press('Enter');
          // tunggu navigasi atau delay fallback
          await Promise.race([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(()=>{}),
            delay(8000)
          ]);
          // beri waktu 15 detik sesuai requirement
          await delay(15000);
          results.push({ email: acc.email, ok: true, path: sessionPath });
        } catch (err) {
          results.push({ email: acc.email, ok: false, message: 'Gagal login atau selector berubah' });
        }

        // tutup browser untuk menulis userDataDir ke disk; session akan tersimpan di folder
        await browser.close();
        // hapus browser dari job.browsers
        job.browsers = job.browsers.filter(b => b !== browser);
      } catch (err: any) {
        results.push({ email: acc.email, ok: false, message: err.message });
      }

      // jika diminta stop, break
      if (job.stopRequested) break;
    }
  }

  // jalankan worker sesuai concurrency
  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  JOBS.delete(jobId);
  return { jobId, results };
}

export async function startJoinGroups(userId: string, sessionNames: string[], groupLinks: string[]) {
  const jobId = uuidv4();
  JOBS.set(jobId, { browsers: [], stopRequested: false });
  const job = JOBS.get(jobId)!;

  const userDir = ensureUserDir(userId);
  const results: any[] = [];

  // limit group per session to 10
  const groupLimit = 10;

  for (const sessName of sessionNames) {
    if (job.stopRequested) break;
    const sessionPath = path.join(userDir, sanitizeName(sessName));
    if (!fs.existsSync(sessionPath)) {
      results.push({ session: sessName, ok: false, message: 'Session folder tidak ditemukan' });
      continue;
    }

    const browser = await puppeteer.launch({
      headless: false,
      userDataDir: sessionPath,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    job.browsers.push(browser);

    try {
      const page = await browser.newPage();
      for (let i = 0; i < Math.min(groupLinks.length, groupLimit); i++) {
        if (job.stopRequested) break;
        const link = groupLinks[i];
        try {
          await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
          // coba beberapa selector tombol gabung
          const possible = [
            'text/Gabung', // modern FB textual match (Playwright style not supported), fallback below
            'button[aria-label="Bergabung"]',
            'button:has-text("Bergabung")',
            'button'
          ];
          // pendekatan sederhana: cari button yang mengandung kata 'Gabung' / 'Join'
          const allButtons = await page.$$('button');
          let joined = false;
          for (const b of allButtons) {
            const text = await page.evaluate(el => el.textContent, b);
            if (!text) continue;
            const lower = text.toLowerCase();
            if (lower.includes('gabung') || lower.includes('join')) {
              await b.click().catch(()=>{});
              await delay(3000);
              joined = true;
              break;
            }
          }
          results.push({ session: sessName, group: link, ok: joined });
        } catch (err: any) {
          results.push({ session: sessName, group: link, ok: false, message: err.message });
        }
      }
    } finally {
      await browser.close();
      job.browsers = job.browsers.filter(b => b !== browser);
    }
  }

  JOBS.delete(jobId);
  return { jobId, results };
}

async function attemptPostingWithRetries(page: Page, imagePath: string, text: string) {
  // adaptasi dari source reference
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // coba buka modal posting
      // klik area "Buat Postingan" — pendekatan umum: cari textarea placeholder
      const anonBtn = await page.waitForSelector("xpath///span[text()='Postingan Anonim']");
      if (anonBtn) await anonBtn.click();
      const createAnonBtn = await page.waitForSelector("xpath///span[text()='Buat Postingan Anonim']");
      if (createAnonBtn) await createAnonBtn.click();
      const textAreaSelector = 'div[aria-placeholder="Kirim postingan anonim..."]';
       await page.waitForSelector(textAreaSelector, { visible: true, timeout: 10000 });
       const [fileChooser] = await Promise.all([
            page.waitForFileChooser({ timeout: 10000 }),
            page.click('div[aria-label="Foto/video"]') 
        ]);

        await fileChooser.accept([imagePath]);
        const postButtonSelector = 'div[aria-label="Kirim"][role="button"]:not([aria-disabled="true"])';
        await page.waitForSelector(postButtonSelector, { visible: true, timeout: 60000 });
        
      const textarea = await page.$(textAreaSelector);
      if (textarea) {
        await textarea.focus();
        await page.keyboard.type(text, { delay: 80 });
      }
      // click tombol kirim jika ada
      // temukan tombol yang berisi kata 'Kirim' atau 'Posting'
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const t = (await page.evaluate(el => el.textContent, b) || '').toLowerCase();
        if (t.includes('kirim') || t.includes('posting') || t.includes('post')) {
          await b.click().catch(()=>{});
          await delay(3000);
          return true;
        }
      }
      // fallback success
      return true;
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await page.reload({ waitUntil: 'networkidle2' }).catch(()=>{});
        await delay(5000);
      } else {
        return false;
      }
    }
  }
  return false;
}

export async function startPostAndComment(userId: string, sessionNames: string[], imagePath: string, commentText: string) {
  const jobId = uuidv4();
  JOBS.set(jobId, { browsers: [], stopRequested: false });
  const job = JOBS.get(jobId)!;
  const userDir = ensureUserDir(userId);
  const concurrency = 3;

  const results: any[] = [];
  let idx = 0;

  async function worker() {
    while (idx < sessionNames.length && !job.stopRequested) {
      const i = idx++;
      const sessName = sessionNames[i];
      const sessionPath = path.join(userDir, sanitizeName(sessName));
      if (!fs.existsSync(sessionPath)) {
        results.push({ session: sessName, ok: false, message: 'session tidak ditemukan' });
        continue;
      }

      const browser = await puppeteer.launch({
        headless: false,
        userDataDir: sessionPath,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      job.browsers.push(browser);

      try {
        const page = await browser.newPage();
        page.on('dialog', async dialog => {console.log(` > Dialog muncul, pesan: "${dialog.message()}". Otomatis diterima.`);
        await dialog.accept();
        });
        await page.goto('https://www.facebook.com/groups/feed/', { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
        // ambil pinned groups seperti di reference (a[.//i])
       try {
          const pinnedXPath = "//a[.//i]";
            await page.waitForSelector(`xpath/${pinnedXPath}`, { timeout: 30000 });
            const linkElements = await page.$$(`xpath/${pinnedXPath}`);
        
        
          const urls = [];
        const urlsPattern = /facebook\.com\/groups\/\d+\/?$/;
        for (const link of linkElements) {
            const url = await page.evaluate(el => (el as HTMLAnchorElement).href, link);
            if (urlsPattern.test(url)) {
                urls .push(url);
            }
        }

          for (const url of urls) {
            if (job.stopRequested) break;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(()=>{});
            const ok = await attemptPostingWithRetries(page, imagePath, commentText);
            results.push({ session: sessName, group: url, ok });
            // tunggu 5s antar grup
            await delay(5000);
          }
        } catch (err: any) {
          results.push({ session: sessName, ok: false, message: 'Gagal ambil pinned groups' });
        }
      } finally {
        await browser.close();
        job.browsers = job.browsers.filter(b => b !== browser);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  JOBS.delete(jobId);
  return { jobId, results };
}

export function stopAll() {
  // minta stop untuk semua job yang berjalan
  for (const [id, j] of JOBS.entries()) {
    j.stopRequested = true;
    for (const b of j.browsers) {
      try {
        b.close().catch(()=>{});
      } catch {}
    }
    JOBS.delete(id);
  }
}
