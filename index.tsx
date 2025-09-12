/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
interface Excerpt {
  source: string;
  text: string;
}

interface Attachment {
  fileName: string;
  fileContent: string; // base64 data URL
  fileType: string;
}

interface Task {
  id: number;
  taskName: string;
  responsible: string;
  startDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: 'Not-Started' | 'In-Progress' | 'Completed' | 'Removed';
  priority: 'High' | 'Medium' | 'Low';
  source: string;
  comments: string;
  excerpts?: Excerpt[];
  attachments?: Attachment[];
}

interface Plan {
  termYear: string;
  chairperson: string;
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
    chairperson: "Tim Bickford",
    periods: [
      {
        periodName: `Post-Course & Fall Planning (Late August - October ${currentYear})`,
        tasks: [
          { id: 1, taskName: "Post August General Committee Meeting content to Website", responsible: "General Chairman", startDate: `${currentYear}-08-22`, dueDate: `${currentYear}-08-25`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: 'Oversees the operations of the various chairpersons and General Committee Members and their functions within the organization. Facilitates the August General Committee meeting...' }, { source: 'AGMSC Handbook, Page 9 (August)', text: 'Post General Committee Meeting to Website' }] },
          { id: 2, taskName: "Start planning for Winter Meeting: determine location if not already done", responsible: "General Chairman", startDate: `${currentYear}-09-01`, dueDate: `${currentYear}-09-15`, status: 'Not-Started', priority: 'High', source: 'Handbook, Pages 8 & 9', comments: 'This process should begin early in the term.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Select and coordinate the winter meeting location. This process should begin in the previous year when acting as Program Committee Chairperson.' }, { source: 'AGMSC Handbook, Page 9 (Start of new General Committee Chair)', text: 'Start Plans for Winter Meeting- Determine location if not done already' }] },
          { id: 3, taskName: "Send out initial Winter Meeting information to the committee", responsible: "General Chairman", startDate: `${currentYear}-10-01`, dueDate: `${currentYear}-10-15`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Organize and chair the General Committee meetings (both August and Winter). ... Coordinate these meetings with the Program Committee Chairperson.' }, { source: 'AGMSC Handbook, Page 9 (October)', text: 'Send out Winter Meeting information' }] },
          { id: 4, taskName: "Write welcoming message and self-bio for Proceedings Book", responsible: "General Chairman", startDate: `${currentYear}-10-15`, dueDate: `${currentYear}-10-30`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 8', comments: 'Forward to the Publications Committee when complete.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Write a welcoming and a self-bio for the Proceedings Book and forward to the Publications Committee.' }, { source: 'AGMSC Handbook, Page 9 (January)', text: 'Write Bio for Proceedings book' }, { source: 'AGMSC Handbook, Page 9 (January)', text: 'Write Welcome document for Proceedings Book' }] },
          { id: 5, taskName: "Attend Fall Executive and Program Committee meetings", responsible: "General Chairman", startDate: `${currentYear}-09-23`, dueDate: `${currentYear}-09-30`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 8', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: '...shadows the Executive Chair to learn roles and responsibilities for progression through the Chairs.' }, { source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Attend Executive and Program Committee meetings.' }] },
          { id: 6, taskName: "Invite RMU and UPMC Events Center representatives to relevant meetings", responsible: "General Chairman", startDate: `${currentYear}-09-24`, dueDate: `${currentYear}-10-01`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 8', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Invite Robert Morris University and UPMC Events Center / venue representative.' }, { source: 'AGMSC Handbook, Page 8 (Kick-off)', text: 'Introduce Robert Morris University and UPMC Events Center representatives.' }] },
        ],
      },
      {
          periodName: `Winter Prep (November ${currentYear} - January ${currentYear + 1})`,
          tasks: [
              { id: 7, taskName: "Send Winter Meeting reminders", responsible: "General Chairman", startDate: `${currentYear}-11-08`, dueDate: `${currentYear}-11-15`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: 'Include agenda highlights and logistics.', excerpts: [{ source: 'AGMSC Handbook, Page 9 (November)', text: 'Winter Meeting Reminders' }, { source: 'AGMSC Handbook, Page 9 (December)', text: 'Winter Meeting Reminders' }, { source: 'AGMSC Handbook, Page 9 (February)', text: 'Final Winter Meeting Reminder' }] },
              { id: 8, taskName: "Set up catering and logistical arrangements for Winter Meeting", responsible: "General Chairman", startDate: `${currentYear}-12-20`, dueDate: `${currentYear + 1}-01-05`, status: 'Not-Started', priority: 'High', source: 'Handbook, Pages 8 & 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Organize and chair the General Committee meetings... Arrange all catering for Winter Meetings. Items to consider for the agenda requiring a membership vote include: acceptance of new members and resignations, approval of minutes from the previous meeting and the Treasurer and Budget/Finance reports.' }, { source: 'AGMSC Handbook, Page 9 (January)', text: 'Set up catering and arrangements for Winter Meeting with venue' }] },
              { id: 9, taskName: "Ask about dietary needs in meeting reminders", responsible: "General Chairman", startDate: `${currentYear + 1}-01-03`, dueDate: `${currentYear + 1}-01-10`, status: 'Not-Started', priority: 'Low', source: 'Handbook, Page 9', comments: 'Coordinate with catering.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Arrange all catering for Winter Meetings.' }, { source: 'AGMSC Handbook, Page 9 (January)', text: 'Ask about any dietary needs for Winter meeting in Meeting reminders' }] },
              { id: 10, taskName: "Pay final charges or deposits for Winter Meeting", responsible: "General Chairman", startDate: `${currentYear + 1}-01-13`, dueDate: `${currentYear + 1}-01-20`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 9 (January)', text: 'Pay and final charges for Winter Meetings or deposits' }] },
              { id: 11, taskName: "Send out virtual meeting invites (e.g., Teams) for Winter Meeting", responsible: "General Chairman", startDate: `${currentYear + 1}-01-18`, dueDate: `${currentYear + 1}-01-25`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 9 (February)', text: 'Send out Teams Invite for General Committee Meeting' }] },
          ],
      },
      {
        periodName: `Spring Finalization (February - April ${currentYear + 1})`,
        tasks: [
            { id: 12, taskName: "Organize and chair the Winter General Committee meeting", responsible: "General Chairman", startDate: `${currentYear + 1}-02-21`, dueDate: `${currentYear + 1}-02-28`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 8', comments: 'Ensure all reports are received from committees.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: 'Oversees the operations of the various chairpersons and General Committee Members and their functions within the organization. Facilitates the August General Committee meeting... selects location and venue for Winter Meeting...' }, { source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Organize and chair the General Committee meetings (both August and Winter). ... Items to consider for the agenda requiring a membership vote include: acceptance of new members and resignations, approval of minutes from the previous meeting and the Treasurer and Budget/Finance reports.' }] },
            { id: 13, taskName: "Finalize and distribute General Committee Winter Meeting Agenda", responsible: "General Chairman", startDate: `${currentYear + 1}-02-22`, dueDate: `${currentYear + 1}-03-01`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Organize and chair the General Committee meetings... Items to consider for the agenda requiring a membership vote include: acceptance of new members and resignations, approval of minutes from the previous meeting and the Treasurer and Budget/Finance reports.' }, { source: 'AGMSC Handbook, Page 9 (February)', text: 'Work on General Committee Meeting Agenda' }, { source: 'AGMSC Handbook, Page 9 (February)', text: 'Finalize General Committee Agenda' }] },
            { id: 14, taskName: "Ensure Bio and Welcome document have been sent to Publications", responsible: "General Chairman", startDate: `${currentYear + 1}-03-08`, dueDate: `${currentYear + 1}-03-15`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: 'Follow-up with Publications Chair.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Write a welcoming and a self-bio for the Proceedings Book and forward to the Publications Committee.' }, { source: 'AGMSC Handbook, Page 9 (March)', text: 'Send Publications - Bio and Welcome document' }] },
            { id: 15, taskName: "Verify with Publications that all is set for April 1st registration", responsible: "General Chairman", startDate: `${currentYear + 1}-03-25`, dueDate: `${currentYear + 1}-04-01`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 9 (March)', text: 'Verify all is set with Publications for a April 1st registration' }] },
            { id: 16, taskName: "Prepare and update the Opening Ceremonies speech", responsible: "General Chairman", startDate: `${currentYear + 1}-04-15`, dueDate: `${currentYear + 1}-04-30`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: 'Draft initial version.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Kick-off General Assembly / Opening Ceremony.\n- Greeting and welcome.\n- Brief history of Short Course.\n- Introduce Robert Morris University and UPMC Events Center representatives.\n- Introduce Program Chairperson.' }, { source: 'AGMSC Handbook, Page 9 (April)', text: 'Update Opening Ceremonies Speech' }] },
        ],
      },
      {
        periodName: `Pre-Course Prep (May - July ${currentYear + 1})`,
        tasks: [
            { id: 17, taskName: "Check with RMU president about speaking at Opening Ceremonies", responsible: "General Chairman", startDate: `${currentYear + 1}-05-01`, dueDate: `${currentYear + 1}-05-15`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Invite Robert Morris University and UPMC Events Center / venue representative.' }, { source: 'AGMSC Handbook, Page 9 (May)', text: 'Check with current RMU president about Speaking at Opening ceremonies' }] },
            { id: 18, taskName: "Confirm attendance of key personnel for Opening Ceremonies", responsible: "General Chairman", startDate: `${currentYear + 1}-05-24`, dueDate: `${currentYear + 1}-06-01`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Invite Robert Morris University and UPMC Events Center / venue representative.' }, { source: 'AGMSC Handbook, Page 9 (May)', text: 'Confirm that Dr Patrick will be at the opening ceremonies - RMU Introduction' }] },
            { id: 19, taskName: "Complete final version of the Opening Ceremonies speech", responsible: "General Chairman", startDate: `${currentYear + 1}-06-15`, dueDate: `${currentYear + 1}-06-30`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Kick-off General Assembly / Opening Ceremony.\n- Greeting and welcome.\n- Brief history of Short Course.\n- Introduce Robert Morris University and UPMC Events Center representatives.\n- Introduce Program Chairperson.' }, { source: 'AGMSC Handbook, Page 9 (June)', text: 'Complete Opening Ceremonies speech' }] },
            { id: 20, taskName: "Create and distribute a detailed timeline for the Short Course event", responsible: "General Chairman", startDate: `${currentYear + 1}-07-01`, dueDate: `${currentYear + 1}-07-15`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: 'Oversees the operations of the various chairpersons and General Committee Members and their functions within the organization.' }, { source: 'AGMSC Handbook, Page 9 (June)', text: 'Create a timeline for event and send out' }] },
            { id: 21, taskName: "Finalize agenda for the August General Committee Meeting", responsible: "General Chairman", startDate: `${currentYear + 1}-07-15`, dueDate: `${currentYear + 1}-07-30`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 9', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Organize and chair the General Committee meetings (both August and Winter). ... Items to consider for the agenda... Coordinate these meetings with the Program Committee Chairperson.' }, { source: 'AGMSC Handbook, Page 9 (July)', text: 'Complete General Committee Meeting Agenda' }] },
            { id: 22, taskName: "Finalize script and logistics for kicking off the General Assembly", responsible: "General Chairman", startDate: `${currentYear + 1}-07-10`, dueDate: `${currentYear + 1}-07-25`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 8', comments: 'Includes greeting, brief history, and introductions.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Kick-off General Assembly / Opening Ceremony.\n- Greeting and welcome.\n- Brief history of Short Course.\n- Introduce Robert Morris University and UPMC Events Center representatives.\n- Introduce Program Chairperson.' }, { source: 'AGMSC Handbook, Page 9 (June)', text: 'Complete Opening Ceremonies speech' }] },
        ],
      },
      {
        periodName: `August ${currentYear + 1} (Short Course)`,
        tasks: [
            { id: 23, taskName: "Kick-off General Assembly and Opening Ceremony", responsible: "General Chairman", startDate: `${currentYear + 1}-08-11`, dueDate: `${currentYear + 1}-08-18`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 8', comments: 'Deliver welcome, brief history, and introduce key personnel and program chairperson.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Kick-off General Assembly / Opening Ceremony. Greeting and welcome. Brief history of Short Course. Introduce Robert Morris University and UPMC Events Center representatives. Introduce Program Chairperson.' }] },
            { id: 24, taskName: "Attend August Short Course Executive and Program Committee meetings", responsible: "General Chairman", startDate: `${currentYear + 1}-08-12`, dueDate: `${currentYear + 1}-08-19`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 8', comments: '', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: '...shadows the Executive Chair to learn roles and responsibilities for progression through the Chairs.' }, { source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Attend Executive and Program Committee meetings.' }] },
            { id: 25, taskName: "Facilitate the August General Committee meeting", responsible: "General Chairman", startDate: `${currentYear + 1}-08-13`, dueDate: `${currentYear + 1}-08-20`, status: 'Not-Started', priority: 'High', source: 'Handbook, Page 8', comments: 'Chair the meeting as per the established agenda, ensuring all committee business is addressed.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: 'Oversees the operations of the various chairpersons and General Committee Members and their functions within the organization. Facilitates the August General Committee meeting...' }, { source: 'AGMSC Handbook, Page 8 (Responsibilities)', text: 'Organize and chair the General Committee meetings (both August and Winter).' }] },
            { id: 26, taskName: "Ensure General Committee Members are active in class monitoring", responsible: "General Chairman", startDate: `${currentYear + 1}-08-14`, dueDate: `${currentYear + 1}-08-21`, status: 'Not-Started', priority: 'Medium', source: 'Handbook, Page 8', comments: 'Coordinate with members to cover all required sessions and gather feedback.', excerpts: [{ source: 'AGMSC Handbook, Page 8 (Role)', text: '...ensures the General Committee Members are active in class monitoring roles & responsibilities' }] },
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
  
  const [infoTask, setInfoTask] = useState<Task | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const generatePlan = useCallback(async (year: string, chairperson: string) => {
    if (!ai) {
      setError("Client not initialized. Please log in via the Admin tab.");
      showNotification("Client not initialized. Please log in via the Admin tab.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const prompt = `Based on the provided AGMSC Handbook, create a detailed project plan for the General Committee Chairperson for the ${year} term. The plan should be structured into logical time periods (e.g., "August - October", "November - January", etc.). For each period, list specific tasks. Each task must include a responsible party (default to 'General Chairman'), a suggested start date, a suggested due date within the period, a priority (High, Medium, or Low), and the source from the handbook (e.g., "Section 1, Page 5"). The status for all initial tasks should be 'Not-Started' and comments should be an empty string. Ensure dates are in YYYY-MM-DD format and fall realistically within the term year provided. Focus on actionable items relevant to the General Chairman's role.

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
                          startDate: { type: Type.STRING },
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

      const parsedPlan = JSON.parse(response.text) as Omit<Plan, 'chairperson'>;
      let idCounter = 1;
      parsedPlan.periods.forEach(p => p.tasks.forEach(t => t.id = idCounter++));
      
      const finalPlan: Plan = {
        ...parsedPlan,
        termYear: year,
        chairperson: chairperson
      };

      setPlan(finalPlan);
      showNotification("New plan generated successfully!");
      setActiveTab('baseline');

    } catch (e) {
      console.error(e);
      setError(`Failed to generate plan. Please check your Key and try again. Error: ${e instanceof Error ? e.message : String(e)}`);
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
        showNotification("Admin login successful. Advanced features enabled.");
        return { success: true, error: null };
      } catch (e) {
        console.error("Failed to initialize GoogleGenAI:", e);
        const errorMessage = `Failed to initialize client. Please check the Key format. Error: ${e instanceof Error ? e.message : String(e)}`;
        return { success: false, error: errorMessage };
      }
    }
    return { success: false, error: 'Login failed. Please check your password and key.' };
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
    setPlan(prevPlan => {
      if (!prevPlan) return null;
      return {
        ...prevPlan,
        periods: prevPlan.periods.map(period => {
          const taskIndex = period.tasks.findIndex(t => t.id === updatedTask.id);
          if (taskIndex !== -1) {
            const newTasks = [...period.tasks];
            newTasks[taskIndex] = updatedTask;
            return { ...period, tasks: newTasks };
          }
          return period;
        })
      };
    });
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'source'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: Date.now(), // Simple unique ID
      source: 'User Added',
    };

    setPlan(prevPlan => {
        if (!prevPlan) return null;

        // Create a deep-enough copy to mutate safely.
        const newPlan = {
            ...prevPlan,
            periods: prevPlan.periods.map(p => ({ ...p, tasks: [...p.tasks] }))
        };

        const taskDueDate = new Date(newTask.dueDate);
        let periodFound = false;

        // Re-implementing the original logic on the safe copy.
        for (const period of newPlan.periods) {
            const periodMonth = new Date(period.tasks[0]?.dueDate || prevPlan.termYear.split('-')[0]).getMonth();
            if (taskDueDate.getMonth() >= periodMonth) {
               period.tasks.push(newTask);
               period.tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
               periodFound = true;
               break;
            }
        }
        if(!periodFound) {
            if (newPlan.periods.length > 0) {
                newPlan.periods[0].tasks.push(newTask);
                newPlan.periods[0].tasks.sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            } else {
                // If there are no periods, create one
                newPlan.periods.push({ periodName: "General", tasks: [newTask] });
            }
        }
        return newPlan;
    });

    showNotification("Task added successfully!");
    setActiveTab('added');
  };

  const handleDetailsSave = (updatedTask: Task) => {
    handleTaskUpdate(updatedTask);
    setShowModal(false);
    setEditingTask(null);
  };

  const handleOpenModal = (task: Task) => {
    setEditingTask(task);
    setShowModal(true);
  };
  
  const handleOpenInfoModal = (task: Task) => {
    setInfoTask(task);
    setShowInfoModal(true);
  };

  const allTasks = plan?.periods.flatMap(p => p.tasks) || [];
  const activeTasks = allTasks.filter(task => task.status !== 'Removed');

  return (
    <>
      {notification && <Notification message={notification} />}
      {showModal && editingTask && (
        <DetailsModal
          task={editingTask}
          onClose={() => setShowModal(false)}
          onSave={handleDetailsSave}
          isAdmin={isAdmin}
        />
      )}
      {showInfoModal && infoTask && (
        <InfoModal
          task={infoTask}
          onClose={() => setShowInfoModal(false)}
        />
      )}
      <Header
        termYear={plan?.termYear}
        chairperson={plan?.chairperson}
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
            <BaselineTasksView plan={plan} onTaskUpdate={handleTaskUpdate} onOpenModal={handleOpenModal} onOpenInfoModal={handleOpenInfoModal} isAdmin={isAdmin} />
          )}
           {activeTab === 'added' && plan && (
            <AddedTasksView plan={plan} onTaskUpdate={handleTaskUpdate} onOpenModal={handleOpenModal} isAdmin={isAdmin} />
          )}
           {activeTab === 'completed' && plan && (
            <CompletedTasksView plan={plan} onTaskUpdate={handleTaskUpdate} onOpenModal={handleOpenModal} isAdmin={isAdmin} />
          )}
          {activeTab === 'removed' && plan && (
            <RemovedTasksView plan={plan} onTaskUpdate={handleTaskUpdate} onOpenModal={handleOpenModal} isAdmin={isAdmin} />
          )}
          {activeTab === 'addTask' && (
              <AddTaskView onAddTask={handleAddTask} isAdmin={isAdmin} />
          )}
          {activeTab === 'progress' && plan && (
             <ProgressViewer allTasks={activeTasks} termYear={plan.termYear} />
          )}
          {activeTab === 'reports' && isAdmin && plan && (
            <AutomatedReportsView plan={plan} />
          )}
          {activeTab === 'saveLoad' && (
              <SaveLoadView
                  currentPlan={plan}
                  onPlanLoad={(loadedPlan) => {
                      setPlan(loadedPlan);
                      showNotification("Plan loaded successfully!");
                      setActiveTab('baseline');
                  }}
              />
          )}
          {activeTab === 'admin' && (
            isAdmin
                ? <AdminPanelView
                    onRegeneratePlan={generatePlan}
                    termYear={plan?.termYear}
                    chairperson={plan?.chairperson}
                  />
                : <AdminLoginView onLogin={handleLogin} />
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
                <p>Enter credentials to enable advanced and admin features.</p>
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
                    <label htmlFor="api-key">Key</label>
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

const AdminPanelView = ({ onRegeneratePlan, termYear, chairperson }: { onRegeneratePlan: (newYear: string, newChairperson: string) => void, termYear?: string, chairperson?: string }) => {
    const [year, setYear] = useState(termYear || "");
    const [newChairperson, setNewChairperson] = useState(chairperson || "");
    
    useEffect(() => {
        setYear(termYear || "");
        setNewChairperson(chairperson || "");
    }, [termYear, chairperson]);

    const handleSave = () => {
        if (year.match(/^\d{4}-\d{4}$/) && newChairperson.trim() !== '') {
          if (window.confirm('Are you sure you want to generate a new plan? This will replace the current plan and all progress.')) {
              onRegeneratePlan(year, newChairperson);
          }
        } else {
          alert("Please enter the year in YYYY-YYYY format and provide a chairperson's name.");
        }
    };

    return (
        <div className="admin-panel">
            <header style={{padding: '0 0 1.5rem 0'}}>
                <h1>Admin Tools</h1>
            </header>
            <div className="term-edit" style={{flexDirection: 'column', alignItems: 'stretch', gap: '1rem', border: '1px solid var(--border-color)', padding: '1.5rem', borderRadius: '8px' }}>
                <h3>Regenerate Plan for New Term</h3>
                <p>This will discard all current data and generate a new baseline plan for the specified term and chairperson.</p>
                <div className="form-group">
                    <label htmlFor="term-year-input">New Term Year (YYYY-YYYY):</label>
                    <input
                      id="term-year-input"
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="YYYY-YYYY"
                      style={{width: '100%'}}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="chairperson-input">New Chairperson Name:</label>
                    <input
                      id="chairperson-input"
                      type="text"
                      value={newChairperson}
                      onChange={(e) => setNewChairperson(e.target.value)}
                      placeholder="Chairperson's Name"
                      style={{width: '100%'}}
                    />
                </div>
                <button className="action-btn primary delete-btn" onClick={handleSave} style={{ alignSelf: 'flex-start'}}>Generate New Plan</button>
            </div>
        </div>
    );
};


const Header = ({ termYear, chairperson }: { termYear?: string, chairperson?: string }) => {
  return (
    <header>
      <h1>AGMSC General Committee Chairman</h1>
      <p>Task Manager</p>
      <p>Rev 1.0</p>
      <p>Written By Tim Bickford</p>
      {termYear && (
        <div className="term-display">
            <div className="term-info">
              <h2>Term: {termYear} - {chairperson}</h2>
              <p className="term-subtitle">2026 84th AGMSC - August 4th through 6th</p>
            </div>
        </div>
      )}
    </header>
  );
};


const Tabs = ({ activeTab, setActiveTab, isAdmin, onLogout }: { activeTab: string, setActiveTab: (tab: string) => void, isAdmin: boolean, onLogout: () => void }) => {
    const baseTabs = [
        { id: 'baseline', label: 'Baseline Tasks' },
        { id: 'added', label: 'Added Tasks' },
        { id: 'completed', label: 'Completed Tasks' },
        { id: 'removed', label: 'Removed Tasks' },
        { id: 'addTask', label: 'Add Task' },
        { id: 'progress', label: 'Progress Viewer' },
        { id: 'saveLoad', label: 'Save/Load Plan' }
    ];

    let tabs = [...baseTabs];
    if (isAdmin) {
        tabs.push({ id: 'reports', label: 'Automated Reports' });
        tabs.push({ id: 'admin', label: 'Admin Panel' });
    } else {
        tabs.push({ id: 'admin', label: 'Admin Login' });
    }

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

const Loader = ({ message = 'Working...' }: { message?: string }) => (
  <div id="loader">
    <div className="spinner"></div>
    <p>{message}</p>
  </div>
);

const Notification = ({ message }: { message: string }) => {
  return <div className="notification">{message}</div>;
};

const BaselineTasksView = ({ plan, onTaskUpdate, onOpenModal, onOpenInfoModal, isAdmin }: { plan: Plan, onTaskUpdate: (task: Task) => void, onOpenModal: (task: Task) => void, onOpenInfoModal: (task: Task) => void, isAdmin: boolean }) => {
  const activePeriods = plan.periods
    .map(period => ({
      ...period,
      tasks: period.tasks.filter(task => task.status !== 'Completed' && task.status !== 'Removed' && task.source !== 'User Added')
    }))
    .filter(period => period.tasks.length > 0);

  return (
    <>
      {activePeriods.length === 0 && <p className="empty-view-message">All baseline tasks completed. Great job!</p>}
      {activePeriods.map((period, index) => (
        <section key={index} className="period-section">
          <h3>{period.periodName}</h3>
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Responsible</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Details</th>
                <th className="column-info">Info</th>
              </tr>
            </thead>
            <tbody>
              {period.tasks.map(task => (
                <TaskRow key={task.id} task={task} onUpdate={onTaskUpdate} onOpenModal={onOpenModal} onOpenInfoModal={onOpenInfoModal} isAdmin={isAdmin} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
};

const AddedTasksView = ({ plan, onTaskUpdate, onOpenModal, isAdmin }: { plan: Plan, onTaskUpdate: (task: Task) => void, onOpenModal: (task: Task) => void, isAdmin: boolean }) => {
  const addedPeriods = plan.periods
    .map(period => ({
      ...period,
      tasks: period.tasks.filter(task => task.status !== 'Completed' && task.status !== 'Removed' && task.source === 'User Added')
    }))
    .filter(period => period.tasks.length > 0);

  return (
    <>
      {addedPeriods.length === 0 && <p className="empty-view-message">No custom tasks have been added, or all added tasks are complete.</p>}
      {addedPeriods.map((period, index) => (
        <section key={index} className="period-section">
          <h3>{period.periodName}</h3>
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Responsible</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {period.tasks.map(task => (
                <TaskRow key={task.id} task={task} onUpdate={onTaskUpdate} onOpenModal={onOpenModal} isAdmin={isAdmin} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
};


const CompletedTasksView = ({ plan, onTaskUpdate, onOpenModal, isAdmin }: { plan: Plan, onTaskUpdate: (task: Task) => void, onOpenModal: (task: Task) => void, isAdmin: boolean }) => {
  const completedPeriods = plan.periods
    .map(period => ({
      ...period,
      tasks: period.tasks.filter(task => task.status === 'Completed')
    }))
    .filter(period => period.tasks.length > 0);

  return (
    <>
      {completedPeriods.length === 0 && <p className="empty-view-message">No tasks have been completed yet.</p>}
      {completedPeriods.map((period, index) => (
        <section key={index} className="period-section">
          <h3>{period.periodName}</h3>
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Responsible</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {period.tasks.map(task => (
                <TaskRow key={task.id} task={task} onUpdate={onTaskUpdate} onOpenModal={onOpenModal} isAdmin={isAdmin} />
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
};

const RemovedTasksView = ({ plan, onTaskUpdate, onOpenModal, isAdmin }: { plan: Plan, onTaskUpdate: (task: Task) => void, onOpenModal: (task: Task) => void, isAdmin: boolean }) => {
  const removedPeriods = plan.periods
    .map(period => ({
      ...period,
      tasks: period.tasks.filter(task => task.status === 'Removed')
    }))
    .filter(period => period.tasks.length > 0);

  const handleRestoreTask = (taskToRestore: Task) => {
    // Restore task to 'Not-Started' status
    onTaskUpdate({ ...taskToRestore, status: 'Not-Started' });
  };

  return (
    <>
      {removedPeriods.length === 0 && <p className="empty-view-message">No tasks have been removed.</p>}
      {removedPeriods.map((period, index) => (
        <section key={index} className="period-section">
          <h3>{period.periodName}</h3>
          <table>
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Responsible</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Priority</th>
                <th>Details</th>
                <th className="column-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {period.tasks.map(task => (
                <tr key={task.id} className="removed-task">
                  <td>
                    {task.taskName}
                    <span className="task-source">{task.source}</span>
                  </td>
                  <td>{task.responsible}</td>
                  <td>{task.startDate}</td>
                  <td>{task.dueDate}</td>
                  <td>
                    <span className={`priority-badge-small priority-${task.priority}`}>{task.priority}</span>
                  </td>
                  <td className="comments-cell">
                     <p className="comment-preview">
                      {task.comments ? `${task.comments.substring(0, 50)}...` : 'No comments.'}
                      <br/>
                      <small>{task.attachments?.length || 0} attachment(s)</small>
                    </p>
                    <button className="action-btn-small" onClick={() => onOpenModal(task)}>
                        Manage Details
                    </button>
                  </td>
                  <td className="column-actions">
                    <button className="action-btn-small primary" onClick={() => handleRestoreTask(task)}>
                      Restore Task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  );
};

const TaskRow = ({ task, onUpdate, onOpenModal, onOpenInfoModal, isAdmin }: { task: Task, onUpdate: (task: Task) => void, onOpenModal: (task: Task) => void, onOpenInfoModal?: (task: Task) => void, isAdmin: boolean }) => {
  const handleFieldChange = (field: keyof Task, value: string) => {
    onUpdate({ ...task, [field]: value });
  };

  return (
    <tr className={task.status === 'Completed' ? 'completed-task' : task.status === 'Removed' ? 'removed-task' : ''}>
      <td>
        {task.taskName}
        <span className="task-source">{task.source}</span>
      </td>
      <td>{task.responsible}</td>
      <td>
        <input
          type="date"
          className="date-input"
          value={task.startDate}
          onChange={(e) => handleFieldChange('startDate', e.target.value)}
        />
      </td>
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
          <option value="Removed">Removed</option>
        </select>
      </td>
      <td>
        <select
          value={task.priority}
          onChange={(e) => handleFieldChange('priority', e.target.value)}
          className={`priority-select priority-${task.priority.toLowerCase()}`}
          disabled={!isAdmin || task.status === 'Completed'}
        >
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </td>
      <td className="comments-cell">
        <p className="comment-preview">
          {task.comments ? `${task.comments.substring(0, 50)}...` : 'No comments.'}
          <br/>
          <small>{task.attachments?.length || 0} attachment(s)</small>
        </p>
        <button className="action-btn-small" onClick={() => onOpenModal(task)}>
            Manage Details
        </button>
      </td>
      {onOpenInfoModal && (
        <td className="column-info">
          {task.excerpts && task.excerpts.length > 0 && (
            <button className="info-btn" onClick={() => onOpenInfoModal(task)} title="View source info" aria-label="View source information">
              &#8505;
            </button>
          )}
        </td>
      )}
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
        if (!task.startDate || !task.dueDate) {
            // Fallback for tasks that might be missing dates
            const taskStart = new Date(task.dueDate);
            const offset = (taskStart.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
            const left = (offset / totalDays) * 100;
            return { left: `${Math.max(0, left)}%`, width: `1%` };
        }
        
        const taskStart = new Date(task.startDate);
        const taskEnd = new Date(task.dueDate);

        // Ensure end date is after start date for calculation
        if (taskEnd < taskStart) {
            taskEnd.setDate(taskStart.getDate() + 1);
        }
        
        const offset = (taskStart.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        let duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 3600 * 24) + 1; // Inclusive of due date
        if (duration < 1) duration = 1; // Minimum 1 day duration

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
                    {tasks.sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).map(task => {
                        const { left, width } = getBarPosition(task);
                        return (
                            <div key={task.id} className="gantt-row">
                                <div className="gantt-task-name" title={task.taskName}>{task.taskName}</div>
                                <div className="gantt-task-bar-container">
                                    <div 
                                        className={`gantt-task-bar status-${task.status.replace('-', '')}`}
                                        style={{ left, width }}
                                        title={`${task.taskName} | Start: ${task.startDate} | Due: ${task.dueDate}`}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <p className="gantt-footnote">Task bars represent the duration from the task's start date to its due date.</p>
        </div>
    );
};


// --- Other Main View Components ---

const AutomatedReportsView = ({ plan }: { plan: Plan }) => {
    const [report, setReport] = useState<string | null>(null);
    const [reportDate, setReportDate] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('Working...');
    const reportContentRef = useRef<HTMLDivElement>(null);
    const allTasks = plan.periods.flatMap(p => p.tasks);
    const activeTasks = allTasks.filter(task => task.status !== 'Removed');

    const generateReport = async () => {
        if (!ai) {
          setError("Client not initialized. Please log in.");
          return;
        }
        setLoading(true);
        setLoadingMessage("Analyzing plan...");
        setError(null);
        setReport(null);

        const today = new Date();
        const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
        setReportDate(today.toLocaleDateString('en-US', options));

        try {
            // Create a deep copy to avoid mutating state, but also clean it for the API call.
            const planForAnalysis = {
                ...plan,
                periods: plan.periods.map(period => ({
                    ...period,
                    tasks: period.tasks.filter(task => task.status !== 'Removed').map(task => {
                        // Create a new task object without the large attachment content.
                        const taskForApi: any = { ...task };
                        if (task.attachments && task.attachments.length > 0) {
                            taskForApi.attachmentNames = task.attachments.map(a => a.fileName).join(', ');
                        }
                        delete taskForApi.attachments; // Remove base64 data to save tokens
                        return taskForApi;
                    })
                }))
            };

            setLoadingMessage('Generating report narrative...');

            const planSummary = JSON.stringify(planForAnalysis, null, 2);
            const prompt = `
            You are an assistant for the General Committee Chairperson of the AGMSC.
            The current chairperson is ${plan.chairperson}.
            Your task is to generate a comprehensive, well-structured progress report based on the provided project plan data.
            The report should be written in a professional, narrative style suitable for presenting to a committee.
            
            **IMPORTANT INSTRUCTIONS:**
            1.  Generate the narrative sections as requested below.
            2.  If a task has attachments, note this by listing the filenames found in the 'attachmentNames' property. Do not attempt to interpret or summarize the content of these files. Simply mention that files are attached and list their names.
            3.  Format the entire output as clean HTML content within a single div. Use h3 for section titles and p and ul/li for content. Do not include any html, head or body tags. Do not use markdown like asterisks (*) for lists; use proper HTML <ul> and <li> tags instead.

            **NARRATIVE SECTIONS TO GENERATE:**
            1.  **Executive Summary:** A brief overview of the project's current status, key highlights, and overall outlook.
            2.  **Key Accomplishments:** List major tasks that have been completed.
            3.  **Items in Progress:** Detail tasks currently being worked on, referencing attachment filenames for context where available.
            4.  **Upcoming Priorities:** Highlight critical tasks that are not yet started, especially those with high priority or upcoming due dates.

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
    
    const saveAsPdf = async () => {
        const reportElement = reportContentRef.current;
        if (!reportElement || !plan) return;
        
        // Capture scrollWidth before style changes that might affect it
        const contentScrollWidth = reportElement.scrollWidth;

        try {
            // Temporarily remove padding for accurate PDF margin calculation
            reportElement.style.padding = '0';

            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                // Ensure the canvas is wide enough for the entire scrollable content
                width: contentScrollWidth,
                windowWidth: contentScrollWidth,
            });
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const topBottomMargin = 38.1; // 1.5 inches in mm (1.5 * 25.4)
            const leftRightMargin = 15;     // ~0.6 inches, a reasonable horizontal margin
    
            const pdfPageWidth = pdf.internal.pageSize.getWidth();
            const pdfPageHeight = pdf.internal.pageSize.getHeight();
            
            const contentWidth = pdfPageWidth - leftRightMargin * 2;
            const pageContentHeight = pdfPageHeight - topBottomMargin * 2;
    
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
    
            // Calculate the height of the image in the PDF, maintaining aspect ratio
            const totalImgHeightInMM = (canvasHeight * contentWidth) / canvasWidth;
            
            const imgData = canvas.toDataURL('image/png');
    
            let numPages = Math.ceil(totalImgHeightInMM / pageContentHeight);
            if (numPages === 0) numPages = 1;
    
            for (let i = 0; i < numPages; i++) {
                if (i > 0) {
                    pdf.addPage();
                }
                // The y-offset for the image on each page. This effectively creates a "window"
                // that moves down the large image for each new page.
                const yOffset = -(i * pageContentHeight);
    
                // Add the image to the page. jsPDF will clip it to the page dimensions.
                pdf.addImage(imgData, 'PNG', leftRightMargin, yOffset + topBottomMargin, contentWidth, totalImgHeightInMM);
            }
            
            // Add page numbers to each page
            for (let i = 1; i <= numPages; i++) {
                pdf.setPage(i);
                pdf.setFontSize(10);
                pdf.setTextColor(128); // Gray color
                
                const pageText = `Page ${i} of ${numPages}`;
                const textWidth = pdf.getStringUnitWidth(pageText) * pdf.getFontSize() / pdf.internal.scaleFactor;
                const textX = (pdfPageWidth - textWidth) / 2; // Center horizontally
                const textY = pdfPageHeight - 15; // 15mm from the bottom
                
                pdf.text(pageText, textX, textY);
            }
    
            pdf.save(`AGMSC-Report-${plan.termYear}.pdf`);
        } catch (error) {
            console.error("Error saving PDF:", error);
            setError(`Failed to save PDF. Error: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            // Restore padding by removing the inline style to let CSS rules apply again
            reportElement.style.padding = '';
        }
    };


    return (
        <div className="report-panel">
            <div className="report-actions">
                <button className="action-btn primary" onClick={generateReport} disabled={loading || !ai}>
                    {loading ? <><div className="small-spinner"></div> Generating...</> : 'Generate Report'}
                </button>
                {report && (
                    <>
                        <button className="action-btn" onClick={printReport}>
                            Print Report
                        </button>
                        <button className="action-btn pdf-save-btn" onClick={saveAsPdf}>
                            Save as PDF
                        </button>
                    </>
                )}
            </div>
            
            <div id="report-output">
                {loading && <Loader message={loadingMessage} />}
                {error && <p id="error-container">{error}</p>}

                {report && !loading && reportDate ? (
                    <div ref={reportContentRef} className="report-light-theme">
                        <h2 className="report-main-title">
                            AGMSC Chairman's Report - {plan.termYear}<br />
                            <small>Progress as of {reportDate}</small>
                            <small>Chairperson: {plan.chairperson}</small>
                        </h2>
                        
                        <div className="report-narrative report-section" dangerouslySetInnerHTML={{ __html: report }} />

                        <div className="report-section page-break">
                            <DashboardView tasks={activeTasks} />
                        </div>
                        
                        <div className="report-section page-break">
                             <KanbanView tasks={activeTasks} />
                        </div>

                        <div className="report-section page-break">
                            <GanttView tasks={activeTasks} termYear={plan.termYear} />
                        </div>

                    </div>
                ) : (
                    !loading && (
                        <div className="report-placeholder">
                            <p>
                                Click "Generate Report" to create a summary of the project plan.
                            </p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

const AddTaskView = ({ onAddTask, isAdmin }: { onAddTask: (task: Omit<Task, 'id' | 'source'>) => void, isAdmin: boolean }) => {
    const [taskName, setTaskName] = useState('');
    const [responsible, setResponsible] = useState('General Chairman');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [status, setStatus] = useState<'Not-Started' | 'In-Progress' | 'Completed' | 'Removed'>('Not-Started');
    const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
    const [comments, setComments] = useState('');
    const [rewordLoading, setRewordLoading] = useState(false);
    const [rewordError, setRewordError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!taskName || !startDate || !dueDate) {
            alert("Task Name, Start Date, and Due Date are required.");
            return;
        }
        onAddTask({ taskName, responsible, startDate, dueDate, status, priority, comments });
        // Reset form
        setTaskName('');
        setResponsible('General Chairman');
        setStartDate('');
        setDueDate('');
        setStatus('Not-Started');
        setPriority('Medium');
        setComments('');
        setSuggestions([]);
        setRewordError(null);
    };

    const handleReword = async () => {
        if (!ai || !comments) return;
        setRewordLoading(true);
        setRewordError(null);
        setSuggestions([]);
        try {
            const prompt = `Rephrase the following comment for a project management log to be more professional and concise. Provide 3 alternative versions. The comment is: "${comments}"`;
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
              setRewordError("Could not generate suggestions.");
            }
        } catch (e) {
            setRewordError(`Failed to get suggestions. Error: ${e instanceof Error ? e.message : String(e)}`);
        } finally {
            setRewordLoading(false);
        }
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
                    <label htmlFor="startDate">Start Date</label>
                    <input type="date" id="startDate" value={startDate} onChange={e => setStartDate(e.target.value)} required />
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
                        <option value="Removed">Removed</option>
                    </select>
                </div>
                 <div className="form-group">
                    <div className="textarea-header">
                      <label htmlFor="comments">Comments</label>
                       {isAdmin && (
                            <button type="button" className="reword-btn" onClick={handleReword} disabled={rewordLoading || !comments}>
                                {rewordLoading ? <div className="small-spinner"></div> : '✨ Suggest Rewording'}
                            </button>
                        )}
                    </div>
                    <textarea id="comments" value={comments} onChange={e => setComments(e.target.value)}></textarea>
                     {rewordError && <p className="reword-error">{rewordError}</p>}
                    {suggestions.length > 0 && (
                        <div className="suggestions-container">
                            <h4>Suggestions:</h4>
                            <ul>
                                {suggestions.map((s, i) => (
                                    <li key={i}><button type="button" onClick={() => setComments(s)}>{s}</button></li>
                                ))}
                            </ul>
                             <button type="button" className="action-btn-small" onClick={() => setSuggestions([])}>Clear Suggestions</button>
                        </div>
                    )}
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


const DetailsModal = ({ task, onClose, onSave, isAdmin }: { task: Task, onClose: () => void, onSave: (updatedTask: Task) => void, isAdmin: boolean }) => {
    const [localTask, setLocalTask] = useState<Task>({ ...task });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rewordLoading, setRewordLoading] = useState(false);
    const [rewordError, setRewordError] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const handleCommentChange = (newComment: string) => {
        setLocalTask(prev => ({ ...prev, comments: newComment }));
    };
    
    const handleFileAdd = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const fileContent = e.target?.result as string;
                const newAttachment: Attachment = {
                    fileName: file.name,
                    fileContent,
                    fileType: file.type,
                };
                setLocalTask(prev => ({
                    ...prev,
                    attachments: [...(prev.attachments || []), newAttachment]
                }));
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert("Only PDF files are allowed.");
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileRemove = (fileNameToRemove: string) => {
        setLocalTask(prev => ({
            ...prev,
            attachments: prev.attachments?.filter(att => att.fileName !== fileNameToRemove)
        }));
    };

    const handleReword = async () => {
        if (!ai || !localTask.comments) return;
        setRewordLoading(true);
        setRewordError(null);
        setSuggestions([]);
        try {
            const prompt = `Rephrase the following comment for a project management log to be more professional and concise. Provide 3 alternative versions. The comment is: "${localTask.comments}"`;
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
              setRewordError("Could not generate suggestions.");
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
                    <h3>Details for: {task.taskName}</h3>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-content">
                    <div className="textarea-header">
                        <label htmlFor="comment-textarea">Comments</label>
                        {isAdmin && (
                            <button className="reword-btn" onClick={handleReword} disabled={rewordLoading || !localTask.comments}>
                                {rewordLoading ? <div className="small-spinner"></div> : '✨ Suggest Rewording'}
                            </button>
                        )}
                    </div>
                    <textarea
                        id="comment-textarea"
                        value={localTask.comments}
                        onChange={(e) => handleCommentChange(e.target.value)}
                    />
                    {rewordError && <p className="reword-error">{rewordError}</p>}
                    {suggestions.length > 0 && (
                        <div className="suggestions-container">
                            <h4>Suggestions:</h4>
                            <ul>
                                {suggestions.map((s, i) => (
                                    <li key={i}><button onClick={() => handleCommentChange(s)}>{s}</button></li>
                                ))}
                            </ul>
                             <button className="action-btn-small" onClick={() => setSuggestions([])}>Clear Suggestions</button>
                        </div>
                    )}
                     <div className="attachments-section">
                        <h4>Attachments</h4>
                        {localTask.attachments && localTask.attachments.length > 0 ? (
                            <ul className="attachments-list">
                                {localTask.attachments.map(att => (
                                    <li key={att.fileName} className="attachment-item">
                                        <a href={att.fileContent} download={att.fileName} target="_blank" rel="noopener noreferrer">
                                            {att.fileName}
                                        </a>
                                        <button onClick={() => handleFileRemove(att.fileName)}>&times;</button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="no-attachments-msg">No files attached.</p>
                        )}
                        <div className="file-input-wrapper">
                            <button onClick={() => fileInputRef.current?.click()}>Upload PDF</button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleFileAdd}
                                accept="application/pdf"
                                style={{ display: 'none' }} 
                            />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="action-btn" onClick={onClose}>Cancel</button>
                    <button className="action-btn primary" onClick={() => onSave(localTask)}>Save Details</button>
                </div>
            </div>
        </div>
    );
};

const InfoModal = ({ task, onClose }: { task: Task; onClose: () => void; }) => {
    if (!task.excerpts || task.excerpts.length === 0) return null;

    return (
        <div id="modal-container">
            <div className="modal-backdrop" onClick={onClose}></div>
            <div className="modal">
                <div className="modal-header">
                    <h3>Source for: {task.taskName}</h3>
                    <button className="modal-close-btn" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-content">
                    {task.excerpts.map((excerpt, index) => (
                        <div key={index} className="excerpt-block">
                            <h4>From: {excerpt.source}</h4>
                            <blockquote>{excerpt.text}</blockquote>
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="action-btn primary" onClick={onClose}>Close</button>
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