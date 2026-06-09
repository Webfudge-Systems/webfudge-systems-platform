import BooksItemsModuleNewPage from '@/app/_components/BooksItemsModuleNewPage'
import BooksPriceListDetailPage from '@/app/_components/BooksPriceListDetailPage'

export default function PriceListDetailRoutePage({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksItemsModuleNewPage moduleKey="price-lists" />
  return <BooksPriceListDetailPage />
}
