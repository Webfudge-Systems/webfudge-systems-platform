'use client';

/** Project → "Risk & scope" tab (W19, SaaS only): risk radar + scope-creep watcher, each plan-gated. */

import { PlanGate } from '@webfudge/ui';
import ProjectRiskPanel from './ProjectRiskPanel';
import ProjectScopeWatchPanel from './ProjectScopeWatchPanel';

export default function ProjectRiskScopeTab({ projectId, onTasksChanged }) {
  return (
    <div className="space-y-6">
      <PlanGate feature="pm.risk_radar" compact>
        <ProjectRiskPanel projectId={projectId} onTasksChanged={onTasksChanged} />
      </PlanGate>
      <PlanGate feature="pm.scope_watch" compact>
        <ProjectScopeWatchPanel projectId={projectId} />
      </PlanGate>
    </div>
  );
}
