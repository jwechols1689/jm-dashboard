// Asana tasks function -- fetches tasks assigned to John-Mark
// Filters to high/medium priority, due today or overdue

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  const token = process.env.ASANA_ACCESS_TOKEN;
  if (!token) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ tasks: [], error: 'Asana token not configured' })
    };
  }

  try {
    // Get the current user (John-Mark)
    const meRes = await fetch('https://app.asana.com/api/1.0/users/me', {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const meData = await meRes.json();
    const userId = meData.data.gid;

    // Get workspace
    const workspaceRes = await fetch('https://app.asana.com/api/1.0/workspaces', {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' }
    });
    const workspaceData = await workspaceRes.json();
    const workspaceId = workspaceData.data[0].gid;

    // Get tasks assigned to me, incomplete, sorted by due date
    const today = new Date().toISOString().split('T')[0];
    const tasksRes = await fetch(
      `https://app.asana.com/api/1.0/tasks?assignee=${userId}&workspace=${workspaceId}&completed_since=now&opt_fields=name,due_on,priority,projects.name,custom_fields&limit=20`,
      { headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' } }
    );
    const tasksData = await tasksRes.json();

    const tasks = (tasksData.data || []).map(task => {
      // Determine priority from custom fields
      let priority = 'med';
      if (task.custom_fields) {
        const priorityField = task.custom_fields.find(f =>
          f.name && f.name.toLowerCase() === 'priority'
        );
        if (priorityField && priorityField.display_value) {
          const pv = priorityField.display_value.toLowerCase();
          if (pv === 'high') priority = 'high';
          else if (pv === 'low') priority = 'low';
        }
      }

      // Check if due today or overdue
      const isUrgent = task.due_on && task.due_on <= today;
      if (isUrgent && priority === 'low') priority = 'med';

      return {
        name: task.name,
        due: task.due_on || null,
        priority,
        project: task.projects && task.projects[0] ? task.projects[0].name : null
      };
    })
    .sort((a, b) => {
      const order = { high: 0, med: 1, low: 2 };
      return (order[a.priority] || 1) - (order[b.priority] || 1);
    })
    .slice(0, 8);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ tasks })
    };

  } catch (err) {
    console.error('Asana error:', err);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ tasks: [], error: err.message })
    };
  }
};
