import BooksPurchasesAddModulePage from '@/app/_components/BooksPurchasesAddModulePage'

export default function PurchasesAddModulePage({ params }: { params: { module: string } }) {
  return <BooksPurchasesAddModulePage moduleKey={params.module} />
}
