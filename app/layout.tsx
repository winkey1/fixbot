import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'FB Automation',
  description: 'Alat otomatisasi Facebook'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div className="header">
          <div style={{maxWidth:1100, margin:'0 auto'}}>
            <h2>FB Automation — Dashboard</h2>
          </div>
        </div>
        <main>{children}</main>
      </body>
    </html>
  );
}
