'use client'

import { Icon } from '@iconify/react'
import { Card, Badge } from '@webfudge/ui'

export default function OrganizationsSection({ organizations, onOrganizationClick }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-brand-dark">Your Organizations</h2>
      {organizations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {organizations.map((org) => (
            <Card
              key={org.id}
              glass
              hoverable
              onClick={() => onOrganizationClick(org)}
              className="cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-xl font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                  {org.name}
                </h3>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-yellow-400 flex items-center justify-center text-white font-bold shadow-md">
                  {org.name.charAt(0).toUpperCase()}
                </div>
              </div>
              <p className="text-sm text-gray-600 font-medium mb-4">
                {org.subscriptions?.length || 0} active subscription
                {org.subscriptions?.length !== 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {org.subscriptions?.map((sub) => (
                  <Badge key={sub.id} variant="orange" size="sm">
                    {sub.app.name}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center text-sm text-brand-primary font-bold">
                <span>Manage Organization</span>
                <Icon
                  icon="lucide:arrow-right"
                  className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card glass className="text-center">
          <Icon icon="lucide:building-2" className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">No organizations yet</p>
        </Card>
      )}
    </div>
  )
}
