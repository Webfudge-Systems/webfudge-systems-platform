import BooksSalesAddModulePage from '@/app/_components/BooksSalesAddModulePage'
import BooksSalesDocDetailPage from '@/app/_components/BooksSalesDocDetailPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksSalesAddModulePage moduleKey="retainer-invoices" />
  return <BooksSalesDocDetailPage moduleKey="retainer-invoices" />
}
