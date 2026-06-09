'use client'

import BooksItemsModuleNewPage from '@/app/_components/BooksItemsModuleNewPage'

export default function ItemsAddModulePage({ params }: { params: { module: string } }) {
  return <BooksItemsModuleNewPage moduleKey={params.module} />
}
