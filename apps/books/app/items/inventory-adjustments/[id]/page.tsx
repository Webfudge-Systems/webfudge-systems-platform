import BooksInventoryAdjustmentDetailPage from '@/app/_components/BooksInventoryAdjustmentDetailPage'
import BooksItemsModuleNewPage from '@/app/_components/BooksItemsModuleNewPage'

export default function InventoryAdjustmentDetailRoutePage({ params }: { params: { id: string } }) {
  if (params.id === 'new') return <BooksItemsModuleNewPage moduleKey="inventory-adjustments" />
  return <BooksInventoryAdjustmentDetailPage />
}
