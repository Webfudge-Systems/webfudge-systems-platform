import BooksItemDetailPage from '@/app/_components/BooksItemDetailPage'
import BooksItemsModuleNewPage from '@/app/_components/BooksItemsModuleNewPage'

export default function ItemDetailRoutePage({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksItemsModuleNewPage moduleKey="all" />
  return <BooksItemDetailPage />
}
