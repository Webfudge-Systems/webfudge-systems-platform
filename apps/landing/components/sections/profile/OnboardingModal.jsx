'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@iconify/react'
import { Button, Modal, Input, Select } from '@webfudge/ui'
import apiService from '../../../services/api'

export default function OnboardingModal({ app, onClose, onComplete }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modules, setModules] = useState([])
  const [existingOrganizations, setExistingOrganizations] = useState([])
  const [useExisting, setUseExisting] = useState(false)
  const [selectedOrgId, setSelectedOrgId] = useState(null)
  const [formData, setFormData] = useState({
    // Step 1: Modules
    selectedModules: [],

    // Step 2: Company Details
    name: '',
    companyEmail: '',
    companyPhone: '',
    website: '',
    industry: 'technology',
    size: 'size_1_10',

    // Step 3: Users
    invitedEmails: [''],
    userCount: 1,
  })
  const [pricing, setPricing] = useState(null)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState(null) // e.g. 'name' | 'organization' | null

  useEffect(() => {
    loadModules()
    loadExistingOrganizations()
  }, [])

  const loadModules = async () => {
    try {
      const response = await apiService.getAppModules(app.slug)
      const moduleList = response.data || []
      setModules(moduleList)

      // First-time setup: all modules on by default with 14-day free trial
      const allModuleIds = moduleList.map((m) => m.id)
      setFormData((prev) => ({ ...prev, selectedModules: allModuleIds }))
    } catch (error) {
      console.error('Failed to load modules:', error)
    }
  }

  const loadExistingOrganizations = async () => {
    try {
      const response = await apiService.getMe()
      if (response.organizations && response.organizations.length > 0) {
        setExistingOrganizations(response.organizations)
        // Default to using existing if available
        if (response.organizations.length > 0) {
          setUseExisting(true)
          setSelectedOrgId(response.organizations[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    }
  }

  useEffect(() => {
    if (formData.selectedModules.length > 0) {
      calculatePricing()
    }
  }, [formData.selectedModules, formData.userCount])

  const calculatePricing = async () => {
    try {
      const response = await apiService.calculatePricing(
        app.id,
        formData.selectedModules,
        formData.userCount
      )
      setPricing(response.data)
    } catch (error) {
      console.error('Failed to calculate pricing:', error)
    }
  }

  const handleEmailChange = (index, value) => {
    const newEmails = [...formData.invitedEmails]
    newEmails[index] = value
    setFormData((prev) => ({ ...prev, invitedEmails: newEmails }))
  }

  const addEmailField = () => {
    setFormData((prev) => ({
      ...prev,
      invitedEmails: [...prev.invitedEmails, ''],
    }))
  }

  const removeEmailField = (index) => {
    setFormData((prev) => ({
      ...prev,
      invitedEmails: prev.invitedEmails.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      // Filter out empty emails
      const validEmails = formData.invitedEmails.filter((email) => email.trim() !== '')

      if (useExisting && selectedOrgId) {
        // Add app to existing organization
        await apiService.addAppToOrganization(selectedOrgId, {
          appId: app.id,
          moduleIds: formData.selectedModules,
          userCount: formData.userCount,
          invitedEmails: validEmails,
        })
      } else {
        // Create new organization
        await apiService.createOrganization({
          name: formData.name,
          companyEmail: formData.companyEmail,
          companyPhone: formData.companyPhone,
          website: formData.website,
          industry: formData.industry,
          size: formData.size,
          appId: app.id,
          moduleIds: formData.selectedModules,
          userCount: formData.userCount,
          invitedEmails: validEmails,
        })
      }

      // Redirect to app after successful onboarding
      const appPorts = {
        crm: 3001,
        pm: 3002,
        accounts: 3003,
        vendor: 3004,
      }
      const port = appPorts[app.slug] || 3000
      window.location.href = `http://localhost:${port}`
    } catch (err) {
      setError(err.message || 'Failed to activate app')
      setFieldError(err.field || null)
      setLoading(false)
      // Go to the step that contains the problematic field so user sees which input to fix
      if (err.field === 'name' || err.field === 'organization') {
        setStep(1)
      }
    }
  }

  const nextStep = () => {
    if (step === 1 && !useExisting && !formData.name) {
      setError('Company name is required')
      return
    }
    if (step === 1 && useExisting && !selectedOrgId) {
      setError('Please select an organization')
      return
    }
    setError('')
    setFieldError(null)
    setStep(step + 1)
  }

  const prevStep = () => {
    setError('')
    setFieldError(null)
    setStep(step - 1)
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Setup ${app.name}`}
      size="lg"
      closeOnBackdrop
      className="max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-200/80"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-gray-500">Step {step} of 3</span>
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((s) => (
            <span
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step
                  ? 'w-6 bg-brand-primary'
                  : s < step
                    ? 'w-1.5 bg-brand-primary/50'
                    : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100"
          role="alert"
        >
          {fieldError ? (
            <>
              <strong className="font-semibold">Step 1 (Organization):</strong>{' '}
              {fieldError === 'name'
                ? 'See "Company Name" field below.'
                : 'See "Select Organization" field below.'}
            </>
          ) : (
            error
          )}
        </div>
      )}

      {/* Content */}
      <div className="pt-2">
        {/* Step 1: Organization */}
        {step === 1 && (
          <div>
            <h3 className="text-lg font-semibold text-brand-dark mb-4">Organization</h3>

            {existingOrganizations.length > 0 && (
              <div className="mb-6">
                <div className="flex gap-6 mb-5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      checked={useExisting}
                      onChange={() => setUseExisting(true)}
                      className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                    />
                    <span className="text-sm font-medium text-brand-dark group-hover:text-brand-primary transition-colors">
                      Use Existing Organization
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      checked={!useExisting}
                      onChange={() => setUseExisting(false)}
                      className="w-4 h-4 text-brand-primary border-gray-300 focus:ring-brand-primary"
                    />
                    <span className="text-sm font-medium text-brand-dark group-hover:text-brand-primary transition-colors">
                      Create New Organization
                    </span>
                  </label>
                </div>

                {useExisting && (
                  <div>
                    <Select
                      label="Select Organization"
                      required
                      placeholder="Choose an organization"
                      value={selectedOrgId || ''}
                      onChange={(v) => {
                        setSelectedOrgId(v)
                        setFieldError((prev) => (prev === 'organization' ? null : prev))
                      }}
                      options={existingOrganizations.map((org) => ({
                        value: org.id,
                        label: org.name,
                      }))}
                      error={fieldError === 'organization' && error ? error : undefined}
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      {app.name} will be added to the selected organization
                    </p>
                  </div>
                )}
              </div>
            )}

            {(!useExisting || existingOrganizations.length === 0) && (
              <div className="space-y-4">
                <Input
                  label="Company Name"
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value })
                    setFieldError((prev) => (prev === 'name' ? null : prev))
                  }}
                  error={fieldError === 'name' && error ? error : undefined}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Company Email"
                    type="email"
                    value={formData.companyEmail}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  />
                </div>

                <Input
                  label="Website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Select
                    label="Industry"
                    value={formData.industry}
                    onChange={(v) => setFormData({ ...formData, industry: v })}
                    options={[
                      { value: 'technology', label: 'Technology' },
                      { value: 'finance', label: 'Finance' },
                      { value: 'healthcare', label: 'Healthcare' },
                      { value: 'education', label: 'Education' },
                      { value: 'retail', label: 'Retail' },
                      { value: 'manufacturing', label: 'Manufacturing' },
                      { value: 'services', label: 'Services' },
                      { value: 'other', label: 'Other' },
                    ]}
                  />
                  <Select
                    label="Company Size"
                    value={formData.size}
                    onChange={(v) => setFormData({ ...formData, size: v })}
                    options={[
                      { value: 'size_1_10', label: '1-10' },
                      { value: 'size_11_50', label: '11-50' },
                      { value: 'size_51_200', label: '51-200' },
                      { value: 'size_201_500', label: '201-500' },
                      { value: 'size_500_plus', label: '500+' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Invite Users */}
        {step === 2 && (
          <div>
            <h3 className="text-lg font-semibold text-brand-dark mb-4">Invite Users (Optional)</h3>

            <Input
              label="How many users will use this app?"
              type="number"
              min={1}
              value={formData.userCount}
              onChange={(e) =>
                setFormData({ ...formData, userCount: parseInt(e.target.value) || 1 })
              }
              containerClassName="mb-5 max-w-[8rem]"
            />

            <div className="space-y-2">
              {formData.invitedEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => handleEmailChange(index, e.target.value)}
                    placeholder="user@example.com"
                    containerClassName="flex-1 min-w-0"
                  />
                  {formData.invitedEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEmailField(index)}
                      className="p-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Remove"
                    >
                      <Icon icon="lucide:trash-2" className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addEmailField}
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-brand-primary hover:text-orange-600 font-medium transition-colors"
            >
              <Icon icon="lucide:plus" className="w-4 h-4" />
              Add another email
            </button>
          </div>
        )}

        {/* Step 3: Start trial */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center text-center py-8 px-4">
            <h3 className="text-xl font-semibold text-brand-dark mb-2">Start your 14-day trial</h3>
            <p className="text-gray-500 max-w-sm mb-8 italic">
              &ldquo;The secret of getting ahead is getting started.&rdquo;
            </p>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              variant="primary"
              size="lg"
              className="min-w-[140px]"
            >
              {loading ? 'Creating...' : 'Start'}
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center gap-4">
        <Button
          variant="ghost"
          size="md"
          onClick={step === 1 ? onClose : prevStep}
          className="text-gray-700"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>
        {step < 3 && (
          <Button variant="primary" size="md" onClick={nextStep}>
            Continue
          </Button>
        )}
        {step === 3 && <div />}
      </div>
    </Modal>
  )
}
