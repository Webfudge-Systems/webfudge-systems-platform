'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, X, CheckSquare, FolderOpen, ArrowUpRight } from 'lucide-react'
import taskService from '../lib/api/taskService'
import projectService from '../lib/api/projectService'
import { transformTask, transformProject } from '../lib/api/dataTransformers'
import { useRouter } from 'next/navigation'

export default function GlobalSearchModal({ isOpen, onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, initialQuery])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!query.trim() || !isOpen) {
      setTasks([])
      setProjects([])
      return
    }
    const debounce = setTimeout(async () => {
      try {
        setLoading(true)
        const [taskRes, projRes] = await Promise.allSettled([
          taskService.searchTasks(query, { pageSize: 5 }),
          projectService.searchProjects(query, { pageSize: 5 }),
        ])
        const taskItems = taskRes.status === 'fulfilled' ? (taskRes.value?.data || taskRes.value || []).map(transformTask) : []
        const projItems = projRes.status === 'fulfilled' ? (projRes.value?.data || projRes.value || []).map(transformProject) : []
        setTasks(taskItems.slice(0, 5))
        setProjects(projItems.slice(0, 5))
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(debounce)
  }, [query, isOpen])

  if (!isOpen) return null

  const hasResults = tasks.length > 0 || projects.length > 0

  return (
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-brand-border overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-brand-border">
          <Search className="w-5 h-5 text-brand-text-light flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects..."
            className="flex-1 text-base text-brand-foreground placeholder:text-brand-text-light focus:outline-none bg-transparent"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 rounded-lg hover:bg-brand-hover text-brand-text-light transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-brand-hover text-brand-text-light transition-colors text-xs font-medium border border-brand-border px-2">
            Esc
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center text-brand-text-light text-sm">Searching...</div>
          )}

          {!loading && query && !hasResults && (
            <div className="p-8 text-center px-4">
              <p className="text-base font-semibold text-brand-foreground">No results found</p>
              <p className="mt-1.5 text-sm text-brand-text-light">
                Nothing matched &quot;{query}&quot;. Try different keywords.
              </p>
            </div>
          )}

          {!loading && !query && (
            <div className="p-8 text-center px-4">
              <Search className="w-10 h-10 mx-auto mb-4 text-brand-text-light opacity-40" strokeWidth={1.25} />
              <p className="text-base font-semibold text-brand-foreground">Search tasks and projects</p>
              <p className="mt-1.5 text-sm text-brand-text-light">
                Type to find tasks and projects across your workspace.
              </p>
            </div>
          )}

          {!loading && tasks.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-2 text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Tasks</p>
              {tasks.map((task) => (
                <button
                  key={task.id}
                  onClick={() => { router.push(`/my-tasks?task=${task.id}`); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-hover transition-colors text-left"
                >
                  <CheckSquare className="w-4 h-4 text-brand-text-light flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-foreground truncate">{task.name}</p>
                    {task.project && <p className="text-xs text-brand-text-light">{task.project}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    task.status === 'Done' ? 'bg-green-100 text-green-700' :
                    task.status === 'In Progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{task.status}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-brand-text-light flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {!loading && projects.length > 0 && (
            <div className="py-2 border-t border-brand-border">
              <p className="px-4 py-2 text-xs font-semibold text-brand-text-muted uppercase tracking-wider">Projects</p>
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => { router.push(`/projects/${project.slug || project.id}`); onClose() }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-hover transition-colors text-left"
                >
                  <FolderOpen className="w-4 h-4 text-brand-text-light flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-foreground truncate">{project.name}</p>
                    {project.status && <p className="text-xs text-brand-text-light">{project.status}</p>}
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 text-brand-text-light flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-brand-border bg-brand-hover/50 flex items-center gap-4 text-xs text-brand-text-muted">
          <span><kbd className="px-1.5 py-0.5 bg-white border border-brand-border rounded text-xs">↵</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-brand-border rounded text-xs">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  )
}
