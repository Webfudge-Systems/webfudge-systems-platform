# Task list cache & pagination fix

## Summary

PM **My Tasks** showed ~10 tasks while the database had ~31 major tasks. Root cause: Redis cached partial `GET /api/tasks` pages with wrong `meta.pagination.total`, and several apps only fetched the first page.

This update adds **permanent backend cache rules**, a **shared pagination helper**, and **app-wide fetch-all** usage so the issue does not recur.

## Scope

### Backend
| File | Change |
|------|--------|
| `apps/backend/src/middlewares/api-cache.js` | Never cache **any** `GET /api/tasks*` route; always invalidate org cache on task **writes** (including `POST /api/tasks`) |
| `apps/backend/src/api/task/controllers/task.js` | `Cache-Control: no-store` on `find`, `findOne`, `myWork` |
| `apps/backend/src/utils/content-api-helpers.js` | `readListQuery` reads nested `pagination.pageSize` from Koa query |

### Shared package
| File | Change |
|------|--------|
| `packages/utils/src/api/paginateStrapiList.js` | `paginateStrapiList()` — walks all pages, merges by id, ignores stale `meta.total` when a full page is returned |

### Apps
| App | Files |
|-----|--------|
| **PM** | `lib/api/taskService.js`, `lib/loadWorkspaceCalendar.js`, `app/my-tasks/page.js` (race guard) |
| **CRM** | `lib/api/taskService.js` (`fetchAll`), `lib/api/dashboardDataService.js`, `lib/api/teamPerformanceService.js`, `app/clients/tasks/page.js`, `components/dashboard/DashboardMyTasksWidget.jsx`, `lib/loadWorkspaceCalendar.js` |
| **Books** | `lib/api.ts` — `fetchTimeEntries` uses paginated `tasksApi.listAll` |

## Rules (prevent recurrence)

1. **Never Redis-cache task reads** — all `/api/tasks` and `/api/tasks/*` GET responses bypass the API cache middleware.
2. **Task writes always flush org cache** — create/update/delete on `/api/tasks` invalidates `cache:*:o:<orgId>:*` even though task GETs are not cached (other lists like projects/deals stay consistent).
3. **Frontends use `paginateStrapiList` / `fetchAll`** — do not rely on a single `pageSize=500` request without pagination; stale totals can still truncate lists on other endpoints.
4. **`Cache-Control: no-store`** on task list/detail/my-work responses — browsers and proxies must not cache task JSON.
5. **After deploy** — run `npm run flush:api-cache` once on production to clear legacy cached task pages.

## Usage

### PM / CRM task lists
```javascript
import taskService from '@/lib/api/taskService';

// PM
const rows = await taskService.fetchAllTasks({ pageSize: 500, sort: 'updatedAt:desc' });

// CRM (scope=crm applied automatically)
const { data } = await taskService.fetchAll({ sort: 'scheduledDate:desc', populate: [...] });
```

### Any Strapi list (dashboards, Books, etc.)
```javascript
import { paginateStrapiList } from '@webfudge/utils';

const rows = await paginateStrapiList(
  (page, pageSize, cacheBust) => client.get('/tasks', { 'pagination[page]': page, 'pagination[pageSize]': pageSize, _: cacheBust }),
  { pageSize: 500 }
);
```

## Ops / migration

```bash
cd apps/backend
# Requires REDIS_URL in env or apps/backend/.env
npm run flush:api-cache          # all orgs
npm run flush:api-cache -- --org 1
```

Deploy **backend first**, flush Redis, then deploy **PM + CRM + Books**.

## Related docs

- [REDIS_CACHE.md](./REDIS_CACHE.md) — general API cache behaviour
- [PM_LAST_COMMIT_UPDATE_SUMMARY.md](./PM_LAST_COMMIT_UPDATE_SUMMARY.md) — original My Tasks investigation
