import ModulePage from '@/app/_components/ModulePage'

export default function ItemsPage() {
  return <ModulePage title="All Items" subtitle="Default item type is Service for agency workflows." columns={[
    { key: 'name', title: 'Name' },
    { key: 'sku', title: 'SKU' },
    { key: 'type', title: 'Type' },
    { key: 'rate', title: 'Rate' },
  ]} data={[
    { id: 1, name: 'Website Design Sprint', sku: 'ITEM-001', type: 'Service', rate: '$2,000' },
    { id: 2, name: 'Retainer Package', sku: 'ITEM-002', type: 'RetainerPackage', rate: '$5,000' },
  ]} />
}
