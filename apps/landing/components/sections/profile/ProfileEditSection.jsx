'use client'

import { Icon } from '@iconify/react'
import { Button, Card, Input } from '@webfudge/ui'

export default function ProfileEditSection({
  user,
  editedUser,
  isEditing,
  onEditToggle,
  onFieldChange,
  onSave,
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-brand-dark">Profile</h2>

      {/* Profile Photo Section */}
      <Card glass>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-primary to-yellow-400 flex items-center justify-center text-white text-3xl font-bold shadow-md">
              {user?.firstName?.charAt(0)?.toUpperCase() ||
                user?.email?.charAt(0)?.toUpperCase() ||
                '?'}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-brand-dark mb-1">Upload new photo</h3>
            <p className="text-sm text-gray-600">
              At least 800×800 px recommended. JPG or PNG is allowed
            </p>
          </div>
        </div>
      </Card>

      {/* Personal Info Section */}
      <Card
        glass
        title="Personal Info"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditToggle}
            className="flex items-center gap-2"
          >
            <Icon icon="lucide:edit-3" className="w-4 h-4" />
            Edit
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-6">
          <div>
            {isEditing ? (
              <Input
                label="Full Name"
                type="text"
                value={editedUser?.firstName || ''}
                onChange={(e) => onFieldChange('firstName', e.target.value)}
              />
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-600 mb-2">Full Name</label>
                <p className="text-brand-dark font-medium">
                  {user?.firstName || 'Not set'} {user?.lastName || ''}
                </p>
              </>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Email</label>
            <p className="text-brand-dark font-medium">{user?.email}</p>
          </div>
          <div>
            {isEditing ? (
              <Input
                label="Phone"
                type="tel"
                value={editedUser?.phone || ''}
                onChange={(e) => onFieldChange('phone', e.target.value)}
              />
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-600 mb-2">Phone</label>
                <p className="text-brand-dark font-medium">{user?.phone || 'Not set'}</p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Location Section */}
      <Card
        glass
        title="Location"
        actions={
          isEditing && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onEditToggle()}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={onSave}>
                Save changes
              </Button>
            </div>
          )
        }
      >
        {isEditing ? (
          <Input
            type="text"
            value={editedUser?.location || ''}
            onChange={(e) => onFieldChange('location', e.target.value)}
            placeholder="California"
          />
        ) : (
          <p className="text-brand-dark font-medium">{user?.location || 'Not set'}</p>
        )}
      </Card>

      {/* Bio Section */}
      <Card glass title="Bio">
        {isEditing ? (
          <textarea
            value={editedUser?.bio || ''}
            onChange={(e) => onFieldChange('bio', e.target.value)}
            rows={6}
            placeholder="Tell us about yourself..."
            className="w-full px-4 py-3 backdrop-blur-xl bg-white/80 border border-gray-300/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary/50 resize-none transition-all"
          />
        ) : (
          <p className="text-gray-600 leading-relaxed">{user?.bio || 'No bio added yet'}</p>
        )}
      </Card>
    </div>
  )
}
