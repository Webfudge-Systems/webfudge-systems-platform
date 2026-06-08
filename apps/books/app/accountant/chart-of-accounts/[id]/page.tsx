import BooksAccountantAddModulePage from '@/app/_components/BooksAccountantAddModulePage'
import BooksChartOfAccountDetailPage from '@/app/_components/BooksChartOfAccountDetailPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksAccountantAddModulePage moduleKey="chart-of-accounts" />
  return <BooksChartOfAccountDetailPage />
}
