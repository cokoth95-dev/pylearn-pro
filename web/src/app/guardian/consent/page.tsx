import GuardianConsent from './GuardianConsent'
import { Suspense } from 'react'

async function GuardianConsentContent({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return <GuardianConsent token={token ?? ''}/>
}

export default function GuardianConsentPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#faf7f0] text-stone-700">Loading guardian review…</main>}><GuardianConsentContent searchParams={searchParams}/></Suspense>
}
