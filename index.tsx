/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";

// --- START: Hardcoded Source Documents ---
// This content is used as the basis for the pre-built plan and for AI report generation.
const agmscHandbook = `
AGMSC Handbook, Rev. 4.0 |
Page | 1
appalachian
gas measurement
short course
Handbook and Procedures
AGMSC Handbook, Rev. 4.0 |
Contents
Mission Statement.
Members
Section 1- Officers
4
4
5
President/Chief Executive Officer
.5
Vice President / General Committee Chairperson.
.8
Secretary
10
Treasurer
12
Section 2 - Committee Roles and Responsibilities.
13
Program Committee Chairperson
13
Vice Program Chairperson
18
Program Deputy.
20
Assistant Program Deputy
23
Program Deputy: Hands-On & Demonstrations Workshops.....25
Assistant Program Deputy: Hands-On & Demonstrations
Workshops.
28
Publications Chairperson.
30
Exhibits Committee Chairperson
32
Publicity Committee Chairperson
34
On-Site Catering Committee Chairperson
.36
Budget & Finance Committee Chairperson
38
Audit Committee Chairperson.
39
Registration Committee Chairperson.
.40
General Committee Member
42
IMPORTANT DATES FOR AGMSC PUBLICATIONS
Section 3 Instructions to Lecture Authors..
43
44
Section 5- Lecture Monitors.
45
Class Monitor.
.45
Rating Card..
47
Monitor Instructions - Lecture
48
Section 6-Hands-On Demonstration Monitors
49
Monitor Instructions - Hands-On Workshops
.49
Section 7 - Short Course Checklist
Section 8 - Organizational Chart.
Section 9- Past Presidents
Section 10-Templates, Sample Letters and Word Picture Submission Form..
Section 11 - Robert Morris University.
Page | 2
70
AGMSC Handbook, Rev. 4.`;
// --- END: Hardcoded Source Documents ---

// --- TypeScript Interfaces ---
interface Task {
  id: number;
  taskName: string;
  responsible: string;
  dueDate: string; // YYYY-MM-DD
  status: 'Not-Started' | 'In-Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  source: string;
  comments: string;
}

interface Plan {
  termYear: string;
  periods: {
    periodName: string; // e.g., "August - October 2024"
    tasks: Task[];
  }[];
}

type ProgressViewMode = 'Dashboard' | 'Kanban' | 'Gantt';

// --- Pre-built Default Plan ---
const currentYear = new Date().getFullYear();
const defaultPlan: Plan = {
  termYear: `${currentYear}-${currentYear + 1}`,
  periods: [
    {
      periodName: `August - October ${currentYear}`,
      tasks: [
        { id: 1, taskName: "Review and understand the duties of the General Chairperson", responsible: "General Chairman", dueDate: `${currentYear}-08-15`, status: 'Not-Started', priority: 'High', source: 'Section 1, Page 8', comments: '' },
        { id: 2, taskName: "Schedule and preside over the first General Committee meeting", responsible: "General Chairman", dueDate: `${currentYear}-09-01`, status: 'Not-Started', priority: 'High', source: 'Section 1, Page 8', comments: '' },
        { id: 3, taskName: "Appoint all committee chairpersons for the term", responsible: "General Chairman", dueDate: `${currentYear}-09-15`, status: 'Not-Started', priority: 'Medium', source: 'Section 1, Page 8', comments: '' },
      ],
    },
    {
        periodName: `November ${currentYear} - January ${currentYear + 1}`,
        tasks: [
            { id: 4, taskName: "Monitor Program Committee progress on speaker selection", responsible: "General Chairman", dueDate: `${currentYear}-11-20`, status: 'Not-Started', priority: 'Medium', source: 'Section 2, Page 13', comments: '' },
            { id: 5, taskName: "Coordinate with Treasurer on initial budget review", responsible: "General Chairman", dueDate: `${currentYear + 1}-01-10`, status: 'Not-Started', priority: 'High', source: 'Section 1, Page 12', comments: '' },
        ],
    },
  ],
};


// --- Global State and API Initialization ---
let ai: GoogleGenAI | null = null;

// --- App Component ---
const App = () => {
  const [plan, setPlan] = useState<Plan | null>(defaultPlan);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('baseline');
  const [isAdmin, setIsAdmin] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showModal, setShowModal] = useState(false);

  const generatePlan = useCallback(async (year: string) => {
    if (!ai) {
      setError("AI Client not initialized. Please log in via the Admin tab.");
      showNotification("AI Client not initialized. Please log in via the Admin tab.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = `Based on the provided AGMSC Handbook, create a detailed project plan for the General Committee Chairperson for the ${year} term. The plan should be structured into logical time periods (e.g., "August - October", "November - January", etc.). For each period, list specific tasks. Each task must include a responsible party (default to 'General Chairman'), a suggested due date within the period, a priority (High, Medium, or Low), and the source from the handbook (e.g., "Section 1, Page 5"). The status for all initial tasks should be 'Not-Started' and comments should be an empty string. Ensure due dates are in YYYY-MM-DD format and fall realistically within the term year provided. Focus on actionable items relevant to the General Chairman's role.

      Context Document:
      ${agmscHandbook}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              termYear: { type: Type.STRING },
              periods: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    periodName: { type: Type.STRING },
                    tasks: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.INTEGER },
                          taskName: { type: Type.STRING },
                          responsible: { type: Type.STRING },
                          dueDate: { type: Type.STRING },
                          status: { type: Type.STRING },
                          priority: { type: Type.STRING },
                          source: { type: Type.STRING },
                          comments: { type: Type.STRING },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const parsedPlan = JSON.parse(response.text) as Plan;
      let idCounter = 1;
      parsedPlan.periods.forEach(p => p.tasks.forEach(t => t.id = idCounter++));
      setPlan(parsedPlan);
      showNotification("New plan generated successfully!");

    } catch (e) {
      console.error(e);
      setError(`Failed to generate plan. Please check your API Key and try again. Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLogin = (password: string, key: string) => {
    if (password === '0665' && key) {
      try {
        ai = new GoogleGenAI({ apiKey: key });
        setIsAdmin(true);
        setActiveTab('baseline');
        showNotification("Admin login successful. AI features enabled.");
        return { success: true, error: null };
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI:", e);
        const errorMessage = `Failed to initialize AI client. Please check the API Key format. Error: ${e instanceof Error ? e.message : String(e)}`;
        return { success: false, error: errorMessage };
      }
    }
    return { success: false, error: 'Login failed. Please check your password and API key.' };
  };

  const handleLogout = () => {
    setIsAdmin(false);
    ai = null;
    setActiveTab('baseline');
    showNotification("You have been logged out.");
  };
  
  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    if (!plan) return;
    const newPlan = { ...plan };
    newPlan.periods.forEach(period => {
      const taskIndex = period.tasks.findIndex(t => t.id === updatedTask.id);
      if (taskIndex !== -1) {
        period.tasks[taskIndex] = updatedTask;
      }
    });
    setPlan(newPlan);
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'source'>) => {
    if (!plan) return;
    const newTask: Task = {
      ...newTaskData,
      id: Date.now(), // Simple unique ID
      source: 'Admin Added',
    };
    const newPlan = { ...plan };
    const taskDueDate = new Date(newTask.dueDate);
    let periodFound = false;
    for (const period of newPlan.periods) {
        const periodMonth = new Date(period.tasks[0]?.dueDate || plan.termYear.split('-')[0]).getMonth();
        if (taskDueDate.getMonth() >= periodMonth) {
           period.tasks.push(newTask);
           period.tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
           periodFound = true;
           break;
        }
    }
    if(!periodFound) {
        newPlan.periods[0].tasks.push(newTask);
        newPlan.periods[0].tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }

    setPlan(newPlan);
    showNotification("Task added successfully!");
    setActiveTab('baseline');
  };

  const handleCommentSave = (taskId: number, newComment: string) => {
    if (!plan) return;
    const newPlan = JSON.parse(JSON.stringify(plan)) as Plan;
    for (const period of newPlan.periods) {
        const task = period.tasks.find(t => t.id === taskId);
        if (task) {
            task.comments = newComment;
            break;
        }
    }
    setPlan(newPlan);
    setShowModal(false);
    setEditingTask(null);
  };

  const handleOpenModal = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const allTasks = plan?.periods.flatMap(p => p.tasks) || [];

  return (
    <>
      {notification && <Notification message={notification} />}
      {showModal && editingTask && (
        <CommentModal
          task={editingTask}
          onClose={() => setShowModal(false)}
          onSave={handleCommentSave}
          isAdmin={isAdmin}
        />
      )}
      <Header
        termYear={plan?.termYear}
        onTermChange={(newYear) => generatePlan(newYear)}
        isAdmin={isAdmin}
      />
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} isAdmin={isAdmin} onLogout={handleLogout} />

      {loading ? (
        <Loader />
      ) : error ? (
        <div id="error-container">
          <h2>An Error Occurred</h2>
          <pre>{error}</pre>
        </div>
      ) : (
        <div id="plan-output">
          {activeTab === 'baseline' && plan && (
            <BaselineTasksView plan={plan} onTaskUpdate={handleTaskUpdate} onOpenModal={handleOpenModal} />
          )}
          {activeTab === 'progress' && plan && (
             <ProgressViewer allTasks={allTasks} termYear={plan.termYear} />
          )}
          {activeTab === 'reports' && isAdmin && plan && (
            <AutomatedReportsView plan={plan} />
          )}
          {activeTab === 'addTask' && isAdmin && (
              <AddTaskView onAddTask={handleAddTask} />
          )}
          {activeTab === 'saveLoad' && isAdmin && (
              <SaveLoadView
                  currentPlan={plan}
                  onPlanLoad={(loadedPlan) => {
                      setPlan(loadedPlan);
                      showNotification("Plan loaded successfully!");
                      setActiveTab('baseline');
                  }}
              />
          )}
          {activeTab === 'admin' && !isAdmin && (
              <AdminLoginView onLogin={handleLogin} />
          )}
        </div>
      )}
    </>
  );
};

// --- Child Components ---

const AdminLoginView = ({ onLogin }: { onLogin: (password: string, key: string) => { success: boolean, error: string | null } }) => {
    const [password, setPassword] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const result = onLogin(password, apiKey);
        if (!result.success) {
            setError(result.error || 'An unknown error occurred.');
        }
    };

    return (
        <div className="admin-panel">
            <header style={{padding: '0 0 1.5rem 0'}}>
                <h1>Admin Login</h1>
                <p>Enter credentials to enable AI and admin features.</p>
            </header>
            <form id="admin-login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="admin-password">Admin Password</label>
                    <input
                        type="password"
                        id="admin-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="api-key">Google Gemini API Key</label>
                    <input
                        type="password"
                        id="api-key"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        required
                    />
                </div>
                {error && <p id="admin-login-error">{error}</p>}
                <button type="submit">Login</button>
            </form>
        </div>
    );
};


const Header = ({ termYear, onTermChange, isAdmin }: { termYear?: string, onTermChange: (newYear: string) => void, isAdmin: boolean }) => {
  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState(termYear || "");

  useEffect(() => {
    setYear(termYear || "");
  }, [termYear]);

  const handleSave = () => {
    if (year.match(/^\d{4}-\d{4}$/)) {
      onTermChange(year);
      setEditing(false);
    } else {
      alert("Please enter the year in YYYY-YYYY format.");
    }
  };

  return (
    <header>
      <h1>AGMSC General Committee Chairman</h1>
      <p>A comprehensive project plan powered by Gemini</p>
      {termYear && (
        <div className="term-display">
          {!editing ? (
            <>
              <h2>Term: {termYear}</h2>
              {isAdmin && <button className="action-btn-small" onClick={() => setEditing(true)}>Regenerate Plan for New Term</button>}
            </>
          ) : (
            <div className="term-edit">
              <label htmlFor="term-year-input">New Term:</label>
              <input
                id="term-year-input"
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="YYYY-YYYY"
              />
              <button className="action-btn-small primary" onClick={handleSave}>Generate</button>
              <button className="action-btn-small" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};


const Tabs = ({ activeTab, setActiveTab, isAdmin, onLogout }: { activeTab: string, setActiveTab: (tab: string) => void, isAdmin: boolean, onLogout: () => void }) => {
    const baseTabs = [
        { id: 'baseline', label: 'Baseline Tasks' },
        { id: 'progress', label: 'Progress Viewer' },
    ];

    const adminTabs = [
        { id: 'reports', label: 'Automated Reports' },
        { id: 'addTask', label: 'Add Task' },
        { id: 'saveLoad', label: 'Save/Load Plan' }
    ];

    const loginTab = { id: 'admin', label: 'Admin Login' };
    
    const tabs = isAdmin ? [...baseTabs, ...adminTabs] : [...baseTabs, loginTab];

    return (
      <nav className="tabs-nav">
          {tabs.map(tab => (
              <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
              >
                  {tab.label}
              </button>
          ))}
          {isAdmin && <button className="tab-btn logout-btn" onClick={onLogout}>Logout</button>}
      </nav>
    );
};

const Loader = () => (
  <div id="loader">
    <div className="spinner"></div>
    <p>Gemini is working...</p>
  </div>
);

const Notification = ({ message }: { message: string }) => {
  return <div className="notification">{message}</div>;
};

const BaselineTasksView = ({ plan, onTaskUpdate, onOpenModal }: { plan: Plan, onTaskUpdate: (task: Task) => void, onOpenModal: (task: Task) => void }) => {
  return (
    <>
      {plan.periods.map((period, index) => (
        <section key={index} className="period-section">
          <h3>{period.periodName}</h3>
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Responsible</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Comments</th>
              </tr>
            </thead>
            <tbody>
              {period.tasks.map(task => (
                <TaskRow key={task.id} task={task} onUpdate={onTaskUpdate} onOpenModal={onOpenModal} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
};

const TaskRow = ({ task, onUpdate, onOpenModal }: { task: Task, onUpdate: (task: Task) => void, onOpenModal: (task: Task) => void }) => {
  const handleFieldChange = (field: keyof Task, value: string) => {
    onUpdate({ ...task, [field]: value });
  };

  return (
    <tr>
      <td>
        {task.taskName}
        <span className="task-source">{task.source}</span>
      </td>
      <td>{task.responsible}</td>
      <td>
        <input
          type="date"
          className="date-input"
          value={task.dueDate}
          onChange={(e) => handleFieldChange('dueDate', e.target.value)}
        />
      </td>
      <td>
        <select
          value={task.status}
          onChange={(e) => handleFieldChange('status', e.target.value)}
        >
          <option value="Not-Started">Not Started</option>
          <option value="In-Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </td>
      <td>
        <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
      </td>
      <td className="comments-cell">
        <p className="comment-preview">
          {task.comments ? `${task.comments.substring(0, 50)}...` : 'No comments yet.'}
        </p>
        <button className="action-btn-small" onClick={() => onOpenModal(task)}>
            {task.comments ? 'Edit Comments' : 'Add Comments'}
        </button>
      </td>
    </tr>
  );
};

// --- Progress Viewer Components ---
const ProgressViewer = ({ allTasks, termYear }: { allTasks: Task[], termYear: string }) => {
    const [view, setView] = useState<ProgressViewMode>('Dashboard');
    return (
        <div className="progress-viewer-panel">
            <nav className="sub-nav">
                <button className={`sub-nav-btn ${view === 'Dashboard' ? 'active' : ''}`} onClick={() => setView('Dashboard')}>Dashboard</button>
                <button className={`sub-nav-btn ${view === 'Kanban' ? 'active' : ''}`} onClick={() => setView('Kanban')}>Kanban</button>
                <button className={`sub-nav-btn ${view === 'Gantt' ? 'active' : ''}`} onClick={() => setView('Gantt')}>Gantt Chart</button>
            </nav>
            <div className="sub-view-content">
                {view === 'Dashboard' && <DashboardView tasks={allTasks} />}
                {view === 'Kanban' && <KanbanView tasks={allTasks} />}
                {view === 'Gantt' && <GanttView tasks={allTasks} termYear={termYear} />}
            </div>
        </div>
    );
};

const DashboardView = ({ tasks }: { tasks: Task[] }) => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'In-Progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'Not-Started').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const highPriorityOutstanding = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed');

    return (
        <div className="dashboard-view">
            <h2>Project Dashboard</h2>
            <div className="dashboard-metrics">
                <div className="metric-card">
                    <span className="metric-value">{completionPercentage}%</span>
                    <span className="metric-label">Overall Completion</span>
                </div>
                <div className="metric-card">
                    <span className="metric-value">{completedTasks}</span>
                    <span className="metric-label">Completed Tasks</span>
                </div>
                <div className="metric-card">
                    <span className="metric-value">{inProgressTasks}</span>
                    <span className="metric-label">In Progress</span>
                </div>
                <div className="metric-card">
                    <span className="metric-value">{notStartedTasks}</span>
                    <span className="metric-label">Not Started</span>
                </div>
            </div>
            
            <h3>Completion Status</h3>
            <div className="chart-container">
                <div className="chart-bar">
                    <div className="chart-segment completed" style={{width: `${completionPercentage}%`}}></div>
                    <div className="chart-segment in-progress" style={{width: `${Math.round((inProgressTasks / totalTasks) * 100)}%`}}></div>
                    <div className="chart-segment not-started" style={{width: `${Math.round((notStartedTasks / totalTasks) * 100)}%`}}></div>
                </div>
                <div className="chart-legend">
                    <span><span className="legend-dot completed"></span> Completed</span>
                    <span><span className="legend-dot in-progress"></span> In Progress</span>
                    <span><span className="legend-dot not-started"></span> Not Started</span>
                </div>
            </div>

            <div className="dashboard-focus-area">
                <h3>High Priority Focus Items</h3>
                {highPriorityOutstanding.length > 0 ? (
                    <ul className="focus-list">
                        {highPriorityOutstanding.map(task => (
                            <li key={task.id}>
                                <span>{task.taskName} <small>({task.dueDate})</small></span>
                                <span className={`status-indicator status-${task.status.replace('-', '')}`}>{task.status.replace('-', ' ')}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>All high priority tasks have been completed. Great job!</p>
                )}
            </div>
        </div>
    );
};

const KanbanView = ({ tasks }: { tasks: Task[] }) => {
    const columns = ['Not-Started', 'In-Progress', 'Completed'];
    const tasksByStatus = {
        'Not-Started': tasks.filter(t => t.status === 'Not-Started'),
        'In-Progress': tasks.filter(t => t.status === 'In-Progress'),
        'Completed': tasks.filter(t => t.status === 'Completed')
    };
    
    return (
        <div className="kanban-view">
            <h2>Kanban Board</h2>
            <div className="kanban-board">
                {columns.map(status => (
                    <div key={status} className="kanban-column">
                        <h3 className="kanban-column-title">{status.replace('-', ' ')} ({tasksByStatus[status].length})</h3>
                        <div className="kanban-column-tasks">
                            {tasksByStatus[status].map(task => (
                                <div key={task.id} className="kanban-card">
                                    <h4 className="kanban-card-name">{task.taskName}</h4>
                                    <div className="kanban-card-footer">
                                        <span className="kanban-card-due">{task.dueDate}</span>
                                        <span className={`priority-badge-small priority-${task.priority}`}>{task.priority}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const GanttView = ({ tasks, termYear }: { tasks: Task[], termYear: string }) => {
    const startYear = parseInt(termYear.split('-')[0], 10);
    const startDate = new Date(`${startYear}-08-01`); // Assume term starts in August
    const endDate = new Date(`${startYear + 1}-07-31`);
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

    const getBarPosition = (task: Task) => {
        const taskStart = new Date(task.dueDate);
        const taskEnd = new Date(taskStart);
        taskEnd.setDate(taskStart.getDate() + 7);
        
        const offset = (taskStart.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 3600 * 24);

        const left = (offset / totalDays) * 100;
        const width = (duration / totalDays) * 100;
        
        return { left: `${Math.max(0, left)}%`, width: `${Math.max(0.5, width)}%` };
    };
    
    const months = ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
    
    return (
        <div className="gantt-chart-view">
            <h2>Gantt Chart</h2>
            <div className="gantt-chart">
                <div className="gantt-header">
                    {months.map(month => <div key={month} className="gantt-month">{month}</div>)}
                </div>
                <div className="gantt-body">
                    {tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).map(task => {
                        const { left, width } = getBarPosition(task);
                        return (
                            <div key={task.id} className="gantt-row">
                                <div className="gantt-task-name" title={task.taskName}>{task.taskName}</div>
                                <div className="gantt-task-bar-container">
                                    <div 
                                        className={`gantt-task-bar status-${task.status.replace('-', '')}`}
                                        style={{ left, width }}
                                        title={`${task.taskName} - Due: ${task.dueDate}`}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="gantt-footnote">*Task bars represent the due date and a conceptual 1-week duration for visualization purposes.</p>
        </div>
    );
};


// --- Other Main View Components ---

const AutomatedReportsView = ({ plan }: { plan: Plan }) => {
    const [report, setReport] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const reportContentRef = useRef<HTMLDivElement>(null);

    const generateReport = async () => {
        if (!ai) {
          setError("AI Client not initialized. Please log in.");
          return;
        }
        setLoading(true);
        setError(null);
        setReport(null);
        try {
            const planSummary = JSON.stringify(plan, null, 2);
            const prompt = `
            You are an assistant for the General Committee Chairperson of the AGMSC.
            Your task is to generate a comprehensive, well-structured progress report based on the provided project plan data.
            The report should be written in a professional, narrative style suitable for presenting to a committee.
            
            The report must include the following sections:
            1.  **Executive Summary:** A brief overview of the project's current status, including overall completion percentage and key highlights.
            2.  **Key Accomplishments:** List major tasks that have been completed.
            3.  **Items in Progress:** Detail tasks currently being worked on.
            4.  **Upcoming Priorities:** Highlight critical tasks that are not yet started, especially those with high priority or upcoming due dates.
            5.  **Potential Roadblocks:** Based on the data, identify any potential risks or delays (e.g., a large number of 'Not-Started' high-priority tasks).
            
            Use the provided plan data to source all information. Format the output as clean HTML content within a single div. Use h3 for section titles and p and ul/li for content. Do not include any html, head or body tags.

            Project Plan Data:
            ${planSummary}
            `;

            const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
            setReport(response.text);
        } catch (e) {
            console.error(e);
            setError(`Failed to generate report. Error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setLoading(false);
        }
    };
    
    const printReport = () => {
        window.print();
    };

    return (
        <div className="report-panel">
            <div className="report-actions">
                <button className="action-btn primary" onClick={generateReport} disabled={loading || !ai}>
                    {loading ? <><div className="small-spinner"></div> Generating...</> : 'Generate AI Report'}
                </button>
                {report && (
                    <button className="action-btn" onClick={printReport}>
                        Print Report
                    </button>
                )}
            </div>

            {error && <p id="error-container">{error}</p>}
            
            <div id="report-output">
                {loading && <Loader />}
                {report ? (
                    <div ref={reportContentRef} dangerouslySetInnerHTML={{ __html: `<h2 class="report-main-title">AGMSC Chairman's Report - ${plan.termYear}</h2>${report}` }} />
                ) : (
                    !loading && (
                        <div>
                            <p style={{textAlign: 'center', padding: '4rem 0', color: '#c0c0c0'}}>
                                Click "Generate AI Report" to create a summary of the project plan.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const AddTaskView = ({ onAddTask }: { onAddTask: (task: Omit<Task, 'id' | 'source'>) => void }) => {
    const [taskName, setTaskName] = useState('');
    const [responsible, setResponsible] = useState('General Chairman');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<'Not-Started' | 'In-Progress' | 'Completed'>('Not-Started');
    const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [comments, setComments] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!taskName || !dueDate) {
            alert("Task Name and Due Date are required.");
            return;
        }
        onAddTask({ taskName, responsible, dueDate, status, priority, comments });
        // Reset form
        setTaskName('');
        setResponsible('General Chairman');
        setDueDate('');
        setStatus('Not-Started');
        setPriority('Medium');
        setComments('');
    };

    return (
        <div className="add-task-panel">
            <h2>Add New Task</h2>
            <form id="add-task-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label htmlFor="taskName">Task Name</label>
                    <input type="text" id="taskName" value={taskName} onChange={e => setTaskName(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="responsible">Responsible</label>
                    <input type="text" id="responsible" value={responsible} onChange={e => setResponsible(e.target.value)} />
                </div>
                <div className="form-group">
                    <label htmlFor="dueDate">Due Date</label>
                    <input type="date" id="dueDate" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label htmlFor="priority">Priority</label>
                    <select id="priority" value={priority} onChange={e => setPriority(e.target.value as any)}>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="status">Status</label>
                    <select id="status" value={status} onChange={e => setStatus(e.target.value as any)}>
                        <option value="Not-Started">Not Started</option>
                        <option value="In-Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
                 <div className="form-group">
                    <label htmlFor="comments">Comments</label>
                    <textarea id="comments" value={comments} onChange={e => setComments(e.target.value)}></textarea>
                </div>
                <button type="submit">Add Task</button>
            </form>
        </div>
    );
};

const SaveLoadView = ({ currentPlan, onPlanLoad }: { currentPlan: Plan | null, onPlanLoad: (plan: Plan) => void }) => {

    const handleSave = () => {
        if (!currentPlan) return;
        const jsonString = JSON.stringify(currentPlan, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agmsc-plan-${currentPlan.termYear}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result;
                    if (typeof text === 'string') {
                        const parsedPlan = JSON.parse(text);
                        // Basic validation
                        if (parsedPlan.termYear && parsedPlan.periods) {
                            onPlanLoad(parsedPlan as Plan);
                        } else {
                            alert("Invalid plan file format.");
                        }
                    }
                } catch (error) {
                    alert("Error reading or parsing the file.");
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="saveload-panel">
            <h2>Save & Load Plan</h2>
            <div className="saveload-section">
                <h3>Save Current Plan</h3>
                <p>Save all your current tasks, statuses, and comments to a JSON file on your computer. This file can be loaded back later to restore your progress.</p>
                <button className="action-btn primary" onClick={handleSave} disabled={!currentPlan}>Save Plan to File</button>
            </div>
            <div className="saveload-section">
                <h3>Load Plan from File</h3>
                <p>Load a previously saved plan from a JSON file. This will replace the current plan with the one from the file.</p>
                <input type="file" id="load-plan-input" accept=".json" onChange={handleLoad} />
            </div>
        </div>
    );
};


const CommentModal = ({ task, onClose, onSave, isAdmin }: { task: Task, onClose: () => void, onSave: (taskId: number, newComment: string) => void, isAdmin: boolean }) => {
    const [comment, setComment] = useState(task.comments);
    const [rewordLoading, setRewordLoading] = useState(false);
    const [rewordError, setRewordError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleReword = async () => {
        if (!ai || !comment) return;
        setRewordLoading(true);
        setRewordError(null);
        setSuggestions([]);
        try {
            const prompt = `Rephrase the following comment for a project management log to be more professional and concise. Provide 3 alternative versions. The comment is: "${comment}"`;
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                          suggestions: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                          }
                        }
                    }
                }
            });
            const parsed = JSON.parse(response.text);
            if (parsed.suggestions && parsed.suggestions.length > 0) {
              setSuggestions(parsed.suggestions);
            } else {
              setRewordError("AI could not generate suggestions.");
            }
        } catch (e) {
            setRewordError(`Failed to get suggestions. Error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setRewordLoading(false);
        }
    };

    return (
        <div id="modal-container">
            <div className="modal-backdrop" onClick={onClose}></div>
            <div className="modal">
                <div className="modal-header">
                    <h3>Comments for: {task.taskName}</h3>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-content">
                    <div className="textarea-header">
                        <label htmlFor="comment-textarea">Edit Comment</label>
                        {isAdmin && (
                            <button className="reword-btn" onClick={handleReword} disabled={rewordLoading || !comment}>
                                {rewordLoading ? <div className="small-spinner"></div> : '✨ Reword with AI'}
                            </button>
                        )}
                    </div>
                    <textarea
                        id="comment-textarea"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                    />
                    {rewordError && <p className="reword-error">{rewordError}</p>}
                    {suggestions.length > 0 && (
                        <div className="suggestions-container">
                            <h4>Suggestions:</h4>
                            <ul>
                                {suggestions.map((s, i) => (
                                    <li key={i}><button onClick={() => setComment(s)}>{s}</button></li>
                                ))}
                            </ul>
                             <button className="action-btn-small" onClick={() => setSuggestions([])}>Clear Suggestions</button>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="action-btn" onClick={onClose}>Cancel</button>
                    <button className="action-btn primary" onClick={() => onSave(task.id, comment)}>Save Comments</button>
                </div>
            </div>
        </div>
    );
};


// --- Entry Point ---
const container = document.getElementById('app-container');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}