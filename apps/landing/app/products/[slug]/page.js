'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Icon } from '@iconify/react'
import { Button } from '@webfudge/ui'
import { getProductBySlug } from '../../../data/products'

export default function ProductDetailsPage() {
  const params = useParams()
  const slug = params?.slug
  const product = slug ? getProductBySlug(slug) : null

  if (!product) {
    return (
      <div className="min-h-screen pt-28 px-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-brand-dark mb-2">Product not found</h1>
        <p className="text-gray-600 mb-6">We couldn’t find a product with that slug.</p>
        <Button as={Link} href="/#products" variant="primary">
          View all products
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-light pt-28 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        <Link
          href="/#products"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-primary mb-8"
        >
          <Icon icon="lucide:arrow-left" className="w-4 h-4" />
          Back to products
        </Link>
        <div className="rounded-2xl bg-white border border-gray-200/80 shadow-lg overflow-hidden">
          <div className="p-8 md:p-12">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-brand-primary">
                <Icon icon={product.icon} className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-brand-dark">{product.name}</h1>
                <p className="text-lg text-gray-600 mt-2">{product.description}</p>
              </div>
            </div>
            {product.longDescription && (
              <div className="mt-8 pt-8 border-t border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  About
                </h2>
                <p className="text-gray-700 leading-relaxed">{product.longDescription}</p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-4">
              <Button as={Link} href="/signup" variant="primary" size="lg">
                Get started
              </Button>
              <Button as={Link} href="/#products" variant="outline" size="lg">
                View all products
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
