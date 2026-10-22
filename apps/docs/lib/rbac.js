/**
 * Dev-only bypass — set NEXT_PUBLIC_DOCS_ADMIN_OPEN=true to skip the admin auth gate locally.
 */
export function isAdminDashboardOpen() {
  return process.env.NEXT_PUBLIC_DOCS_ADMIN_OPEN === 'true';
}

export function canAccessAdminDashboard(isDocsAdmin = false) {
  return isDocsAdmin || isAdminDashboardOpen();
}

export function isDocsViewer() {
  return true;
}

