import BooksCustomerDetailPage from '@/app/_components/BooksCustomerDetailPage'
import BooksSalesCustomerNewPage from '@/app/_components/BooksSalesCustomerNewPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksSalesCustomerNewPage />
  return <BooksCustomerDetailPage />
}
