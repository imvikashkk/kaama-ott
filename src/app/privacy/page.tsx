import type { Metadata } from 'next';
import LegalPage, { SUPPORT_EMAIL } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Kaama OTT',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="17 March 2026"
      intro={
        <p className="m-0">
          Your privacy matters to us. This page sets out, in plain words, what Kaama OTT (kaama.online) learns about
          you while you use the site, why we need it and what control you have over it. By using Kaama OTT you
          agree to the practices described here.
        </p>
      }
      sections={[
        {
          heading: 'What we know about you',
          body: (
            <ul>
              <li><strong className="text-white/85">Your mobile number</strong> — this is your account, and we text it a one-time code (OTP) each time you sign in.</li>
              <li><strong className="text-white/85">Your passes and payments</strong> — which pass you bought, what you paid, when, whether it went through, and the reference number our payment gateway gives us.</li>
              <li><strong className="text-white/85">Technical details</strong> — things your browser sends automatically, like your IP address, browser type and the pages you open.</li>
              <li><strong className="text-white/85">Where you came from</strong> — if an ad brought you here, the campaign it belonged to plus advertising cookies such as Meta&apos;s <code>_fbp</code> and <code>_fbc</code>.</li>
            </ul>
          ),
        },
        {
          heading: 'Why we use it',
          body: (
            <ul>
              <li>Running your account, keeping it secure and sending your sign-in codes by SMS.</li>
              <li>Switching on your pass, keeping track of it and checking that payments are genuine.</li>
              <li>Helping you when you contact support.</li>
              <li>Understanding which of our ads are working.</li>
              <li>Stopping fraud and meeting our legal duties.</li>
            </ul>
          ),
        },
        {
          heading: 'Your payment details',
          body: (
            <p className="m-0">
              You pay inside your own UPI app, so your bank account and UPI information never reach us and are{' '}
              <strong className="text-white/85">not saved anywhere on our systems</strong>. All we get back is whether
              the payment succeeded and its transaction reference.
            </p>
          ),
        },
        {
          heading: 'Cookies, Meta Pixel & ads',
          body: (
            <p className="m-0">
              A few essential cookies keep you signed in. On top of that we use the Meta Pixel and Meta Conversions
              API, which pass a small amount of data to Meta — for example a scrambled (hashed) form of your mobile
              number, your IP address, browser details and the value of a purchase — so we can measure our ads. You
              can control the ads you see from your Meta account settings, or remove cookies from your browser at any
              time.
            </p>
          ),
        },
        {
          heading: 'Who else sees it',
          body: (
            <p className="m-0">
              Your personal data is never sold. It is passed only to the companies that help us run Kaama OTT — the
              payment gateway, SMS provider, hosting provider and ad partners — and to government authorities if the
              law requires it.
            </p>
          ),
        },
        {
          heading: 'How long we keep it & how we protect it',
          body: (
            <p className="m-0">
              Account and payment records stay with us while your account is in use, and afterwards for as long as
              tax, accounting or other legal rules require. We take sensible technical and organisational steps to
              keep your data safe, though no system connected to the internet can be guaranteed 100% secure.
            </p>
          ),
        },
        {
          heading: 'Your choices',
          body: (
            <p className="m-0">
              Want to see, fix or delete what we hold about you? Email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and include your registered mobile number. We may
              still need to keep certain records, such as payment history, when the law says so.
            </p>
          ),
        },
        {
          heading: 'Under-18s',
          body: (
            <p className="m-0">
              Kaama OTT is strictly for adults aged 18 and over, and we do not knowingly collect any information about
              anyone younger.
            </p>
          ),
        },
        {
          heading: 'Changes to this page',
          body: (
            <p className="m-0">
              We may revise this policy from time to time; the date at the top shows the latest revision. Using Kaama
              OTT after a change means you accept the updated policy.
            </p>
          ),
        },
      ]}
    />
  );
}
