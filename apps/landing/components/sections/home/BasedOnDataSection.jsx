'use client'

import Link from 'next/link'

const BG = '#F7F3F0'
const TEXT = '#1A1A1A'
const MUTED = '#888'

const CARDS = [
  {
    id: 'automation',
    line1: 'Automation',
    line2: 'Machine Learning',
    icon: '⊟',
    featured: false,
  },
  {
    id: 'ai',
    line1: 'AI-Powered',
    line2: 'Chatbots',
    icon: '⊡',
    featured: true,
  },
  {
    id: 'analytics',
    line1: 'Data Analytics',
    line2: 'Deep Insights',
    icon: '⊞',
    featured: false,
  },
  {
    id: 'strategy',
    line1: 'AI Strategy',
    line2: 'Pro Consulting',
    icon: '◇',
    featured: false,
  },
]

export default function BasedOnDataSection() {
  return (
    <section
      style={{
        backgroundColor: BG,
        padding: '64px 24px 80px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        {/* Intro line */}
        <p
          style={{
            margin: '0 0 44px',
            maxWidth: '680px',
            fontFamily: 'var(--font-inter), sans-serif',
            fontSize: 'clamp(16px, 1.8vw, 19px)',
            fontWeight: 400,
            lineHeight: 1.7,
            color: TEXT,
          }}
        >
          We are pioneers in{' '}
          <em style={{ fontStyle: 'normal', fontWeight: 600, color: '#E85A12' }}>
            AI consulting
          </em>
          , dedicated to helping businesses harness the power of artificial intelligence to
          drive innovation, efficiency, and growth.
        </p>

        {/* Card grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            alignItems: 'end',
          }}
        >
          {CARDS.map((card) => {
            const f = card.featured
            return (
              <article
                key={card.id}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: '20px',
                  /* Featured: gradient border via background + padding trick */
                  background: f
                    ? 'linear-gradient(160deg, #ff8c42, #E85A12, #8B1A00)'
                    : 'transparent',
                  padding: f ? '2px' : '0',
                  boxShadow: f
                    ? '0 20px 48px rgba(232,90,18,0.22), 0 4px 16px rgba(0,0,0,0.08)'
                    : '0 4px 20px rgba(0,0,0,0.07)',
                  transform: f ? 'translateY(-10px) scale(1.03)' : 'none',
                  minHeight: f ? '340px' : '310px',
                }}
              >
                {/* Inner card surface */}
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    borderRadius: f ? '18px' : '20px',
                    background: f
                      ? 'linear-gradient(160deg, rgba(255,200,150,0.22) 0%, rgba(255,255,255,0.95) 35%)'
                      : '#FFFFFF',
                    border: f ? 'none' : '1px solid rgba(0,0,0,0.07)',
                    padding: '20px 18px 18px',
                    overflow: 'hidden',
                  }}
                >
                  {/* TOP: icon */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: f
                        ? 'linear-gradient(135deg, #ff8c42 0%, #E85A12 100%)'
                        : 'linear-gradient(135deg, #F58220 0%, #E85A12 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      color: '#fff',
                      boxShadow: '0 4px 12px rgba(232,90,18,0.35)',
                      flexShrink: 0,
                    }}
                  >
                    {card.icon}
                  </div>

                  {/* BOTTOM: title + CTA */}
                  <div>
                    <h3
                      style={{
                        margin: f ? '0 0 16px' : '0 0 12px',
                        fontFamily: 'var(--font-host-grotesk), sans-serif',
                        fontSize: f ? '22px' : '16px',
                        fontWeight: f ? 700 : 500,
                        lineHeight: 1.25,
                        letterSpacing: '-0.01em',
                        color: f ? '#E85A12' : TEXT,
                      }}
                    >
                      {card.line1}
                      <br />
                      {card.line2}
                    </h3>

                    {f ? (
                      /* Full-width bottom bar — spans edge to edge, rounded bottom only */
                      <Link
                        href="/contact"
                        style={{
                          display: 'block',
                          marginLeft: '-18px',
                          marginRight: '-18px',
                          marginBottom: '-18px',
                          padding: '13px 0',
                          textAlign: 'center',
                          background:
                            'linear-gradient(90deg, #ff6b1a 0%, #c0290a 55%, #7a0e00 100%)',
                          color: '#fff',
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          textDecoration: 'none',
                          letterSpacing: '0.02em',
                          borderRadius: '0 0 18px 18px',
                        }}
                      >
                        Talk With Us
                      </Link>
                    ) : (
                      <Link
                        href="/contact"
                        style={{
                          fontFamily: 'var(--font-inter), sans-serif',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: MUTED,
                          textDecoration: 'none',
                          letterSpacing: '0.01em',
                        }}
                      >
                        Talk With Us
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
