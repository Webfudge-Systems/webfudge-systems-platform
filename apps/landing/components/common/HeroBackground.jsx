'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'

export default function HeroBackground() {
  const vectorRef = useRef(null)

  useEffect(() => {
    const el = vectorRef.current
    if (!el) return

    // Start after paint so GSAP can take over opacity (avoids React overwriting on hydration)
    const id = requestAnimationFrame(() => {
      gsap.fromTo(
        el,
        { opacity: 0.952 },
        {
          opacity: 0.6,
          duration: 2.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
        }
      )
    })

    return () => {
      cancelAnimationFrame(id)
      gsap.killTweensOf(el)
    }
  }, [])

  return (
    <>
      <div
        ref={vectorRef}
        className="absolute inset-0 bg-no-repeat bg-center bg-cover will-change-[opacity]"
        style={{
          backgroundImage: "url('/images/Vector.svg')",
          backgroundPosition: 'center bottom',
          backgroundSize: 'cover',
        }}
      />
      <div className="hero-corner-gradient absolute inset-0 pointer-events-none" />
    </>
  )
}
