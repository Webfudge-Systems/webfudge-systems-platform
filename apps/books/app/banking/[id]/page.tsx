import BooksBankAccountDetailPage from '@/app/_components/BooksBankAccountDetailPage'
import BooksBankAccountNewPage from '@/app/_components/BooksBankAccountNewPage'

export default function BankingDetailRoutePage({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksBankAccountNewPage />
  return <BooksBankAccountDetailPage />
}
