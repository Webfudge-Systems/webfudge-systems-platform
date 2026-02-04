'use client'

import Image from 'next/image'
import { Container, Section } from '@webfudge/ui'

export default function AppUISection() {
  return (
    <Section id="app-ui" ariaLabel="App interface preview">
      <Container>
        {/* Image container with bottom gradient fade */}
        <div className="relative max-w-full mx-auto">
          {/* Main image wrapper with gradient mask at bottom */}
          <div className="relative">
            <Image
              src="/images/app_ui.png"
              alt="Webfudge platform dashboard and CRM interface"
              width={3400}
              height={2000}
              className="w-full h-auto object-contain"
              sizes="(max-width: 3024px) 100vw, 1024px"
              priority={false}
            />
            {/* Gradient overlay at bottom — fades into section background (brand light) */}
            <div
              className="absolute inset-x-0 bottom-0 h-32 md:h-48 pointer-events-none"
              style={{
                background:
                  'linear-gradient(to top, rgb(255, 250, 247) 0%, rgb(255, 250, 247) 40%, transparent 100%)',
              }}
              aria-hidden
            />
          </div>
        </div>
      </Container>
    </Section>
  )
}
