'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'
import Cookies from 'js-cookie'

function InstagramCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'connecting' | 'success' | 'error'>('connecting')
  const [error, setError] = useState('')

  useEffect(() => {
    const code = searchParams.get('code')
    const token = Cookies.get('token')

    if (!token) {
      router.push('/login')
      return
    }

    if (!code) {
      setStatus('error')
      setError('Missing authorization code')
      return
    }

    connectAccount(code)
  }, [searchParams, router])

  const connectAccount = async (code: string) => {
    try {
      await api.connectInstagram(code)
      setStatus('success')
      setTimeout(() => {
        router.push('/dashboard?tab=accounts')
      }, 2000)
    } catch (err: any) {
      setStatus('error')
      setError(err.response?.data?.message || 'Failed to connect Instagram account')
    }
  }

  if (status === 'connecting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-gray-600">Connecting your Instagram account...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <div className="mb-4 text-4xl">✓</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-900">Successfully Connected!</h2>
          <p className="text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 text-center shadow">
        <div className="mb-4 text-4xl text-red-500">✗</div>
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Connection Failed</h2>
        <p className="mb-4 text-gray-600">{error}</p>
        <button
          onClick={() => router.push('/dashboard?tab=accounts')}
          className="rounded-md bg-primary-600 px-4 py-2 text-white hover:bg-primary-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}

export default function InstagramCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <InstagramCallbackContent />
    </Suspense>
  )
}

