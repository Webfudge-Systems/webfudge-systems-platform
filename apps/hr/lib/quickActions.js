import { UserPlus, CalendarOff, Receipt, Briefcase } from 'lucide-react'

export const HR_QUICK_ACTION_IDS = {
  ADD_EMPLOYEE: 'add-employee',
  APPLY_LEAVE: 'apply-leave',
  NEW_EXPENSE: 'new-expense',
  POST_JOB: 'post-job',
}

export const HR_QUICK_ACTION_META = {
  [HR_QUICK_ACTION_IDS.ADD_EMPLOYEE]: {
    title: 'Add employee',
    subtitle: 'Create a new employee record',
    icon: UserPlus,
    submitLabel: 'Create employee',
  },
  [HR_QUICK_ACTION_IDS.APPLY_LEAVE]: {
    title: 'Apply leave',
    subtitle: 'Submit a leave request for approval',
    icon: CalendarOff,
    submitLabel: 'Submit request',
  },
  [HR_QUICK_ACTION_IDS.NEW_EXPENSE]: {
    title: 'New expense',
    subtitle: 'Submit an expense claim with receipt',
    icon: Receipt,
    submitLabel: 'Submit claim',
  },
  [HR_QUICK_ACTION_IDS.POST_JOB]: {
    title: 'Post job',
    subtitle: 'Publish a new open role',
    icon: Briefcase,
    submitLabel: 'Post job',
  },
}
