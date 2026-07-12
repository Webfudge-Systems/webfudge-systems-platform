'use client'

import Link from 'next/link'
import { ShieldX } from 'lucide-react'
import { Button } from '@webfudge/ui'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light p-4">
      <div className="text-center max-w-md">
        <ShieldX className="w-16 h-16 text-red-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-2">Access denied</h1>
        <p className="text-gray-600 mb-8">You don&apos;t have permission to view this page.</p>
        <Link href="/login">
          <Button variant="primary">Back to login</Button>
        </Link>
      </div>
    </div>
  )
}
