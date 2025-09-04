'use client';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await signIn('credentials', { redirect: false, email, password });
    setLoading(false);
    if (res?.ok) router.push('/dashboard');
    else setErr('Login gagal. Periksa kredensial.');
  }

  return (
    <div style={{maxWidth:420, margin:'60px auto'}}>
      <div className="container">
        <h3>Masuk</h3>
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Email</label>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" className="input" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="button" type="submit" disabled={loading}>{loading ? 'Memproses...' : 'Masuk'}</button>
          </div>
          {err && <p style={{color:'red'}}>{err}</p>}
          <p style={{marginTop:8, fontSize:13}}>Akun statis sudah disediakan. Untuk pengguna baru, tambahkan manual ke DB.</p>
        </form>
      </div>
    </div>
  );
}
