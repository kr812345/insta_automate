'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import Cookies from 'js-cookie'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const token = Cookies.get('token')
    if (token) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Social Auto</h1>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

