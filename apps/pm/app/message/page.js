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
} from '@webfudge/ui'
import {
  MessageSquare,
  Send,
  Search,
  User,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import strapiClient from '../../lib/strapiClient'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const currentUserId = user?.id || user?.attributes?.id

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const res = await strapiClient.getXtrawrkxUsers({ pageSize: 100 })
      const allUsers = Array.isArray(res) ? res : res?.data || []
      setUsers(allUsers.filter((u) => u.id !== currentUserId))
    } catch {}
    finally { setLoading(false) }
  }, [currentUserId])

  const loadMessages = useCallback(async () => {
    if (!selectedUser) return
    try {
      setLoadingMessages(true)
      const res = await strapiClient.request(
        'GET',
        `/api/messages?filters[$or][0][sender][id][$eq]=${currentUserId}&filters[$or][0][recipient][id][$eq]=${selectedUser.id}&filters[$or][1][sender][id][$eq]=${selectedUser.id}&filters[$or][1][recipient][id][$eq]=${currentUserId}&populate[sender]=true&populate[recipient]=true&sort=createdAt:asc&pagination[pageSize]=100`
      )
      setMessages(res?.data || [])
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }, [selectedUser, currentUserId])

  useEffect(() => { loadUsers() }, [loadUsers])

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
      await strapiClient.request('POST', '/api/messages', {
        data: {
          content: newMessage.trim(),
          sender: currentUserId,
          recipient: selectedUser.id,
        },
      })
      setNewMessage('')
      loadMessages()
    } catch {}
    finally { setSending(false) }
  }

  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Messages"
        subtitle="Direct messages with team members"
        showProfile
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
        {/* User List */}
        <Card padding={false} variant="default" className="flex flex-col">
          {/* Search */}
          <div className="p-3 border-b border-gray-100 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search people..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="sm" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4">
                <EmptyState icon={User} title="No users found" description="No team members to message." />
              </div>
            ) : (
              filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-gray-50 ${
                    selectedUser?.id === u.id ? 'bg-orange-50 border-r-2 border-orange-500' : ''
                  }`}
                >
                  <Avatar
                    fallback={(u.name || u.username || '?').charAt(0).toUpperCase()}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {u.name || u.username}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u.email || ''}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Chat Panel */}
        <div className="lg:col-span-3">
          {!selectedUser ? (
            <Card variant="default" className="h-full flex items-center justify-center">
              <EmptyState
                icon={MessageSquare}
                title="Select a conversation"
                description="Choose a team member from the list to start or continue a conversation."
              />
            </Card>
          ) : (
            <Card padding={false} variant="default" className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 flex-shrink-0">
                <Avatar
                  fallback={(selectedUser.name || selectedUser.username || '?').charAt(0).toUpperCase()}
                  size="md"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {selectedUser.name || selectedUser.username}
                  </p>
                  <p className="text-xs text-gray-500">{selectedUser.email || 'Team member'}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <LoadingSpinner size="md" message="Loading messages..." />
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={MessageSquare}
                    title="No messages yet"
                    description={`Start a conversation with ${selectedUser.name || selectedUser.username}.`}
                  />
                ) : (
                  messages.map((msg, i) => {
                    const attrs = msg.attributes || msg
                    const senderId =
                      attrs.sender?.data?.id || attrs.sender?.id || attrs.senderId
                    const isOwn = String(senderId) === String(currentUserId)
                    const senderName =
                      attrs.sender?.data?.attributes?.name ||
                      attrs.sender?.name ||
                      (isOwn ? 'You' : selectedUser.name || 'Unknown')
                    return (
                      <div key={msg.id || i} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
                        <Avatar
                          fallback={(senderName || '?').charAt(0).toUpperCase()}
                          size="sm"
                        />
                        <div className={`max-w-xs flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                          <div className={`px-3 py-2 rounded-2xl text-sm ${
                            isOwn
                              ? 'bg-orange-500 text-white rounded-tr-none'
                              : 'bg-gray-100 text-gray-800 rounded-tl-none'
                          }`}>
                            {attrs.content}
                          </div>
                          <span className="text-xs text-gray-400 mt-1">
                            {timeAgo(attrs.createdAt)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-100 p-3 flex gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={`Message ${selectedUser.name || selectedUser.username}...`}
                  className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSendMessage}
                  disabled={sending || !newMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
