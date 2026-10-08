import type { Metadata } from 'next';
import LegalPage, { SUPPORT_EMAIL } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms & Conditions | Kaama OTT',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      updated="17 March 2026"
      intro={
        <p className="m-0">
          Welcome to Kaama OTT, the streaming service at kaama.online. The rules below apply whenever you sign up,
          buy a pass or simply browse the site. Using the service means you accept them — if any part doesn&apos;t work
          for you, please don&apos;t use Kaama OTT.
        </p>
      }
      sections={[
        {
          heading: 'Adults only',
          body: (
            <p className="m-0">
              Everything on Kaama OTT is made for an adult audience. You need to be 18 or older to sign up or to watch
              anything here. When you use the service you are confirming both your age and that watching this kind of
              content is allowed under the laws that apply to you.
            </p>
          ),
        },
        {
          heading: 'Signing in',
          body: (
            <p className="m-0">
              There are no passwords — you sign in with your mobile number and a one-time code (OTP) sent to it. Keep
              your phone safe, because whatever happens on your account is your responsibility. Each account is meant
              for one person; please don&apos;t share it, lend it or sell it.
            </p>
          ),
        },
        {
          heading: 'Passes and how they work',
          body: (
            <ul>
              <li>Access is sold as prepaid passes that last a fixed time — currently 1 day, 1 month, 6 months or 1 year. The plans page always shows the latest options and prices.</li>
              <li>A pass becomes active the moment your payment is confirmed and stops on its own when its time is up. <strong className="text-white/85">Nothing renews automatically</strong> and we never charge you again unless you decide to buy another pass.</li>
              <li>Buying a new pass while one is still running doesn&apos;t waste anything — the new days are added on top of the days you have left.</li>
              <li>Prices and what a pass includes may change later, but a change never affects a pass you have already bought.</li>
            </ul>
          ),
        },
        {
          heading: 'Paying',
          body: (
            <p className="m-0">
              Prices are shown and charged in Indian Rupees (₹). You pay through UPI — from any UPI app or by scanning
              the QR code. Your bank or UPI details stay inside your UPI app; we never see or keep them.
            </p>
          ),
        },
        {
          heading: 'Refunds',
          body: (
            <ul>
              <li><strong className="text-white/85">Every purchase is final and non-refundable</strong> — this includes days you didn&apos;t use, changing your mind, or watching only part of your pass.</li>
              <li>Because passes are prepaid and never auto-renew, there is no subscription to cancel. Your pass simply runs out at the end of its period.</li>
              <li>Paid but your pass didn&apos;t start? Write to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with your mobile number and the transaction details. Once we confirm the payment, we&apos;ll switch your pass on. If a payment failed on the bank or gateway side, the money returns to you automatically within your bank&apos;s usual timeline.</li>
            </ul>
          ),
        },
        {
          heading: 'What you can and can\'t do',
          body: (
            <p className="m-0">
              Your pass lets you watch for your own private, non-commercial enjoyment. Downloading, screen-recording,
              copying, re-uploading, showing content in public, reselling it, getting around our protections or using
              the service for anything illegal is not allowed. Accounts that do any of this can be suspended or closed,
              and no refund will be given.
            </p>
          ),
        },
        {
          heading: 'Ownership of content',
          body: (
            <p className="m-0">
              The films, artwork, text and branding you see here are owned by Kaama OTT or by the partners who license
              them to us, and copyright and related laws protect them.
            </p>
          ),
        },
        {
          heading: 'Availability',
          body: (
            <p className="m-0">
              We work hard to keep streaming smooth, but we can&apos;t promise the service will never go down. Titles may
              be added to or taken out of the library at any time, and picture quality depends on your device and
              internet speed.
            </p>
          ),
        },
        {
          heading: 'Our liability',
          body: (
            <p className="m-0">
              Kaama OTT is offered on an &quot;as is&quot; basis. As far as the law allows, the most we will be liable for
              in connection with the service is the price you paid for the pass you currently hold.
            </p>
          ),
        },
        {
          heading: 'Applicable law',
          body: (
            <p className="m-0">
              Indian law governs these Terms, and any dispute about them will be handled by the courts of India.
            </p>
          ),
        },
        {
          heading: 'Updates to these terms',
          body: (
            <p className="m-0">
              These Terms may be revised now and then; the date at the top tells you when that last happened. If you
              keep using Kaama OTT after a revision, you are agreeing to the updated version.
            </p>
          ),
        },
      ]}
    />
  );
}
