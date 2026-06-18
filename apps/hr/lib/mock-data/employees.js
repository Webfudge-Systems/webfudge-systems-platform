export const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Design', 'Marketing']

export const EMPLOYEES = [
  { id: 'emp-001', employeeId: 'WF-1001', name: 'Ankit Sharma', department: 'Engineering', designation: 'Senior Software Engineer', manager: 'Ravi Menon', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'Engineer', joinDate: '2022-03-15', email: 'ankit.sharma@webfudge.in', phone: '+91 98765 43210', dob: '1994-06-12', gender: 'Male', bloodGroup: 'B+', personalEmail: 'ankit.s@gmail.com', emergencyContact: 'Sunita Sharma (+91 98765 00001)', probationEnd: '2022-09-15', contractType: 'Permanent', workLocation: 'HQ Bangalore', shift: 'Morning (9–6)', bankName: 'HDFC Bank', accountNo: '****4521', ifsc: 'HDFC0001234', pan: 'ABCDE1234F', uan: '100123456789', esi: 'ESI123456' },
  { id: 'emp-002', employeeId: 'WF-1002', name: 'Priya Nair', department: 'Engineering', designation: 'Software Engineer', manager: 'Ankit Sharma', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'Engineer', joinDate: '2024-01-10', email: 'priya.nair@webfudge.in', phone: '+91 98765 43211' },
  { id: 'emp-003', employeeId: 'WF-1003', name: 'Ravi Menon', department: 'Engineering', designation: 'Engineering Manager', manager: 'CEO', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'Manager', joinDate: '2021-08-01', email: 'ravi.menon@webfudge.in' },
  { id: 'emp-004', employeeId: 'WF-1004', name: 'Sneha Reddy', department: 'Sales', designation: 'Sales Manager', manager: 'Vikram Singh', employmentType: 'Full-time', status: 'Active', location: 'Hyderabad', role: 'Manager', joinDate: '2020-11-20', email: 'sneha.reddy@webfudge.in' },
  { id: 'emp-005', employeeId: 'WF-1005', name: 'Vikram Singh', department: 'Sales', designation: 'VP Sales', manager: 'CEO', employmentType: 'Full-time', status: 'Active', location: 'Mumbai', role: 'Executive', joinDate: '2019-05-01', email: 'vikram.singh@webfudge.in' },
  { id: 'emp-006', employeeId: 'WF-1006', name: 'Kavya Iyer', department: 'HR', designation: 'HR Executive', manager: 'Meera Joshi', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'HR', joinDate: '2023-02-14', email: 'kavya.iyer@webfudge.in' },
  { id: 'emp-007', employeeId: 'WF-1007', name: 'Meera Joshi', department: 'HR', designation: 'HR Manager', manager: 'CEO', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'Manager', joinDate: '2018-07-09', email: 'meera.joshi@webfudge.in' },
  { id: 'emp-008', employeeId: 'WF-1008', name: 'Arjun Patel', department: 'Finance', designation: 'Finance Analyst', manager: 'Deepa Krishnan', employmentType: 'Full-time', status: 'Active', location: 'Ahmedabad', role: 'Finance', joinDate: '2022-09-01', email: 'arjun.patel@webfudge.in' },
  { id: 'emp-009', employeeId: 'WF-1009', name: 'Deepa Krishnan', department: 'Finance', designation: 'Finance Manager', manager: 'CEO', employmentType: 'Full-time', status: 'Active', location: 'Chennai', role: 'Manager', joinDate: '2017-04-12', email: 'deepa.krishnan@webfudge.in' },
  { id: 'emp-010', employeeId: 'WF-1010', name: 'Rohit Desai', department: 'Operations', designation: 'Operations Lead', manager: 'CEO', employmentType: 'Full-time', status: 'Active', location: 'Pune', role: 'Manager', joinDate: '2021-01-18', email: 'rohit.desai@webfudge.in' },
  { id: 'emp-011', employeeId: 'WF-1011', name: 'Aisha Khan', department: 'Design', designation: 'UI Designer', manager: 'Ravi Menon', employmentType: 'Full-time', status: 'Probation', location: 'Bangalore', role: 'Designer', joinDate: '2025-11-01', email: 'aisha.khan@webfudge.in' },
  { id: 'emp-012', employeeId: 'WF-1012', name: 'Suresh Kumar', department: 'Engineering', designation: 'DevOps Engineer', manager: 'Ravi Menon', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'Engineer', joinDate: '2023-06-20', email: 'suresh.kumar@webfudge.in' },
  { id: 'emp-013', employeeId: 'WF-1013', name: 'Neha Gupta', department: 'Marketing', designation: 'Marketing Specialist', manager: 'Vikram Singh', employmentType: 'Full-time', status: 'Active', location: 'Delhi', role: 'Marketing', joinDate: '2022-12-05', email: 'neha.gupta@webfudge.in' },
  { id: 'emp-014', employeeId: 'WF-1014', name: 'Karthik Rao', department: 'Engineering', designation: 'Product Manager', manager: 'Ravi Menon', employmentType: 'Full-time', status: 'Active', location: 'Bangalore', role: 'Product', joinDate: '2020-03-22', email: 'karthik.rao@webfudge.in' },
  { id: 'emp-015', employeeId: 'WF-1015', name: 'Divya Menon', department: 'Sales', designation: 'Account Executive', manager: 'Sneha Reddy', employmentType: 'Full-time', status: 'Notice', location: 'Kochi', role: 'Sales', joinDate: '2021-10-11', email: 'divya.menon@webfudge.in' },
  { id: 'emp-016', employeeId: 'WF-1016', name: 'Manish Tiwari', department: 'Engineering', designation: 'Intern', manager: 'Ankit Sharma', employmentType: 'Intern', status: 'Active', location: 'Bangalore', role: 'Intern', joinDate: '2025-01-06', email: 'manish.tiwari@webfudge.in' },
  { id: 'emp-017', employeeId: 'WF-1017', name: 'Lakshmi Venkat', department: 'Finance', designation: 'Payroll Specialist', manager: 'Deepa Krishnan', employmentType: 'Contract', status: 'Active', location: 'Chennai', role: 'Finance', joinDate: '2024-04-01', email: 'lakshmi.venkat@webfudge.in' },
  { id: 'emp-018', employeeId: 'WF-1018', name: 'Imran Sheikh', department: 'Operations', designation: 'Facility Coordinator', manager: 'Rohit Desai', employmentType: 'Full-time', status: 'Active', location: 'Mumbai', role: 'Ops', joinDate: '2023-08-15', email: 'imran.sheikh@webfudge.in' },
  { id: 'emp-019', employeeId: 'WF-1019', name: 'Pooja Sinha', department: 'Marketing', designation: 'Content Lead', manager: 'Neha Gupta', employmentType: 'Full-time', status: 'Active', location: 'Delhi', role: 'Marketing', joinDate: '2022-07-28', email: 'pooja.sinha@webfudge.in' },
  { id: 'emp-020', employeeId: 'WF-1020', name: 'Rajesh Pillai', department: 'Engineering', designation: 'QA Engineer', manager: 'Ankit Sharma', employmentType: 'Full-time', status: 'Exited', location: 'Bangalore', role: 'Engineer', joinDate: '2019-09-03', email: 'rajesh.pillai@webfudge.in' },
]

export function getEmployeeById(id) {
  return EMPLOYEES.find((e) => e.id === id) || null
}

export function filterEmployees({ search = '', department = '', status = '' } = {}) {
  const q = search.toLowerCase().trim()
  return EMPLOYEES.filter((e) => {
    if (department && e.department !== department) return false
    if (status && e.status !== status) return false
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q)
    )
  })
}

export const EMPLOYEE_DOCUMENTS = {
  'emp-001': [
    { name: 'Offer Letter', date: '2022-03-10', status: 'Verified' },
    { name: 'NDA', date: '2022-03-10', status: 'Verified' },
    { name: 'PAN Card', date: '2022-03-12', status: 'Verified' },
    { name: 'Aadhaar', date: '2022-03-12', status: 'Verified' },
    { name: 'Bank Proof', date: '2022-03-14', status: 'Verified' },
    { name: 'Degree Certificate', date: '2022-03-15', status: 'Pending' },
  ],
}

export const EMPLOYEE_OKRS = {
  'emp-001': [
    { title: 'Ship payments module v2', progress: 75 },
    { title: 'Reduce API latency by 20%', progress: 40 },
    { title: 'Mentor 2 junior engineers', progress: 90 },
  ],
}
