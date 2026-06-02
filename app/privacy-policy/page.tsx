import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy | Appointments & WhatsApp',
  description: 'Privacy Policy for the Appointments & WhatsApp appointment reminder app.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_55%,_#f8fafc_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16 lg:px-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-sm backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Appointments & WhatsApp
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            This Privacy Policy explains how Appointments & WhatsApp handles personal data when used
            to send appointment confirmations, reminders, and customer support messages through
            WhatsApp.
          </p>
          <p className="mt-6 text-sm text-slate-500">Last updated: June 2, 2026</p>
        </header>

        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">1. Data We Collect</h2>
            <p className="mt-3 text-slate-600 leading-7">
              Appointments & WhatsApp may collect and process the following information: patient or
              customer name, phone number, WhatsApp message content, appointment details, and
              message delivery status such as accepted, sent, delivered, read, or failed.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">2. How We Use Data</h2>
            <p className="mt-3 text-slate-600 leading-7">
              We use this information to send appointment confirmations, reminders, and related
              customer support messages, and to track whether messages were accepted or delivered
              successfully.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">3. Third-Party Services</h2>
            <p className="mt-3 text-slate-600 leading-7">
              This app may use Meta WhatsApp Cloud API to send WhatsApp messages. If deployed on a
              hosted platform, Vercel may process application traffic and logs. If message or
              appointment records are stored, Firebase or another database service may be used to
              persist that information.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">4. Data Retention</h2>
            <p className="mt-3 text-slate-600 leading-7">
              We retain message and appointment records only for as long as needed to operate the
              service, support message tracking, resolve issues, and meet legal or operational
              requirements. Retention periods may vary based on deployment and storage settings.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">5. Deletion Requests</h2>
            <p className="mt-3 text-slate-600 leading-7">
              You may request deletion of your data by contacting us at{' '}
              <a className="font-medium text-emerald-700 underline underline-offset-4" href="mailto:alijawad.000087@gmail.com">
                alijawad.000087@gmail.com
              </a>
              . We will review and process deletion requests where possible, subject to legal,
              security, and operational obligations.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight">6. Contact</h2>
            <p className="mt-3 text-slate-600 leading-7">
              For privacy questions or data requests, contact:{' '}
              <a className="font-medium text-emerald-700 underline underline-offset-4" href="mailto:alijawad.000087@gmail.com">
                alijawad.000087@gmail.com
              </a>
            </p>
          </div>
        </section>

        <div className="flex items-center justify-between text-sm text-slate-500">
          <Link href="/" className="font-medium text-slate-700 hover:underline">
            Back to home
          </Link>
          <span>Public page, no login required.</span>
        </div>
      </div>
    </main>
  )
}