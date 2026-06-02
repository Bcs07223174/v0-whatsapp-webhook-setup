import Link from 'next/link'

import { AppointmentsDashboard } from '@/components/appointments-dashboard'

export default function Page() {
  return (
    <main className="min-h-screen bg-white">
      <AppointmentsDashboard />
      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 text-sm text-gray-600">
          <p>Appointments & WhatsApp</p>
          <Link href="/privacy-policy" className="font-medium text-gray-900 hover:underline">
            Privacy Policy
          </Link>
        </div>
      </footer>
    </main>
  )
}
