'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@webfudge/auth'
import {
  Card,
  EmptyState,
  Button,
  Avatar,
  LoadingSpinner,
  Input,
} from '@webfudge/ui'
import { MessageSquare, Send, Search, User } from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import messageService, { memberDisplayName } from '../../lib/api/messageService'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getListDisplayName(u) {
  if (!u) return 'User'
  return (u.name || u.username || (u.email ? u.email.split('@')[0] : '') || 'User').trim()
}

function getListUserInitials(u) {
  const name = getListDisplayName(u)
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
  }
  if (name.length >= 2) return name.slice(0, 2).toUpperCase()
  return (name.charAt(0) || '?').toUpperCase()
}

export default function MessagesPage() {
  const { user } = useAuth()
  const messagesEndRef = useRef(null)

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [orgError, setOrgError] = useState(null)

  const currentUserId =
    user?.id || user?.attributes?.id || user?.documentId || user?.attributes?.documentId

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      setOrgError(null)
      const { members, error } = await messageService.fetchOrganizationMembers()
      if (error === 'no_org') {
        setOrgError('no_org')
        setUsers([])
        return
      }
      setUsers(members.filter((u) => String(u.id) !== String(currentUserId)))
    } catch (e) {
      console.error('Failed to load org members:', e)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [currentUserId])

  const loadMessages = useCallback(async () => {
    if (!selectedUser || !currentUserId) return
    try {
      setLoadingMessages(true)
      const list = await messageService.fetchConversation(selectedUser.id)
      setMessages(list)
    } catch (e) {
      console.error('Failed to load messages:', e)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [selectedUser, currentUserId])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    if (selectedUser) {
      loadMessages()
      const interval = setInterval(loadMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [selectedUser, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUserId) return
    try {
      setSending(true)
      await messageService.sendDirectMessage(selectedUser.id, newMessage)
      setNewMessage('')
      await loadMessages()
    } catch (e) {
      console.error('Failed to send message:', e)
    } finally {
      setSending(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q)
    )
  })

  const listAvatarClass =
    'bg-orange-500 text-white border-0 shadow-sm ring-0 font-semibold'

  return (
    <div className="min-h-full bg-gray-50 p-4 space-y-4">
      <PMPageHeader
        title="Messages"
        subtitle="Communicate with your team members"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Messages', href: '/message' },
        ]}
        showProfile
      />

      <div className="flex min-h-[max(500px,calc(100vh-220px))] flex-col gap-4 lg:flex-row lg:items-stretch">
        {/* Left — contacts (no card chrome) */}
        <div className="flex w-full flex-col lg:w-[min(100%,320px)] lg:min-w-[280px] lg:max-w-sm">
          <div className="flex-shrink-0 pb-4">
            {/* Match sidebar top search styling */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary focus:bg-white/25 transition-[background-color,border-color,box-shadow] duration-300 text-sm placeholder:text-brand-text-light shadow-lg"
              />
            </div>
          </div>

          <div className="min-h-[280px] flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : orgError === 'no_org' ? (
              <div className="p-6">
                <EmptyState
                  icon={User}
                  title="No organization selected"
                  description="Choose an organization in your workspace so we can load teammates you can message."
                  className="py-10"
                />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={User}
                  title="No users found"
                  description="No other team members in this organization yet."
                  className="py-10"
                />
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {filteredUsers.map((u) => {
                  const active = selectedUser?.id === u.id
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedUser(u)}
                        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 ${
                          active ? 'bg-orange-50/90 border-l-[3px] border-l-orange-500' : 'border-l-[3px] border-l-transparent'
                        }`}
                      >
                        <Avatar
                          fallback={getListUserInitials(u)}
                          alt={getListDisplayName(u)}
                          size="md"
                          className={listAvatarClass}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {getListDisplayName(u)}
                          </p>
                          <p className="truncate text-xs text-gray-500">
                            Click to start conversation
                          </p>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Right — conversation */}
        <div className="flex min-h-[min(400px,60vh)] flex-1 flex-col lg:min-h-0">
          {!selectedUser ? (
            <Card
              variant="elevated"
              padding={false}
              className="flex min-h-[min(400px,60vh)] flex-1 flex-col items-center justify-center overflow-hidden rounded-lg border border-gray-100 shadow-md"
            >
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a conversation from the list or start a new one"
                className="py-16 px-6"
              />
            </Card>
          ) : (
            <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
              <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-100 px-5 py-4">
                <Avatar
                  fallback={getListUserInitials(selectedUser)}
                  alt={getListDisplayName(selectedUser)}
                  size="md"
                  className={listAvatarClass}
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">
                    {getListDisplayName(selectedUser)}
                  </p>
                  <p className="text-xs text-gray-500">Team member</p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-gray-50/40 p-4">
                {loadingMessages ? (
                  <div className="flex h-32 items-center justify-center">
                    <LoadingSpinner size="md" message="Loading messages..." />
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    description={`Start a conversation with ${getListDisplayName(selectedUser)}.`}
                    className="py-8"
                  />
                ) : (
                  messages.map((msg, i) => {
                    const isOwn = String(msg.senderId) === String(currentUserId)
                    const peerLabel = isOwn
                      ? 'You'
                      : memberDisplayName(msg.sender) || getListDisplayName(selectedUser)
                    const initialsSource = isOwn ? 'You' : peerLabel
                    const initials =
                      initialsSource.length >= 2
                        ? initialsSource.slice(0, 2).toUpperCase()
                        : (initialsSource.charAt(0) || '?').toUpperCase()
                    return (
                      <div
                        key={msg.id || i}
                        className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar
                          fallback={initials}
                          size="sm"
                          className={isOwn ? 'bg-gray-200 text-gray-700' : listAvatarClass}
                        />
                        <div
                          className={`flex max-w-xs flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                        >
                          <div
                            className={`rounded-lg px-3 py-2 text-sm ${
                              isOwn
                                ? 'rounded-tr-none bg-orange-500 text-white'
                                : 'rounded-tl-none bg-gray-100 text-gray-800'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="mt-1 text-xs text-gray-400">
                            {timeAgo(msg.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="flex flex-shrink-0 gap-2 border-t border-gray-100 bg-white p-3">
                <Input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={`Message ${getListDisplayName(selectedUser)}...`}
                  className="flex-1 rounded-lg border-gray-200 py-2.5 text-sm"
                  containerClassName="flex-1 mb-0"
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="h-[42px] shrink-0 self-end px-4"
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
