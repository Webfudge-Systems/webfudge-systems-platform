import BooksSalesInvoiceDetailPage from '@/app/_components/BooksSalesInvoiceDetailPage'
import BooksSalesInvoiceNewPage from '@/app/_components/BooksSalesInvoiceNewPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksSalesInvoiceNewPage />
  return <BooksSalesInvoiceDetailPage />
}
