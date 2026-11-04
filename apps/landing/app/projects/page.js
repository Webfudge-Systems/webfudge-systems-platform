import ProductPage from '../../components/product/ProductPage'
import { PRODUCT_PAGES } from '../../data/apps'
import { getPlans } from '../../lib/pricing'

const page = PRODUCT_PAGES.pm

export const metadata = {
  title: page.title,
  description: page.description,
  alternates: { canonical: '/projects' },
  openGraph: { title: page.title, description: page.description, url: '/projects' },
}

export default async function ProjectsPage() {
  const plans = await getPlans()
  return <ProductPage page={page} plans={plans.pm} />
}
