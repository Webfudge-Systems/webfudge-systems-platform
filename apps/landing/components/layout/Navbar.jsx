'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { Icon } from '@iconify/react'
import { Button } from '@webfudge/ui'
import { useAuth } from '@webfudge/auth'
import { Logo } from '../common'
import ProductsDropdown from './ProductsDropdown'

const navLinks = [
  { href: '#about', label: 'About us' },
  { label: 'Products', hasProductsDropdown: true },
  { href: '#pricing', label: 'Pricing' },
]

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProductsDropdown, setShowProductsDropdown] = useState(false)
  const dropdownRef = useRef(null)
  const productsDropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
      if (productsDropdownRef.current && !productsDropdownRef.current.contains(event.target)) {
        setShowProductsDropdown(false)
      }
    }

    if (showDropdown || showProductsDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDropdown, showProductsDropdown])

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
    window.location.href = '/'
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 pt-2 md:px-8 md:pt-4 lg:px-0 lg:pt-6">
      <div className="mx-auto flex w-[100vw] max-w-5xl items-center justify-between gap-4 rounded-2xl bg-[#FFEADD] px-3 py-3 shadow-soft backdrop-blur-sm">
        {/* Logo - Left */}
        <Logo />

        {/* Nav Links - Center */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:flex md:gap-8 md:items-center">
          {navLinks.map((item) =>
            item.hasProductsDropdown ? (
              <div key={item.label} className="relative" ref={productsDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowProductsDropdown((s) => !s)}
                  onMouseEnter={() => setShowProductsDropdown(true)}
                  className="text-base font-bold text-dark-700 transition-colors hover:text-brand-primary md:text-xl hover:underline flex items-center gap-1"
                  aria-expanded={showProductsDropdown}
                  aria-haspopup="true"
                >
                  {item.label}
                  <svg
                    className={`w-4 h-4 transition-transform ${showProductsDropdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                <ProductsDropdown
                  isOpen={showProductsDropdown}
                  onClose={() => setShowProductsDropdown(false)}
                />
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className="text-base font-bold text-dark-700 transition-colors hover:text-brand-primary md:text-xl hover:underline"
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        {/* CTA Button or Profile Icon - Right */}
        {isAuthenticated ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary text-white hover:bg-brand-secondary transition-colors"
              aria-label="User menu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-white shadow-lg border border-gray-200 overflow-hidden z-10">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Button
            as={Link}
            href="/signup"
            variant="primary"
            size="lg"
            className="shrink-0 btn-liquid"
          >
            Start Your Trial
          </Button>
        )}
      </div>
    </nav>
  )
}
