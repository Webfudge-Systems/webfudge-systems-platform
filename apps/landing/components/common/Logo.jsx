'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function Logo() {
  return (
    <Link href="/" className="flex items-center shrink-0" aria-label="Webfudge Home">
      <Image
        src="/ws_logo.png"
        alt="Webfudge Systems"
        width={160}
        height={160}
        priority
        className="h-10 w-auto md:h-12 md:w-auto"
      />
    </Link>
  )
}
