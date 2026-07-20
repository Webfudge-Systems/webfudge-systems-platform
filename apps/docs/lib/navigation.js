/**
 * Static fallback navigation — used when Strapi is unavailable or for the
 * initial page load before API data arrives. Dynamic navigation is built
 * from API data via buildNavigationFromPages().
 */
export const STATIC_NAVIGATION = [
  {
    key: 'getting-started',
    title: 'Getting Started',
    items: [
      { label: 'Introduction', href: '/' },
      { label: 'System Overview', href: '/system-overview' },
    ],
  },
  {
    key: 'user-roles',
    title: 'User Roles',
    items: [
      { label: 'User Types & Roles', href: '/user-types' },
      { label: 'Permissions & Access', href: '/permissions' },
    ],
  },
  {
    key: 'applications',
    title: 'Product Docs',
    items: [
      { label: 'CRM — Fudge Grow', href: '/applications/crm' },
      { label: 'PM — Fudge Flow', href: '/applications/pm' },
      { label: 'Accounts — Fudge Base', href: '/applications/accounts' },
    ],
  },
  {
    key: 'reference',
    title: 'Reference',
    items: [
      { label: 'Component Catalog', href: '/components' },
      { label: 'Troubleshooting & FAQ', href: '/troubleshooting' },
      { label: 'Glossary', href: '/glossary' },
    ],
  },
];

/**
 * Build sidebar navigation from API-provided pages.
 * Groups by category, then sorts by order within each group.
 *
 * @param {Array} pages - documentation-page objects from Strapi
 * @returns {Array} navigation sections
 */
export function buildNavigationFromPages(pages = []) {
  if (!pages || pages.length === 0) return STATIC_NAVIGATION;

  const categoryMap = new Map();

  for (const page of pages) {
    const category = page.category || (page.application?.name ? 'Applications' : 'General');
    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category).push({
      label: formatNavigationLabel(page.title || page.slug),
      href: page.sourceType === 'html' && page.htmlDisplayMode === 'raw'
        ? `/docs/html/${page.slug}`
        : `/docs/${page.slug}`,
      order: page.order ?? 0,
      description: page.application?.name ? `From ${formatNavigationLabel(page.application.name)}` : undefined,
    });
  }

  // Sort items within each category by order
  const sections = [];
  for (const [title, items] of categoryMap.entries()) {
    sections.push({
      key: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      title,
      items: items.sort((a, b) => a.order - b.order),
    });
  }

  return sections;
}

export function formatNavigationLabel(label = '') {
  const normalized = String(label)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return 'Untitled page';

  const titleCased = normalized.replace(/\w\S*/g, (word) => {
    if (/^[A-Z0-9]{2,}$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return titleCased.length > 44 ? `${titleCased.slice(0, 41).trim()}...` : titleCased;
}

export function findNavItemByHref(href, navigation = STATIC_NAVIGATION) {
  for (const section of navigation) {
    const item = section.items.find((entry) => entry.href === href);
    if (item) return { section: section.title, ...item };
  }
  return null;
}
