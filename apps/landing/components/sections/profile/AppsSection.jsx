'use client'

import { Button, Card, Badge } from '@webfudge/ui'

export default function AppsSection({ apps, organizations, onAppClick }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-brand-dark">My Apps</h2>
        <span className="text-sm text-gray-600 font-medium">
          {apps.length} {apps.length === 1 ? 'app' : 'apps'} available
        </span>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {apps.map((app) => {
          const hasAccess = organizations.some((org) =>
            org.subscriptions?.some((sub) => sub.app.id === app.id)
          )

          return (
            <Card
              key={app.id}
              glass
              hoverable
              className={`group ${hasAccess ? 'ring-2 ring-brand-primary/50 bg-gradient-to-br from-orange-50/30 via-white/95 to-amber-50/30' : ''}`}
            >
              {/* Gradient Overlay */}
              <div
                className={`absolute inset-0 rounded-2xl ${hasAccess ? 'bg-gradient-to-br from-brand-primary/5 via-orange-400/5 to-amber-400/5' : 'bg-gradient-to-br from-orange-400/5 via-pink-400/5 to-yellow-400/5'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              ></div>

              {/* Content */}
              <div className="relative z-10">
                {/* Header with Icon */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shadow-sm ${
                      hasAccess
                        ? 'bg-gradient-to-br from-orange-50 to-amber-50 border border-brand-primary/30'
                        : 'bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-100'
                    }`}
                  >
                    {app.icon}
                  </div>
                  {hasAccess && (
                    <Badge
                      variant="primary"
                      size="md"
                      className="bg-orange-50 text-brand-primary border-brand-primary/30"
                    >
                      ✓ Active
                    </Badge>
                  )}
                </div>

                {/* App Info */}
                <h3
                  className={`text-xl font-bold text-brand-dark mb-2 ${hasAccess ? 'text-brand-primary' : 'group-hover:text-brand-primary transition-colors'}`}
                >
                  {app.name}
                </h3>
                <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed">
                  {app.description}
                </p>

                {/* Action Button */}
                {hasAccess ? (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onAppClick(app)}
                    className="w-full"
                  >
                    Open App
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => onAppClick(app)}
                    className="w-full"
                  >
                    Get Started
                  </Button>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
