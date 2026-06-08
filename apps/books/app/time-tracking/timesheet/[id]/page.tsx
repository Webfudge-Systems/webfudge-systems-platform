import BooksTimeEntryDetailPage from '@/app/_components/BooksTimeEntryDetailPage'
import BooksTimeEntryNewPage from '@/app/_components/BooksTimeEntryNewPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksTimeEntryNewPage />
  return <BooksTimeEntryDetailPage />
}
