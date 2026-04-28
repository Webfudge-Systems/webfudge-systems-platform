const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://webfudge.in';

export default function sitemap() {
  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/crm`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/pm`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${siteUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];
}
