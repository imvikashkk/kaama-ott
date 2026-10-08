import OtpPage from '@/components/OtpPage';
import { Suspense } from 'react';

// Dynamic → served with Cache-Control: no-store, so Back from home re-requests this
// page and the proxy redirects logged-in users instead of showing a cached login screen
export const dynamic = 'force-dynamic';

export default function page() {
  return (
    <div>
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen">
            <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
          </div>
        }
      >
        <OtpPage />
      </Suspense>
    </div>
  );
}
