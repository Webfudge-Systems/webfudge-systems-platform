import { COURSES, LEARNING_PATHS, ASSIGNMENTS, CERTIFICATES } from './mock-data/learning'

export function computeLearningStats(
  courses = COURSES,
  paths = LEARNING_PATHS,
  assignments = ASSIGNMENTS,
  certificates = CERTIFICATES
) {
  const totalEnrolled = courses.reduce((sum, c) => sum + c.enrolled, 0)
  const avgCompletion =
    courses.length > 0
      ? Math.round(courses.reduce((sum, c) => sum + c.completion, 0) / courses.length)
      : 0
  const inProgress = assignments.filter((a) => a.status === 'In Progress').length

  return {
    totalCourses: courses.length,
    activePaths: paths.filter((p) => p.status === 'Active').length,
    totalPaths: paths.length,
    totalEnrolled,
    avgCompletion,
    inProgressAssignments: inProgress,
    totalAssignments: assignments.length,
    certificatesIssued: certificates.length,
  }
}

export function getLearningTabItems() {
  return [
    { key: 'courses', label: 'Courses', count: COURSES.length },
    { key: 'paths', label: 'Learning Paths', count: LEARNING_PATHS.length },
    { key: 'assignments', label: 'Assignments', count: ASSIGNMENTS.length },
    { key: 'certificates', label: 'Certificates', count: CERTIFICATES.length },
  ]
}

export function filterCourses(courses, { search = '', categoryFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return courses.filter((c) => {
    if (categoryFilter && c.category !== categoryFilter) return false
    if (!q) return true
    return (
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    )
  })
}

export function getCourseCategories(courses = COURSES) {
  return [...new Set(courses.map((c) => c.category))].sort()
}

export function filterLearningPaths(paths, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return paths.map((row, index) => ({ ...row, id: `path-${index}` }))
  return paths
    .map((row, index) => ({ ...row, id: `path-${index}` }))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.assigned.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
    )
}

export function filterAssignments(assignments, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return assignments.map((row, index) => ({ ...row, id: `asn-${index}` }))
  return assignments
    .map((row, index) => ({ ...row, id: `asn-${index}` }))
    .filter(
      (a) =>
        a.employee.toLowerCase().includes(q) ||
        a.course.toLowerCase().includes(q) ||
        a.status.toLowerCase().includes(q)
    )
}

export function filterCertificates(certificates, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return certificates.map((row, index) => ({ ...row, id: `cert-${index}` }))
  return certificates
    .map((row, index) => ({ ...row, id: `cert-${index}` }))
    .filter(
      (c) =>
        c.employee.toLowerCase().includes(q) ||
        c.course.toLowerCase().includes(q) ||
        c.certId.toLowerCase().includes(q)
    )
}
