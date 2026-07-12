/** Root breadcrumb for VLM inner pages — mirrors CRM/PM workspace pattern. */
export const VLM_ROOT_BREADCRUMB = { label: 'VLM', href: '/vlm/vehicles' };

export function buildVlmBreadcrumb(...segments) {
  return [VLM_ROOT_BREADCRUMB, ...segments];
}
