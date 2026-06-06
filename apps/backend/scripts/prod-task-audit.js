'use strict';

const { Client } = require('pg');

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Set DATABASE_URL (e.g. production Postgres connection string).');
  process.exit(1);
}

async function main() {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await c.connect();

  const total = await c.query('SELECT COUNT(*)::int AS n FROM tasks');
  console.log('total tasks', total.rows[0].n);

  const byProj = await c.query(`
    SELECT COALESCE(p.name, '(no project)') AS project, COUNT(DISTINCT t.id)::int AS task_count
    FROM tasks t
    LEFT JOIN tasks_projects_lnk tpl ON tpl.task_id = t.id
    LEFT JOIN projects p ON p.id = tpl.project_id
    GROUP BY p.name
    ORDER BY task_count DESC NULLS LAST
  `);
  console.log('\nTasks by project:');
  for (const row of byProj.rows) console.log(`  ${row.task_count}\t${row.project}`);

  const crm = await c.query(`
    SELECT COUNT(DISTINCT t.id)::int AS n FROM tasks t
    WHERE EXISTS (SELECT 1 FROM tasks_deal_lnk d WHERE d.task_id = t.id)
       OR EXISTS (SELECT 1 FROM tasks_lead_company_lnk lc WHERE lc.task_id = t.id)
       OR EXISTS (SELECT 1 FROM tasks_client_account_lnk ca WHERE ca.task_id = t.id)
  `);
  console.log('\nCRM-linked tasks', crm.rows[0].n);

  const missingAssigner = await c.query(`
    SELECT COUNT(*)::int AS n
    FROM tasks t
    JOIN tasks_assignee_lnk asg ON asg.task_id = t.id
    LEFT JOIN tasks_assigner_lnk asn ON asn.task_id = t.id
    WHERE asn.task_id IS NULL AND asg.user_id IS NOT NULL
  `);
  console.log('missing assigner (reporter)', missingAssigner.rows[0].n);

  const sampleMissing = await c.query(`
    SELECT t.id, t.name, p.name AS project
    FROM tasks t
    JOIN tasks_projects_lnk tpl ON tpl.task_id = t.id
    JOIN projects p ON p.id = tpl.project_id
    WHERE p.name ILIKE ANY(ARRAY['%Sahayata%','%Garud%','%Greenway%','%Shambhala%','%PositiEV%'])
    ORDER BY p.name, t.id
  `);
  console.log('\nTasks on sample projects:');
  for (const row of sampleMissing.rows) console.log(`  ${row.id}\t${row.project}\t${row.name}`);

  const subtasks = await c.query('SELECT COUNT(*)::int AS n FROM tasks_parent_lnk');
  console.log('\nsubtasks', subtasks.rows[0].n);
  console.log('approx major tasks', total.rows[0].n - subtasks.rows[0].n);

  const orgs = await c.query(`
    SELECT o.id, o.name, COUNT(DISTINCT t.id)::int AS tasks
    FROM organizations o
    LEFT JOIN tasks_organization_lnk tol ON tol.organization_id = o.id
    LEFT JOIN tasks t ON t.id = tol.task_id
    GROUP BY o.id, o.name
    ORDER BY tasks DESC
  `);
  console.log('\nTasks by org:');
  for (const row of orgs.rows) console.log(`  org ${row.id} ${row.name}: ${row.tasks} tasks`);

  const abhiraj = await c.query(`
    SELECT u.id, u.email FROM up_users u WHERE u.email ILIKE '%abhirajmaid%' LIMIT 3
  `);
  console.log('\nAbhiraj user:', abhiraj.rows);
  const uid = abhiraj.rows[0]?.id;

  if (uid) {
    const role = await c.query(
      `
      SELECT ou.id, orole.code, orole.name, o.name AS org_name
      FROM organization_users ou
      JOIN organization_users_user_lnk oul ON oul.organization_user_id = ou.id
      LEFT JOIN organization_users_role_lnk orl ON orl.organization_user_id = ou.id
      LEFT JOIN organization_roles orole ON orole.id = orl.organization_role_id
      LEFT JOIN organization_users_organization_lnk ool ON ool.organization_user_id = ou.id
      LEFT JOIN organizations o ON o.id = ool.organization_id
      WHERE oul.user_id = $1
    `,
      [uid]
    );
    console.log('\nAbhiraj org role:', role.rows);

    const involved = await c.query(
      `
      SELECT COUNT(DISTINCT t.id)::int AS n
      FROM tasks t
      LEFT JOIN tasks_assignee_lnk ae ON ae.task_id = t.id
      LEFT JOIN tasks_assigner_lnk ar ON ar.task_id = t.id
      LEFT JOIN tasks_collaborators_lnk col ON col.task_id = t.id
      WHERE ae.user_id = $1 OR ar.user_id = $1 OR col.user_id = $1
    `,
      [uid]
    );
    console.log('tasks where user is assignee/assigner/collaborator', involved.rows[0].n);

    const onProjects = await c.query(
      `
      SELECT COUNT(DISTINCT t.id)::int AS n
      FROM tasks t
      JOIN tasks_projects_lnk tpl ON tpl.task_id = t.id
      JOIN projects_team_members_lnk ptm ON ptm.project_id = tpl.project_id
      WHERE ptm.user_id = $1
    `,
      [uid]
    );
    console.log('tasks on projects where user is team member', onProjects.rows[0].n);

    const visibleUnion = await c.query(
      `
      SELECT COUNT(DISTINCT t.id)::int AS n
      FROM tasks t
      WHERE EXISTS (
        SELECT 1 FROM tasks_assignee_lnk ae WHERE ae.task_id = t.id AND ae.user_id = $1
      ) OR EXISTS (
        SELECT 1 FROM tasks_assigner_lnk ar WHERE ar.task_id = t.id AND ar.user_id = $1
      ) OR EXISTS (
        SELECT 1 FROM tasks_collaborators_lnk col WHERE col.task_id = t.id AND col.user_id = $1
      ) OR EXISTS (
        SELECT 1 FROM tasks_projects_lnk tpl
        JOIN projects_team_members_lnk ptm ON ptm.project_id = tpl.project_id
        WHERE tpl.task_id = t.id AND ptm.user_id = $1
      )
    `,
      [uid]
    );
    console.log('tasks matching manager visibility OR (approx)', visibleUnion.rows[0].n);
  }

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
