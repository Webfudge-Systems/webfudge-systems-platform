'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@webfudge/auth'

/* Seven shimmer droplets — varied width / height / speed / delay */
const DROPS = [
  { w: '7px',  h: '40%', blur: '4px',   dur: '2.6s', delay: '0s',   op: 0.92 },
  { w: '3px',  h: '24%', blur: '2px',   dur: '3.4s', delay: '0.9s', op: 0.78 },
  { w: '10px', h: '52%', blur: '6px',   dur: '4.2s', delay: '0.4s', op: 0.52 },
  { w: '3px',  h: '17%', blur: '1.5px', dur: '2.3s', delay: '1.7s', op: 0.88 },
  { w: '6px',  h: '33%', blur: '3px',   dur: '3.9s', delay: '2.2s', op: 0.68 },
  { w: '9px',  h: '45%', blur: '5px',   dur: '5.1s', delay: '1.1s', op: 0.48 },
  { w: '3px',  h: '19%', blur: '1px',   dur: '2.9s', delay: '3.1s', op: 0.90 },
]

export default function HeroSection() {
  const { isAuthenticated } = useAuth()

  return (
    <section
      aria-label="Hero"
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000000',
        paddingBottom: 0,
        minHeight: '100vh',
      }}
    >
      <style>{`
        @keyframes wf-drip {
          0%   { transform: scaleY(0.94) translateY(-8px); opacity: 0.80; }
          42%  { transform: scaleY(1.05) translateY(9px);  opacity: 1;   }
          72%  { transform: scaleY(0.98) translateY(2px);  opacity: 0.87; }
          100% { transform: scaleY(0.94) translateY(-8px); opacity: 0.80; }
        }
        @keyframes wf-pulse {
          0%, 100% { opacity: 0.50; }
          50%       { opacity: 1;   }
        }
        @keyframes wf-drop {
          0%   { opacity: 0;   transform: translateY(-6%);  }
          8%   { opacity: 1;                                 }
          88%  { opacity: 0.8;                               }
          100% { opacity: 0;   transform: translateY(106%); }
        }
        @keyframes wf-border-pulse {
          0%, 100% { opacity: 0.70; }
          50%       { opacity: 1;   }
        }
      `}</style>

      {/* ── Grid ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.026) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.026) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
      }} />
      {/* Left-side darkening veil (only left area gets deeper black) */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          background:
            'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.58) 26%, rgba(0,0,0,0.35) 44%, rgba(0,0,0,0.10) 62%, transparent 78%)',
        }}
      />

      {/* ══════════════════════════════════════════════════════
          BEAM — runs from top of page down to the CRM frame.
          The rounded "halo" effect is NOT a separate circle;
          it comes from the cone being wide + the spine having
          a big box-shadow at its origin.
          ══════════════════════════════════════════════════════ */}
      <div aria-hidden style={{
        position: 'absolute',
        top: 0,
        left: '70%',
        transform: 'translateX(-50%)',
        width: '1200px',
        height: 'calc(100% - 120px)',
        zIndex: 3,
        pointerEvents: 'none',
      }}>
        {/* Mirror grid over beam so boxes stay visible in glow area */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            mixBlendMode: 'screen',
            opacity: 0.42,
          }}
        />
        {/* Ambient origin bloom — elongated ellipse, NOT a circle blob.
            Tall and narrow so it sits along the spine naturally.          */}
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '280px',
          height: '360px',
          background:
            'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(255,120,55,0.58) 0%, rgba(255,80,30,0.30) 25%, rgba(255,50,15,0.10) 55%, transparent 72%)',
          filter: 'blur(32px)',
          animation: 'wf-pulse 4.5s ease-in-out infinite',
        }} />

        {/* Wide conic flood — blends with bloom above */}
        <div style={{
          position: 'absolute', top: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '130%', height: '100%',
          backgroundImage:
            'conic-gradient(from 180deg at 50% 0%, transparent 136deg, rgba(255,82,22,0.20) 178deg, rgba(255,65,15,0.14) 182deg, transparent 224deg)',
          filter: 'blur(2px)',
          animation: 'wf-drip 6s ease-in-out infinite',
        }} />

        {/* Soft secondary cone */}
        <div style={{
          position: 'absolute', top: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '100%', height: '100%',
          backgroundImage:
            'conic-gradient(from 185deg at 50% 0%, transparent 145deg, rgba(255,100,40,0.10) 178deg, transparent 215deg)',
          filter: 'blur(26px)',
          animation: 'wf-drip 6s ease-in-out infinite 0.6s',
        }} />

        {/* Spine — wide box-shadow at top creates the glowing rounded source */}
        <div style={{
          position: 'absolute', top: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '5px', height: '100%',
          background:
            'linear-gradient(to bottom, #ffffff 0%, #ffd080 5%, #ff8030 20%, #ff5518 48%, rgba(255,70,22,0.40) 78%, rgba(255,50,10,0.10) 100%)',
          /* Large spread at top (the rounded "source") that tapers naturally */
          boxShadow:
            '0 0 0px 0px rgba(255,255,255,0.9), 0 0 28px 14px rgba(255,130,60,0.65), 0 0 80px 36px rgba(255,80,30,0.28)',
          filter: 'blur(3.5px)',
          animation: 'wf-drip 6s ease-in-out infinite 0.3s',
        }} />

        {/* Crisp 1-px inner core — no blur */}
        <div style={{
          position: 'absolute', top: 0,
          left: '50%', transform: 'translateX(-50%)',
          width: '2px', height: '100%',
          background:
            'linear-gradient(to bottom, #fff 0%, #ffe090 7%, #ff7028 28%, rgba(255,80,30,0.45) 68%, transparent 100%)',
        }} />

        {/* Shimmer droplets — multi-size, flows like a waterfall */}
        {DROPS.map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: 0,
            left: '50%', transform: 'translateX(-50%)',
            width: d.w, height: d.h,
            background:
              'linear-gradient(to bottom, transparent 0%, rgba(255,225,145,0.95) 28%, rgba(255,155,65,0.78) 62%, transparent 100%)',
            filter: `blur(${d.blur})`,
            opacity: d.op,
            animation: `wf-drop ${d.dur} ease-in-out infinite ${d.delay}`,
          }} />
        ))}
      </div>

      {/* ── Navbar ── */}
      <header style={{
        position: 'relative', zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: '1240px', margin: '0 auto',
        padding: '22px 32px', gap: '16px',
      }}>
        <Link
          href="/"
          aria-label="Webfudge Home"
          style={{ display: 'flex', alignItems: 'center', flexShrink: 0, textDecoration: 'none' }}
        >
          <Image
            src="/ws_logo.png"
            alt="Webfudge Systems"
            width={140}
            height={140}
            priority
            style={{ height: '40px', width: 'auto', display: 'block' }}
          />
        </Link>

        <nav aria-label="Primary" style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:'32px' }}>
          {[
            { label:'Products', href:'/products/crm' },
            { label:'About',    href:'/about'         },
            { label:'Contact',  href:'/contact'       },
          ].map(({ label, href }) => (
            <Link key={label} href={href} style={{
              fontFamily:'var(--font-inter), sans-serif', fontSize:'15px',
              fontWeight:400, color:'rgba(255,255,255,0.50)', textDecoration:'none',
            }}>{label}</Link>
          ))}
        </nav>

        <Link href={isAuthenticated ? '/profile' : '/login'} style={{
          fontFamily:'var(--font-inter), sans-serif', fontSize:'15px', fontWeight:500,
          backgroundColor:'#e84b18', color:'#fff', borderRadius:'8px',
          padding:'10px 22px', textDecoration:'none', whiteSpace:'nowrap', flexShrink:0,
        }}>Access Your Apps</Link>
      </header>

      {/* ── Hero copy ── */}
      <div style={{
        position:'relative', zIndex:10, maxWidth:'1240px', margin:'0 auto',
        padding:'28px 32px 44px',
        display:'flex', flexDirection:'column', alignItems:'flex-start', textAlign:'left',
      }}>
        <div style={{
          display:'inline-flex', alignItems:'center', padding:'7px 14px', marginBottom:'20px',
          borderRadius:'999px', backgroundColor:'rgba(232,75,24,0.12)',
          border:'1px solid rgba(232,75,24,0.45)',
          fontFamily:'var(--font-host-grotesk), sans-serif', fontSize:'11px', fontWeight:700,
          letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.88)',
        }}>All-in-one business system</div>

        <h1 style={{
          margin:'0 0 18px',
          maxWidth:'900px',
          fontFamily:'var(--font-host-grotesk), sans-serif',
          fontWeight:700,
          fontSize:'clamp(34px, 3.8vw, 52px)',
          lineHeight:1.1,
          letterSpacing:'-0.02em',
          color:'#f3f3f3',
          textShadow:'0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <span style={{ color:'#ffdcb8' }}>A</span> Business{' '}
          <span style={{ color:'#ff6524', textShadow:'0 0 14px rgba(255,110,45,0.35)' }}>System</span>
          <br />
          <span style={{ color:'#ffdcb8' }}>B</span>uilt Around Your Needs
        </h1>

        <p style={{
          margin:'0 0 30px', maxWidth:'480px',
          fontFamily:'var(--font-inter), sans-serif', fontSize:'15px',
          fontWeight:400, lineHeight:1.65, color:'rgba(255,255,255,0.38)',
        }}>
          All the features you expect—sales, projects, automation—configured and priced exactly how you want.
        </p>

        <div style={{ display:'flex', flexWrap:'wrap', gap:'12px' }}>
          <Link href={isAuthenticated ? '/profile' : '/login'} style={{
            fontFamily:'var(--font-inter), sans-serif', fontSize:'15px', fontWeight:500,
            backgroundColor:'#e84b18', color:'#fff', borderRadius:'8px',
            padding:'11px 22px', textDecoration:'none',
          }}>Access Your Apps</Link>
          <Link href="#products" style={{
            fontFamily:'var(--font-inter), sans-serif', fontSize:'15px', fontWeight:500,
            backgroundColor:'transparent', color:'#fff',
            border:'1px solid rgba(255,255,255,0.28)', borderRadius:'8px',
            padding:'11px 22px', textDecoration:'none',
          }}>View Products →</Link>
        </div>
      </div>

      {/* ── Dashboard frame ── */}
      <div style={{ position:'relative', zIndex:8, maxWidth:'1240px', margin:'0 auto', padding:'0 32px' }}>

        {/* ══════════════════════════════════════════════════════════════
            U-FRAME GLOW — single box-shadow on one element + clip-path.
            clip-path: inset(-N -N 0 -N) expands the visible region on
            top / left / right by N px but clips exactly at the bottom.
            This gives perfectly joined corners with ZERO gap, because
            the shadow is ONE continuous layer, not three separate bars.
            ══════════════════════════════════════════════════════════════ */}
        <div style={{
          position: 'relative',
          /* Clip bottom shadow, let top+left+right bleed.
             Larger top-right radius so the beam curves more gently there. */
          clipPath: 'inset(-180px -180px 0px -180px round 14px 28px 0 0)',
        }}>
          {/* The glow ring — matches the frame shape exactly */}
          <div aria-hidden style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '14px 28px 0 0',
            pointerEvents: 'none',
            zIndex: 22,
            /* Layer 1: thin sharp rim */
            /* Layer 2: close orange glow */
            /* Layer 3: wide soft bloom */
            boxShadow: `
              0 0 0 1.5px rgba(255,155,70,0.55),
              0 0 28px 10px rgba(255,110,50,0.58),
              0 0 90px  35px rgba(255,65,20,0.26)
            `,
            animation: 'wf-border-pulse 4s ease-in-out infinite',
          }} />

          {/*
            Beam landing glow — MUST sit above CRM (z-index > 8). The glow inside the
            beam stack was z-index 3 and sat behind the screenshot, so it never showed.
            Same horizontal axis as the beam stack (70%).
          */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '70%',
              top: '0',
              transform: 'translate(-50%, -42%)',
              zIndex: 25,
              width: '200px',
              height: '88px',
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 54% 100% at 50% 100%, rgba(255,125,60,0.72) 0%, rgba(255,88,38,0.42) 38%, rgba(255,55,20,0.18) 62%, transparent 78%)',
              filter: 'blur(16px)',
              mixBlendMode: 'screen',
              animation: 'wf-pulse 4.5s ease-in-out infinite 0.75s',
            }}
          />
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: '70%',
              top: '0',
              transform: 'translate(-50%, -18%)',
              zIndex: 26,
              width: '48px',
              height: '32px',
              pointerEvents: 'none',
              background:
                'radial-gradient(ellipse 100% 100% at 50% 100%, rgba(255,220,170,0.55) 0%, rgba(255,130,65,0.35) 52%, transparent 72%)',
              filter: 'blur(10px)',
              mixBlendMode: 'screen',
              animation: 'wf-pulse 4.5s ease-in-out infinite 1.1s',
            }}
          />

          {/* Frame — CRM screenshot only (no fake browser chrome) */}
          <div style={{
            position: 'relative', zIndex: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '14px 28px 0 0',
            borderBottom: 'none',
            overflow: 'hidden',
            backgroundColor: '#fff',
          }}>
            {/* Screenshot — no in-image gradients (clean UI); bottom fade only below */}
            <div style={{ position: 'relative', lineHeight: 0 }}>
              <Image
                src="/crm-demo.png"
                alt="Webfudge CRM dashboard preview"
                width={2200}
                height={1400}
                sizes="(max-width: 1240px) 100vw, 1240px"
                style={{ width: '100%', height: 'auto', display: 'block' }}
                priority
              />
            </div>
          </div>
        </div>

        {/* Bottom page-fade */}
        <div aria-hidden style={{
          position:'absolute', left:'32px', right:'32px', bottom:0,
          height:'140px', zIndex:15, pointerEvents:'none',
          background:'linear-gradient(to bottom, transparent, #000000)',
        }} />
      </div>
    </section>
  )
}


