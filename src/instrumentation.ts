// Runs once when the Next.js server boots
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startPaymentWatcher } = await import('./lib/paymentWatcher');
    startPaymentWatcher();
  }
}
