import BooksAccountantAddModulePage from '@/app/_components/BooksAccountantAddModulePage'
import BooksCurrencyAdjustmentDetailPage from '@/app/_components/BooksCurrencyAdjustmentDetailPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksAccountantAddModulePage moduleKey="currency-adjustments" />
  return <BooksCurrencyAdjustmentDetailPage />
}
