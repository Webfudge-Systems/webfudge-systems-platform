export const OPEN_JOBS = [
  { id: 'job-1', title: 'Senior React Developer', department: 'Engineering', location: 'Bangalore', posted: '2026-05-10', applications: 42, status: 'Open' },
  { id: 'job-2', title: 'Sales Executive', department: 'Sales', location: 'Mumbai', posted: '2026-05-22', applications: 28, status: 'Open' },
  { id: 'job-3', title: 'HR Coordinator', department: 'HR', location: 'Bangalore', posted: '2026-04-15', applications: 15, status: 'Paused' },
]

export const PIPELINE_STAGES = ['Applied', 'Screening', 'Interview Round 1', 'Interview Round 2', 'Offer', 'Hired', 'Rejected']

export const CANDIDATES = [
  { id: 'c1', name: 'Vikash Mehta', role: 'Senior React Developer', stage: 'Interview Round 1', source: 'LinkedIn', applied: '2026-05-12', rating: 4 },
  { id: 'c2', name: 'Shruti Bose', role: 'Senior React Developer', stage: 'Screening', source: 'Referral', applied: '2026-05-18', rating: 3 },
  { id: 'c3', name: 'Aditya Verma', role: 'Sales Executive', stage: 'Offer', source: 'Portal', applied: '2026-05-25', rating: 5 },
  { id: 'c4', name: 'Tanvi Shah', role: 'HR Coordinator', stage: 'Applied', source: 'LinkedIn', applied: '2026-06-01', rating: 2 },
  { id: 'c5', name: 'Nikhil Jain', role: 'Senior React Developer', stage: 'Hired', source: 'Referral', applied: '2026-04-20', rating: 5 },
]

export const INTERVIEWS = [
  { candidate: 'Vikash Mehta', role: 'Senior React Developer', round: 'Technical', interviewer: 'Ankit Sharma', datetime: '2026-06-05 14:00', format: 'Video', status: 'Scheduled' },
  { candidate: 'Shruti Bose', role: 'Senior React Developer', round: 'HR Screen', interviewer: 'Kavya Iyer', datetime: '2026-06-04 11:00', format: 'Video', status: 'Completed' },
]

export const OFFERS = [
  { candidate: 'Aditya Verma', role: 'Sales Executive', offerDate: '2026-05-30', ctc: 900000, status: 'Sent' },
  { candidate: 'Nikhil Jain', role: 'Senior React Developer', offerDate: '2026-04-28', ctc: 1800000, status: 'Accepted' },
]
