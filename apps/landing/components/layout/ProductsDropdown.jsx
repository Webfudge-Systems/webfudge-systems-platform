'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { productTypes, products } from '../../data/products'

export default function ProductsDropdown({ isOpen, onClose }) {
  const [selectedTypeId, setSelectedTypeId] = useState('all')
  const [productSearch, setProductSearch] = useState('')

  if (!isOpen) return null

  const filteredProducts =
    selectedTypeId === 'all' ? products : products.filter((p) => p.typeId === selectedTypeId)
  const displayedProducts = productSearch.trim()
    ? filteredProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.description.toLowerCase().includes(productSearch.toLowerCase())
      )
    : filteredProducts
  const selectedType = productTypes.find((t) => t.id === selectedTypeId) || productTypes[0]

  return (
    <div
      className="fixed w-[100vw] left-1/2 -translate-x-1/2 max-w-5xl z-40 px-4 pt-1 md:px-8 lg:px-0"
      style={{ top: '3.5rem' }}
      onMouseLeave={onClose}
    >
      <div className="mx-auto w-full rounded-2xl bg-brand-light shadow-xl border border-gray-200/80 overflow-hidden flex flex-col max-h-[min(70vh,480px)] md:flex-row">
        {/* Left: types + search */}
        <div className="w-full md:w-56 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200/80 bg-gray-50/50 p-4 flex flex-col gap-3">
          <div className="relative">
            <Icon
              icon="lucide:search"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            />
            <input
              type="text"
              placeholder="I'm looking for..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
            />
          </div>
          <nav className="flex flex-col gap-0.5">
            {productTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setSelectedTypeId(type.id)}
                className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${
                  selectedTypeId === type.id
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Icon icon={type.icon} className="w-4 h-4" />
                  {type.label}
                </span>
                {selectedTypeId === type.id && (
                  <Icon icon="lucide:chevron-right" className="w-4 h-4" />
                )}
              </button>
            ))}
          </nav>
          <Link
            href="/#products"
            onClick={onClose}
            className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg bg-brand-primary text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Explore All Products
            <Icon icon="lucide:arrow-right" className="w-4 h-4" />
          </Link>
        </div>
        {/* Right: app cards */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {selectedType.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {displayedProducts.map((product) => (
              <Link
                key={product.slug}
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="group flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-brand-primary/30 hover:bg-orange-50/50 transition-colors"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center text-brand-primary group-hover:bg-orange-100 transition-colors">
                  <Icon icon={product.icon} className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-gray-900 group-hover:text-brand-primary transition-colors block">
                    {product.name}
                  </span>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{product.description}</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand-primary group-hover:underline">
                    View details
                    <Icon icon="lucide:arrow-right" className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
          {displayedProducts.length === 0 && (
            <p className="text-sm text-gray-500 py-4">No products match your search.</p>
          )}
        </div>
      </div>
    </div>
  )
}
