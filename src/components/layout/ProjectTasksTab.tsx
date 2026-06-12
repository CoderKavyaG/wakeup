"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Project } from "@/store/useProjectStore";
import { useTaskStore } from "@/store/useTaskStore";
import { cn } from "@/lib/utils";
import { 
  Calendar, 
  AlertCircle, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Plus, 
  Sparkles,
  Terminal,
  Activity,
  CheckCircle2,
  Check
} from "lucide-react";

interface ProjectTask {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  milestone: string | null;
  order: number;
  userId: string;
  createdAt: string;
}

interface ProjectTasksTabProps {
  project: Project;
  isNested?: boolean;
}

interface MappedTask {
  id: string;
  title: string;
  completed: boolean;
  priority: string;
  dueDate: string | null;
  milestone: string | null;
  isGlobal: boolean;
  order: number;
}

export default function ProjectTasksTab({ project, isNested }: ProjectTasksTabProps) {
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Global Task store
  const { 
    tasks: globalTasks, 
    fetchTasks: fetchGlobalTasks, 
    addTask: addGlobalTask,
    toggleTask: toggleGlobalTask, 
    deleteTask: deleteGlobalTask 
  } = useTaskStore();

  // Inline Form State
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newDueDate, setNewDueDate] = useState("");
  const [newMilestone, setNewMilestone] = useState("");
  const [taskType, setTaskType] = useState<"project" | "global">("project");

  // Custom modal/dialog states to replace window.confirm and window.prompt
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const [renameMilestoneState, setRenameMilestoneState] = useState<{
    isOpen: boolean;
    oldName: string;
  }>({
    isOpen: false,
    oldName: "",
  });
  const [renameMilestoneValue, setRenameMilestoneValue] = useState("");

  const fetchProjectTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setProjectTasks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectTasks();
    fetchGlobalTasks();
  }, [project.id]);

  // Handle task creation
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const formattedDueDate = newDueDate ? new Date(newDueDate).toISOString() : undefined;

    if (taskType === "global") {
      // Create global task tagged with @projectname
      const cleanProjectTag = `@${project.name.toLowerCase().replace(/\s+/g, "")}`;
      const titleWithTag = `${newTitle.trim()} ${cleanProjectTag}`;
      
      try {
        await addGlobalTask({
          title: titleWithTag,
          priority: newPriority === "urgent" ? "high" : newPriority, // Map urgent to high for global store
          dueDate: formattedDueDate || undefined,
          projectId: project.id
        });
        setNewTitle("");
        setNewDueDate("");
      } catch (err) {
        console.error(err);
      }
    } else {
      // Create project-specific task
      try {
        const maxOrder = projectTasks.reduce((max, t) => Math.max(max, t.order), 0);
        const res = await fetch(`/api/projects/${project.id}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newTitle.trim(),
            milestone: newMilestone.trim() || undefined,
            priority: newPriority,
            dueDate: formattedDueDate || undefined,
            order: maxOrder + 1
          })
        });
        if (res.ok) {
          fetchProjectTasks();
          setNewTitle("");
          setNewDueDate("");
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const updateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    // Optimistic
    setProjectTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
    try {
      await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      fetchProjectTasks();
    }
  };

  const handleDeleteTask = (taskId: string, isGlobal: boolean) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Task",
      description: "Are you sure you want to delete this task? This action cannot be undone.",
      onConfirm: async () => {
        if (isGlobal) {
          try {
            await deleteGlobalTask(taskId);
          } catch (e) {
            console.error(e);
          }
        } else {
          setProjectTasks(prev => prev.filter(t => t.id !== taskId));
          try {
            await fetch(`/api/projects/${project.id}/tasks/${taskId}`, { method: "DELETE" });
          } catch (e) {
            fetchProjectTasks();
          }
        }
      }
    });
  };

  const handleRenameMilestoneClick = (oldName: string) => {
    setRenameMilestoneValue(oldName);
    setRenameMilestoneState({
      isOpen: true,
      oldName,
    });
  };

  const renameMilestone = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    setProjectTasks(prev => prev.map(t => t.milestone === oldName ? { ...t, milestone: newName.trim() } : t));
    try {
      const tasksToUpdate = projectTasks.filter(t => t.milestone === oldName);
      await Promise.all(
        tasksToUpdate.map(t =>
          fetch(`/api/projects/${project.id}/tasks/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ milestone: newName.trim() })
          })
        )
      );
    } catch (e) {
      fetchProjectTasks();
    }
  };

  const moveTask = async (task: MappedTask, direction: "up" | "down") => {
    if (task.isGlobal) return;
    const groupTasks = projectTasks.filter(t => (t.milestone || "") === (task.milestone || ""));
    const idx = groupTasks.findIndex(t => t.id === task.id);
    if (idx === -1) return;

    const swapTarget = direction === "up" ? groupTasks[idx - 1] : groupTasks[idx + 1];
    if (!swapTarget) return;

    const newOrder = swapTarget.order;
    const oldOrder = task.order;

    setProjectTasks(prev => 
      prev.map(t => {
        if (t.id === task.id) return { ...t, order: newOrder };
        if (t.id === swapTarget.id) return { ...t, order: oldOrder };
        return t;
      }).sort((a, b) => a.order - b.order)
    );

    try {
      await fetch(`/api/projects/${project.id}/tasks/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: [
            { id: task.id, order: newOrder },
            { id: swapTarget.id, order: oldOrder }
          ]
        })
      });
    } catch (e) {
      fetchProjectTasks();
    }
  };

  // Mapped tasks union
  const mappedProjectTasks: MappedTask[] = projectTasks.map(t => ({
    id: t.id,
    title: t.title,
    completed: t.completed,
    priority: t.priority,
    dueDate: t.dueDate,
    milestone: t.milestone,
    isGlobal: false,
    order: t.order
  }));

  const cleanProjectTag = `@${project.name.toLowerCase().replace(/\s+/g, "")}`;
  const spaceProjectTag = `@${project.name.toLowerCase()}`;
  const linkedGlobalTasks: MappedTask[] = globalTasks
    .filter(t => {
      const titleLower = t.title.toLowerCase();
      return t.projectId === project.id || 
             titleLower.includes(cleanProjectTag) || 
             titleLower.includes(spaceProjectTag);
    })
    .map(t => {
      let cleanTitle = t.title;
      cleanTitle = cleanTitle.replace(new RegExp(cleanProjectTag, "gi"), "");
      cleanTitle = cleanTitle.replace(new RegExp(spaceProjectTag, "gi"), "");
      return {
        id: t.id,
        title: cleanTitle.trim(),
        completed: t.completed,
        priority: t.priority,
        dueDate: t.dueDate || null,
        milestone: "@Focus Panel",
        isGlobal: true,
        order: 0
      };
    });

  const allTasks = [...mappedProjectTasks, ...linkedGlobalTasks];

  // Group tasks by milestone
  const tasksByMilestone = allTasks.reduce((acc, t) => {
    const key = t.milestone || "__none__";
    acc[key] = acc[key] || [];
    acc[key].push(t);
    return acc;
  }, {} as Record<string, MappedTask[]>);

  const milestones = Object.keys(tasksByMilestone).filter(
    k => k !== "__none__" && k !== "@Focus Panel"
  );

  return (
    <div className={isNested ? "space-y-6" : "p-6 overflow-y-auto h-full custom-scrollbar space-y-6"}>
      
      {/* Inline Task Creator Form */}
      <form onSubmit={handleCreateTask} className="bg-surface-1 border border-surface-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-white/4 pb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-purple-400 font-bold font-mono flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Create Task
          </h3>
          <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/5 h-6">
            <button
              type="button"
              onClick={() => setTaskType("project")}
              className={`px-2 text-[9px] font-bold rounded transition-all capitalize ${
                taskType === "project" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Project Task
            </button>
            <button
              type="button"
              onClick={() => setTaskType("global")}
              className={`px-2 text-[9px] font-bold rounded transition-all capitalize ${
                taskType === "global" ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
              }`}
            >
              Focus Panel Task
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-3 items-end">
          <div className="col-span-4 flex flex-col gap-1">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Task Title</span>
            <input
              type="text"
              placeholder={taskType === "global" ? "Focus Panel task details..." : "Project milestone task..."}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className="bg-surface-2 border border-surface-border rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
              required
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Priority</span>
            <select
              value={newPriority}
              onChange={e => setNewPriority(e.target.value as any)}
              className="bg-surface-2 border border-surface-border rounded-lg text-xs text-white px-2 py-1.5 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              {taskType === "project" && <option value="urgent">Urgent</option>}
            </select>
          </div>
          <div className="col-span-3 flex flex-col gap-1">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Due Date</span>
            <input
              type="date"
              value={newDueDate}
              onChange={e => setNewDueDate(e.target.value)}
              className="bg-surface-2 border border-surface-border rounded-lg text-xs text-white px-2 py-1 focus:outline-none"
            />
          </div>
          <div className="col-span-3 flex flex-col gap-1">
            <span className="text-[9px] text-white/30 font-bold uppercase tracking-wider font-mono">Milestone</span>
            <input
              type="text"
              placeholder="e.g. Phase 1 (Project only)"
              value={newMilestone}
              onChange={e => setNewMilestone(e.target.value)}
              disabled={taskType === "global"}
              className="bg-surface-2 border border-surface-border rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500/30 disabled:opacity-30"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={!newTitle.trim()}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            Add Task
          </button>
        </div>
      </form>

      {/* Task Groups Section */}
      <div className="space-y-6">
        {/* Ungrouped Tasks */}
        {tasksByMilestone["__none__"]?.length > 0 && (
          <TaskGroup
            label={null}
            tasks={tasksByMilestone["__none__"]}
            onToggle={async (id, isGlobal, completed) => {
              if (isGlobal) await toggleGlobalTask(id);
              else await updateTask(id, { completed });
            }}
            onDelete={async (id, isGlobal) => {
              handleDeleteTask(id, isGlobal);
            }}
            onMove={moveTask}
            onRename={() => {}}
          />
        )}

        {/* Milestone Groups */}
        {milestones.map((milestone) => (
          <TaskGroup
            key={milestone}
            label={milestone}
            tasks={tasksByMilestone[milestone]}
            onToggle={async (id, isGlobal, completed) => {
              if (isGlobal) await toggleGlobalTask(id);
              else await updateTask(id, { completed });
            }}
            onDelete={async (id, isGlobal) => {
              handleDeleteTask(id, isGlobal);
            }}
            onMove={moveTask}
            onRename={() => handleRenameMilestoneClick(milestone)}
          />
        ))}

        {/* Focus Panel Linked Tasks */}
        {tasksByMilestone["@Focus Panel"]?.length > 0 && (
          <TaskGroup
            label="@Focus Panel Tasks"
            tasks={tasksByMilestone["@Focus Panel"]}
            onToggle={async (id, isGlobal, completed) => {
              await toggleGlobalTask(id);
            }}
            onDelete={async (id, isGlobal) => {
              handleDeleteTask(id, isGlobal);
            }}
            onMove={() => {}}
            onRename={() => {}}
            isGlobalGroup={true}
          />
        )}

        {allTasks.length === 0 && (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-xl bg-surface-1">
            <span className="text-xs text-white/30">No project tasks found. Add a project task or link a Focus Panel task using {cleanProjectTag}.</span>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#121217] border border-white/[0.08] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">{confirmDialog.title}</h3>
              <p className="text-xs text-white/50">{confirmDialog.description}</p>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-all cursor-pointer font-medium border-0"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rename Milestone Dialog */}
      {renameMilestoneState.isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#121217] border border-white/[0.08] rounded-xl p-5 shadow-2xl space-y-4"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-white">Rename Milestone</h3>
              <p className="text-[10px] text-white/30 font-mono">Current: {renameMilestoneState.oldName}</p>
            </div>
            <input
              type="text"
              value={renameMilestoneValue}
              onChange={(e) => setRenameMilestoneValue(e.target.value)}
              className="w-full bg-[#1c1c24] border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
              placeholder="New milestone name..."
              autoFocus
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setRenameMilestoneState({ isOpen: false, oldName: "" })}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 transition-all cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  renameMilestone(renameMilestoneState.oldName, renameMilestoneValue);
                  setRenameMilestoneState({ isOpen: false, oldName: "" });
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-all cursor-pointer font-medium border-0"
              >
                Save
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

interface TaskGroupProps {
  label: string | null;
  tasks: MappedTask[];
  onToggle: (id: string, isGlobal: boolean, completed: boolean) => Promise<void>;
  onDelete: (id: string, isGlobal: boolean) => Promise<void>;
  onMove: (task: MappedTask, direction: "up" | "down") => void;
  onRename: (newName: string) => void;
  isGlobalGroup?: boolean;
}

function TaskGroup({
  label,
  tasks,
  onToggle,
  onDelete,
  onMove,
  onRename,
  isGlobalGroup = false,
}: TaskGroupProps) {
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="bg-surface-1 border border-surface-border rounded-xl p-4">
      {label && (
        <div className="flex items-center gap-2 mb-3 group/m">
          <span
            className={`text-xs font-semibold uppercase tracking-wider font-mono cursor-pointer transition-colors ${
              isGlobalGroup ? "text-purple-400/80" : "text-white/60 hover:text-white"
            }`}
            title={isGlobalGroup ? "Linked from your daily focus board" : "Double-click to rename"}
            onDoubleClick={() => {
              if (isGlobalGroup) return;
              onRename(label);
            }}
          >
            {label}
          </span>
          {!isGlobalGroup && (
            <button
              onClick={() => {
                onRename(label);
              }}
              className="opacity-0 group-hover/m:opacity-100 text-[10px] text-white/30 hover:text-white/60 transition-opacity cursor-pointer"
            >
              ✎
            </button>
          )}
          <div className="flex-1 h-px bg-white/[0.04]" />
          <span className="text-[10px] font-mono text-white/30 select-none">
            {completedCount}/{tasks.length}
          </span>
        </div>
      )}

      <div className="space-y-1">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-3 py-2 px-1 hover:bg-white/[0.01] rounded-lg group transition-colors"
          >
            {/* Checked Switch */}
            <button
              onClick={() => onToggle(task.id, task.isGlobal, !task.completed)}
              className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                task.completed
                  ? "bg-green-500/20 border-green-500/40 text-green-400"
                  : "border-surface-border hover:border-white/35 text-transparent"
              }`}
            >
              {task.completed && <Check className="w-3 h-3" />}
            </button>

            {/* Title */}
            <span
              className={`text-xs flex-1 ${
                task.completed ? "line-through text-white/25" : "text-white/80"
              }`}
            >
              {task.title}
            </span>

            {/* Actions */}
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2.5 transition-opacity shrink-0">
              {/* Reordering */}
              {!task.isGlobal && (
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => onMove(task, "up")}
                    className="text-white/20 hover:text-white/50 text-[10px] p-0.5 cursor-pointer font-mono"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onMove(task, "down")}
                    className="text-white/20 hover:text-white/50 text-[10px] p-0.5 cursor-pointer font-mono"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Priority */}
              <span
                className={`text-[9px] uppercase font-bold font-mono tracking-wider px-1.5 py-0.5 rounded border ${
                  task.priority === "urgent"
                    ? "text-red-400/80 border-red-500/20 bg-red-500/5"
                    : task.priority === "high"
                    ? "text-orange-400/80 border-orange-500/20 bg-orange-500/5"
                    : "text-white/20 border-white/5 bg-white/[0.02]"
                }`}
              >
                {task.priority}
              </span>

              {/* Due date */}
              {task.dueDate && (
                <span
                  className={`text-[9px] font-mono flex items-center gap-1 ${
                    new Date(task.dueDate) < new Date() && !task.completed ? "text-red-400" : "text-white/25"
                  }`}
                >
                  <Calendar className="w-2.5 h-2.5" />
                  {new Date(task.dueDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              )}

              {/* Delete */}
              <button
                onClick={() => onDelete(task.id, task.isGlobal)}
                className="text-white/20 hover:text-red-400 transition-colors cursor-pointer"
                title="Delete task"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
