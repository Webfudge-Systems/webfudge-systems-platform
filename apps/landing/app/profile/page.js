'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import apiService from '../../services/api';
import {
  OnboardingModal,
  ProfileLayout,
  AppsSection,
  OrganizationsSection,
  ProfileEditSection
} from '../../components/sections';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeSection, setActiveSection] = useState('apps');
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(null);

  useEffect(() => {
    loadUserData();
    loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserData = async () => {
    try {
      const response = await apiService.getMe();
      setUser(response.user);
      setEditedUser(response.user);
      setOrganizations(response.organizations || []);
    } catch (error) {
      console.error('Failed to load user:', error);
      router.push('/login');
    }
  };

  const handleSaveProfile = async () => {
    try {
      await apiService.updateProfile(editedUser);
      setUser(editedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const loadApps = async () => {
    try {
      const response = await apiService.getApps();
      setApps(response.data || []);
    } catch (error) {
      console.error('Failed to load apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAppClick = (app) => {
    // Check if user has organization with this app
    const hasApp = organizations.some(org =>
      org.subscriptions?.some(sub => sub.app.slug === app.slug)
    );

    if (hasApp) {
      // Redirect to app
      window.location.href = `http://localhost:${getAppPort(app.slug)}`;
    } else {
      // Show onboarding
      setSelectedApp(app);
      setShowOnboarding(true);
    }
  };

  const getAppPort = (slug) => {
    const ports = {
      'crm': 3001,
      'pm': 3002,
      'accounts': 3003,
      'vendor': 3004
    };
    return ports[slug] || 3000;
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    loadUserData(); // Reload to get new organization
  };

  const handleOrganizationClick = (org) => {
    // Store selected organization in localStorage
    localStorage.setItem('selected-organization', JSON.stringify(org));
    // Redirect to Accounts app
    window.location.href = `http://localhost:3003?org=${org.id}`;
  };

  const handleLogout = () => {
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-user');
    document.cookie = 'auth-token=; path=/; max-age=0';
    router.push('/login');
  };

  const handleFieldChange = (field, value) => {
    setEditedUser({ ...editedUser, [field]: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="text-brand-dark font-semibold text-lg">Loading your workspace...</span>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileEditSection
            user={user}
            editedUser={editedUser}
            isEditing={isEditing}
            onEditToggle={() => setIsEditing(!isEditing)}
            onFieldChange={handleFieldChange}
            onSave={handleSaveProfile}
          />
        );

      case 'organizations':
        return (
          <OrganizationsSection
            organizations={organizations}
            onOrganizationClick={handleOrganizationClick}
          />
        );

      case 'apps':
        return (
          <AppsSection
            apps={apps}
            organizations={organizations}
            onAppClick={handleAppClick}
          />
        );

      default:
        return (
          <AppsSection
            apps={apps}
            organizations={organizations}
            onAppClick={handleAppClick}
          />
        );
    }
  };

  return (
    <>
      <ProfileLayout
        user={user}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={handleLogout}
      >
        {renderContent()}
      </ProfileLayout>

      {/* Onboarding Modal */}
      {showOnboarding && selectedApp && (
        <OnboardingModal
          app={selectedApp}
          onClose={() => setShowOnboarding(false)}
          onComplete={handleOnboardingComplete}
        />
      )}
    </>
  );
}
