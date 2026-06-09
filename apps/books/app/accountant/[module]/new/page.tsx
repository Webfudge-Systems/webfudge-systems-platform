import BooksAccountantAddModulePage from '@/app/_components/BooksAccountantAddModulePage'

export default function AccountantAddModulePage({ params }: { params: { module: string } }) {
  return <BooksAccountantAddModulePage moduleKey={params.module} />
}
