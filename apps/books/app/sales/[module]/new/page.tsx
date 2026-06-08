import BooksSalesAddModulePage from '@/app/_components/BooksSalesAddModulePage'

export default function SalesAddModulePage({ params }: { params: { module: string } }) {
  return <BooksSalesAddModulePage moduleKey={params.module} />
}
