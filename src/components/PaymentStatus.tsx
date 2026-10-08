'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import UpiPaySheet from './UpiPaySheet';

// Fallback for refreshes / old links — the subscription page normally opens the sheet in place
export default function PaymentStatusPage() {
  const params = useSearchParams();
  const txnId = params.get('order_id') ?? params.get('txnid') ?? params.get('txnId') ?? '';
  const back = () => {
    window.location.href = '/subscription';
  };

  useEffect(() => {
    if (!txnId) back();
  }, [txnId]);

  if (!txnId) return <div className="k-body min-h-screen" />;

  return (
    <div className="k-body min-h-screen">
      <UpiPaySheet txnId={txnId} onClose={back} />
    </div>
  );
}
