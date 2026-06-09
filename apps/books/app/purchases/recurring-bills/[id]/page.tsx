import BooksPurchasesAddModulePage from '@/app/_components/BooksPurchasesAddModulePage'
import BooksPurchasesDocDetailPage from '@/app/_components/BooksPurchasesDocDetailPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksPurchasesAddModulePage moduleKey="recurring-bills" />
  return <BooksPurchasesDocDetailPage moduleKey="recurring-bills" />
}
