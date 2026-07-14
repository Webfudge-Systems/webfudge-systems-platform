// Ambient types for the untyped @webfudge/ui JS package (same pattern as apps/books).
declare module '@webfudge/ui' {
  export const Button: any
  export const Input: any
  export const Select: any
  export const Checkbox: any
  export const Textarea: any
  export const Card: any
  export const FormSectionCard: any
  export const Badge: any
  export const Avatar: any
  export const KPICard: any
  export const EmptyState: any
  export const LoadingSpinner: any
  export const Modal: any
  export const Table: any
  export const Pagination: any
  export const WorkspaceLayoutContent: any
  export const SidebarProductBranding: any
  export const LoginBrandCorner: any
  export const LoginProductCredit: any
  export const LoginMobileBrandHeader: any
  export const AppPageHeader: any
  export const WorkspaceHeader: any
  export const Tabs: any
  export const TabsWithActions: any
  export const TableRowActionMenuPortal: any
  export const ProgressBar: any
  export const DashboardKpiRow: any
  export const DashboardChartPanel: any
  export const DashboardChartEmpty: any
  export const DonutChartFrame: any
  export const DONUT_TOOLTIP_WRAPPER_STYLE: any
  export const PRIMARY_ORANGE_SHADES: any
  export const DASHBOARD_CHART_ACCENT: any
  export const DashboardBarTooltip: any
  export const DASHBOARD_BAR_TOOLTIP_CURSOR: any
  export const GradientStackedBarChart: any
  export const buildUserSelectOptions: any
  export const InfoSection: any
  export const InfoRow: any
  export const DetailColumnHeading: any
  export const entityInfoLabelClass: any
  export const useTableColumnPreferences: any
  export const useTableSort: any
  export const TableColumnPicker: any
  export const TableSortDropdown: any
  export const TableCellOwner: any
  export const TableCellCreated: any
  export const TableCellText: any
  export const TableCellSource: any
  export const TableCellStatusPill: any
}

declare module '@webfudge/ui/utils/notificationDisplay' {
  export function isUrgentNotification(notification: any): boolean
  export function notificationHref(notification: any): string | null
  export function transformNotificationForDisplay(
    notification: any,
    formatTime: (ts: string) => string
  ): any
}
