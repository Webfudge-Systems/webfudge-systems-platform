"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useScrolled } from "../hooks/useScrolled"

const PRODUCTS_ITEMS = [
  { label: "CRM", href: "/crm" },
  { label: "Project Management", href: "/pm" },
]

function NavLink({
  href,
  children,
  active,
}: {
  href: string
  children: React.ReactNode
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? "border border-white/30 rounded-md px-3 py-1 text-white text-sm font-medium shadow-[0_0_16px_rgba(255,255,255,0.18)]"
          : "text-white/80 hover:text-white text-sm font-medium transition-colors duration-200"
      }
    >
      {children}
    </Link>
  )
}

export default function Navbar() {
  const pathname = usePathname()
  const scrolled = useScrolled(50)
  const [productsOpen, setProductsOpen] = useState(false)
  const isHomePage = pathname === "/"
  // Other pages: show Home + Products, About, Contact in both states; CTA appears on scroll only
  const showHomeLink = !isHomePage

  return (
    <nav
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#1C1C1C] rounded-xl pl-6 pr-6 py-3 flex items-center justify-between shadow-xl w-max min-w-[min(700px,calc(100vw-2rem))] max-w-[calc(100vw-2rem)]"
    >
      {/* Logo - far left */}
      <Link href="/" className="flex items-center shrink-0" aria-label="Webfudge Home">
        <Image
          src="/ws_logo.png"
          alt="Webfudge Systems"
          width={140}
          height={140}
          priority
          className="h-9 w-auto md:h-10 md:w-auto"
        />
      </Link>

      {/* Nav links + CTA in one group */}
      {/* When not scrolled, CTA collapses but `gap-*` still adds empty space between flex items */}
      <div
        className={`flex items-center ml-auto ${
          scrolled ? 'gap-10' : 'gap-4'
        }`}
      >
        {/* Links with clear space between each option */}
        <div className="flex items-center gap-8">
          {showHomeLink && (
            <NavLink href="/" active={pathname === "/"}>
              Home
            </NavLink>
          )}
          <div
            className="relative"
            onMouseEnter={() => setProductsOpen(true)}
            onMouseLeave={() => setProductsOpen(false)}
          >
            <span
              className={
pathname === "/crm" || pathname === "/pm"
                ? "border border-white/30 rounded-md px-3 py-1 text-white text-sm font-medium cursor-default inline-block shadow-[0_0_16px_rgba(255,255,255,0.18)]"
                : "text-white/80 hover:text-white text-sm font-medium transition-colors duration-200 cursor-pointer inline-block"
              }
            >
              Products
            </span>
            <div
              className={`absolute left-0 top-full mt-2 z-[60] transition-all duration-300 ease-out ${
                productsOpen
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 -translate-y-1 pointer-events-none"
              }`}
            >
              <div className="bg-[#00000038] backdrop-blur-sm rounded-[10px] px-5 py-2 min-w-[220px] max-w-[240px] border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.25),inset_1px_1px_0_rgba(255,255,255,0.12)]">
                <Link
                  href="/crm"
                  className="block py-[15px] text-[#000000] text-md font-bold transition-colors text-left w-full hover:opacity-90 pl-0.5"
                  onClick={() => setProductsOpen(false)}
                >
                  CRM
                </Link>
                <Link
                  href="/pm"
                  className="block py-[15px] text-[#000000] text-md font-bold transition-colors text-left w-full leading-snug hover:opacity-90 pl-0.5"
                  onClick={() => setProductsOpen(false)}
                >
                  Project Management
                </Link>
              </div>
            </div>
          </div>
          <NavLink href="/about" active={pathname === "/about"}>
            About
          </NavLink>
          <NavLink href="/contact" active={pathname === "/contact"}>
            Contact
          </NavLink>
        </div>

        {/* CTA - space before button when scrolled (gap-10 from links group) */}
        <div
          className={`overflow-hidden shrink-0 transition-all duration-300 ease-out ${
            scrolled ? "max-w-[200px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          <Link
            href="/signup"
            className={`inline-block transition-all duration-300 ease-out bg-orange-500 hover:bg-orange-600 text-white rounded-lg px-5 py-2 text-sm font-medium whitespace-nowrap shadow-[0_0_20px_-5px_rgba(249,115,22,0.45)] ${
              scrolled
                ? "opacity-100 translate-x-0 pointer-events-auto"
                : "opacity-0 translate-x-4 pointer-events-none"
            }`}
          >
            Start Your Trial
          </Link>
        </div>
      </div>
    </nav>
  )
}
