export const COURSES = [
  { id: 'c1', title: 'React Advanced Patterns', category: 'Engineering', duration: '8h', enrolled: 34, completion: 68, color: 'bg-orange-100' },
  { id: 'c2', title: 'Leadership Fundamentals', category: 'Management', duration: '6h', enrolled: 22, completion: 45, color: 'bg-blue-100' },
  { id: 'c3', title: 'POSH Compliance', category: 'Compliance', duration: '2h', enrolled: 142, completion: 92, color: 'bg-green-100' },
  { id: 'c4', title: 'Excel for Finance', category: 'Finance', duration: '5h', enrolled: 18, completion: 55, color: 'bg-purple-100' },
  { id: 'c5', title: 'Sales Negotiation', category: 'Sales', duration: '4h', enrolled: 24, completion: 38, color: 'bg-amber-100' },
  { id: 'c6', title: 'Design Systems 101', category: 'Design', duration: '3h', enrolled: 12, completion: 72, color: 'bg-pink-100' },
]

export const LEARNING_PATHS = [
  { name: 'New Engineer Onboarding', courses: 5, assigned: 'Engineering', completion: 78, status: 'Active' },
  { name: 'Manager Essentials', courses: 4, assigned: 'Managers', completion: 52, status: 'Active' },
]

export const ASSIGNMENTS = [
  { employee: 'Priya Nair', course: 'React Advanced Patterns', assignedBy: 'Ravi Menon', assigned: '2026-05-01', due: '2026-06-30', progress: 40, status: 'In Progress' },
  { employee: 'Manish Tiwari', course: 'New Engineer Onboarding', assignedBy: 'Ankit Sharma', assigned: '2026-01-10', due: '2026-03-10', progress: 85, status: 'In Progress' },
]

export const CERTIFICATES = [
  { employee: 'Suresh Kumar', course: 'POSH Compliance', completed: '2026-01-15', certId: 'CERT-2026-0042' },
  { employee: 'Kavya Iyer', course: 'Leadership Fundamentals', completed: '2025-11-20', certId: 'CERT-2025-1188' },
]
