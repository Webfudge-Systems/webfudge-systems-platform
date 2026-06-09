import BooksPurchasesAddModulePage from '@/app/_components/BooksPurchasesAddModulePage'
import BooksPurchasesDocDetailPage from '@/app/_components/BooksPurchasesDocDetailPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksPurchasesAddModulePage moduleKey="bills" />
  return <BooksPurchasesDocDetailPage moduleKey="bills" />
}
