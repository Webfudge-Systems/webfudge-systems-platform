import BooksProjectDetailPage from '@/app/_components/BooksProjectDetailPage'
import BooksProjectNewPage from '@/app/_components/BooksProjectNewPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksProjectNewPage />
  return <BooksProjectDetailPage />
}
