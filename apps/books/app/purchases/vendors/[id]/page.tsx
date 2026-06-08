import BooksVendorDetailPage from '@/app/_components/BooksVendorDetailPage'
import BooksVendorNewPage from '@/app/_components/BooksVendorNewPage'

export default function Page({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksVendorNewPage />
  return <BooksVendorDetailPage />
}
