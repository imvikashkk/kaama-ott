import { Suspense } from 'react';
import PaymentStatusPage from '../../../components/PaymentStatus';

export default function page() {
  return (
    <Suspense
      fallback={
        <div className="k-body flex items-center justify-center h-screen">
          <div className="w-10 h-10 border-[3px] border-[#FACC15]/25 border-t-[#FACC15] rounded-full animate-spin"></div>
        </div>
      }
    >
      <PaymentStatusPage />
    </Suspense>
  );
}
