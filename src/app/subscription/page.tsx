'use client';
import dynamic from 'next/dynamic';

const Subscription = dynamic(() => import('@/components/Subscriptions'), { ssr: false });

export default function page() {
  return <Subscription />;
}
