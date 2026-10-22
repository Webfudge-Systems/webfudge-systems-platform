import { notFound } from 'next/navigation';
import AppHubClient from '../../../components/AppHubClient';
import { getApplication, getApplicationSlugs } from '../../../lib/applications';

export async function generateStaticParams() {
  const slugs = await getApplicationSlugs();
  return slugs.map((app) => ({ app }));
}

export async function generateMetadata({ params }) {
  const app = await getApplication(params.app);
  if (!app) return { title: 'Not Found' };
  return {
    title: app.name,
    description: app.tagline,
  };
}

export default async function AppHubPage({ params }) {
  const app = await getApplication(params.app);

  if (!app) {
    notFound();
  }

  return <AppHubClient app={app} />;
}
