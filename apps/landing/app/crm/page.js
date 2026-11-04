import ProductPage from '../../components/product/ProductPage'
import { PRODUCT_PAGES } from '../../data/apps'
import { getPlans } from '../../lib/pricing'

const page = PRODUCT_PAGES.crm

export const metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: '/crm' },
  openGraph: { title: page.title, description: page.description, url: '/crm' },
}

export default async function CrmPage() {
  const plans = await getPlans()
  return <ProductPage page={page} plans={plans.crm} />
}
