import BooksDocumentDetailPage from '@/app/_components/BooksDocumentDetailPage'
import BooksDocumentNewPage from '@/app/_components/BooksDocumentNewPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksDocumentNewPage variant="documents" />
  return <BooksDocumentDetailPage isDocuments base="/documents" />
}
