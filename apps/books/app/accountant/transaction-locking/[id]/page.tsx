import BooksAccountantAddModulePage from '@/app/_components/BooksAccountantAddModulePage'
import BooksAccountantJournalDetailPage from '@/app/_components/BooksAccountantJournalDetailPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksAccountantAddModulePage moduleKey="transaction-locking" />
  return <BooksAccountantJournalDetailPage moduleKey="transaction-locking" />
}
