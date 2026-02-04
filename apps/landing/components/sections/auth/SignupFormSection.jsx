'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, LoadingSpinner } from '@webfudge/ui'
import { authService } from '@webfudge/auth'
import AuthErrorAlert from './AuthErrorAlert'
import PasswordField from './PasswordField'

export default function SignupFormSection() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    // Clear error when user starts typing
    if (error) setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // AuthService handles token storage automatically
      await authService.signup(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName
      )

      // Force full page reload to update auth state and redirect to home
      window.location.href = '/'
    } catch (err) {
      setError(err.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full lg:w-1/2 flex flex-col justify-end py-0 px-0">
      <div className="w-full h-full flex flex-col justify-end">
        {/* Signup Form Card */}
        <div
          className="bg-white shadow-2xl rounded-t-3xl border border-gray-100 overflow-hidden flex flex-col mt-16 lg:mr-16 max-w-xl mx-auto w-full"
          style={{ height: 'calc(100vh - 6rem)' }}
        >
          {/* Header */}
          <div className="text-center py-8 px-6">
            <h2 className="text-4xl font-semibold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Join Webfudge Systems</p>
          </div>

          {/* Form Content */}
          <div className="flex-1 py-8 px-6 flex flex-col justify-between overflow-y-auto">
            <div className="flex-1 flex flex-col justify-start">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Error Message */}
                {error && <AuthErrorAlert title="Signup Failed" message={error} />}

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    label="First Name"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                    className="py-3 text-base"
                  />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    label="Last Name"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                    className="py-3 text-base"
                  />
                </div>

                {/* Email Field */}
                <Input
                  id="email"
                  name="email"
                  type="email"
                  label="Email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  className="py-3 text-base"
                />

                {/* Password Field */}
                <PasswordField
                  id="password"
                  name="password"
                  label="Password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password (min 6 characters)"
                  className="py-3 text-base"
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  size="lg"
                  className="w-full inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    'Sign Up'
                  )}
                </Button>
              </form>
            </div>

            {/* Footer */}
            <div className="text-center py-4 mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-brand-primary hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
