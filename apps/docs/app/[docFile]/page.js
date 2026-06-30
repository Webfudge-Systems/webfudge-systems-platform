import { notFound } from 'next/navigation';
import FudgeFlowForge from '../../components/docs/FudgeFlowForge';
import FudgeGrowMissionControl from '../../components/docs/FudgeGrowMissionControl';
import StandaloneHtmlDocFrame from '../../components/StandaloneHtmlDocFrame';
import { getApplication, getApplicationSlugs } from '../../lib/applications';

const HTML_DOC_SLUGS = new Set(['accounts', 'crm', 'pm']);

async function getHtmlDocs() {
  const slugs = await getApplicationSlugs();
  const docs = [];

  for (const slug of slugs) {
    if (!HTML_DOC_SLUGS.has(slug)) continue;

    const app = await getApplication(slug);
    if (app?.name) {
      docs.push({
        app,
        slug,
        fileName: `${app.name}.html`,
      });
    }
  }

  return docs;
}

async function getHtmlDoc(docFile) {
  const requestedFile = decodeURIComponent(docFile || '');
  const docs = await getHtmlDocs();

  return docs.find((doc) => doc.fileName.toLowerCase() === requestedFile.toLowerCase()) || null;
}

export async function generateStaticParams() {
  const docs = await getHtmlDocs();
  return docs.map((doc) => ({ docFile: doc.fileName }));
}

export async function generateMetadata({ params }) {
  const doc = await getHtmlDoc(params.docFile);

  if (!doc) {
    return { title: 'Not Found' };
  }

  return {
    title: `${doc.app.name}.html`,
    description: `${doc.app.name} standalone official documentation`,
  };
}

export default async function StandaloneHtmlDocumentationPage({ params }) {
  const doc = await getHtmlDoc(params.docFile);

  if (!doc) {
    notFound();
  }

  if (doc.slug === 'crm') {
    return <FudgeGrowMissionControl app={doc.app} fileName={doc.fileName} />;
  }

  if (doc.slug === 'pm') {
    return <FudgeFlowForge fileName={doc.fileName} />;
  }

  return <StandaloneHtmlDocFrame app={doc.app} slug={doc.slug} fileName={doc.fileName} />;
}
