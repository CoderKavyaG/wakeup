import React, { useState, useEffect } from "react";
import { Project } from "@/store/useProjectStore";

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
}

const inputStyle =
  "bg-black/40 border border-white/10 rounded-lg text-xs text-white px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500/30 placeholder:text-white/20 transition-colors";
const primaryBtn =
  "px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-black hover:bg-white/90 transition-all cursor-pointer";
const secondaryBtn =
  "px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 border border-white/10 text-white/80 hover:bg-white/15 transition-all cursor-pointer";

export default function ProjectTasksTab({ project }: ProjectTasksTabProps) {
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [newMilestoneInput, setNewMilestoneInput] = useState("");

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setProjectTasks(data);
      }
    } catch (e) {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [project.id]);

  const addMilestone = async (name: string) => {
    if (!name.trim()) return;
    const taskTitle = prompt(`Enter first task title for milestone "${name}":`);
    if (!taskTitle?.trim()) return;

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          milestone: name.trim(),
          priority: "medium",
        }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (e) {}
  };

  const addTask = async () => {
    const title = prompt("Enter task title:");
    if (!title?.trim()) return;

    const priority = prompt("Enter priority (low, medium, high, urgent):", "medium") || "medium";
    const cleanPriority = ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium";

    const dueDateStr = prompt("Enter due date (YYYY-MM-DD) or leave blank:");
    let dueDate: string | undefined = undefined;
    if (dueDateStr?.trim()) {
      const parsed = new Date(dueDateStr);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed.toISOString();
      }
    }

    try {
      const maxOrder = projectTasks.reduce((max, t) => Math.max(max, t.order), 0);
      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          priority: cleanPriority,
          dueDate,
          order: maxOrder + 1,
        }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (e) {}
  };

  const addTaskToMilestone = async (milestone: string | null) => {
    const title = prompt(
      milestone ? `Enter task title for milestone "${milestone}":` : "Enter task title:"
    );
    if (!title?.trim()) return;

    const priority = prompt("Enter priority (low, medium, high, urgent):", "medium") || "medium";
    const cleanPriority = ["low", "medium", "high", "urgent"].includes(priority) ? priority : "medium";

    const dueDateStr = prompt("Enter due date (YYYY-MM-DD) or leave blank:");
    let dueDate: string | undefined = undefined;
    if (dueDateStr?.trim()) {
      const parsed = new Date(dueDateStr);
      if (!isNaN(parsed.getTime())) {
        dueDate = parsed.toISOString();
      }
    }

    try {
      const groupTasks = projectTasks.filter((t) => (t.milestone || "") === (milestone || ""));
      const maxOrder = groupTasks.reduce((max, t) => Math.max(max, t.order), 0);

      const res = await fetch(`/api/projects/${project.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          milestone: milestone || undefined,
          priority: cleanPriority,
          dueDate,
          order: maxOrder + 1,
        }),
      });
      if (res.ok) {
        fetchTasks();
      }
    } catch (e) {}
  };

  const updateTask = async (taskId: string, updates: Partial<ProjectTask>) => {
    // Optimistic Update
    setProjectTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        fetchTasks();
      }
    } catch (e) {
      fetchTasks();
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    setProjectTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const res = await fetch(`/api/projects/${project.id}/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        fetchTasks();
      }
    } catch (e) {
      fetchTasks();
    }
  };

  const renameMilestone = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) return;

    const tasksToUpdate = projectTasks.filter((t) => t.milestone === oldName);

    setProjectTasks((prev) =>
      prev.map((t) => (t.milestone === oldName ? { ...t, milestone: newName.trim() } : t))
    );

    try {
      await Promise.all(
        tasksToUpdate.map((t) =>
          fetch(`/api/projects/${project.id}/tasks/${t.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ milestone: newName.trim() }),
          })
        )
      );
    } catch (e) {}
    fetchTasks();
  };

  const moveTask = async (task: ProjectTask, direction: "up" | "down") => {
    const groupTasks = projectTasks.filter((t) => (t.milestone || "") === (task.milestone || ""));
    const idx = groupTasks.findIndex((t) => t.id === task.id);
    if (idx === -1) return;

    if (direction === "up" && idx > 0) {
      const other = groupTasks[idx - 1];
      const newOrder = other.order;
      const oldOrder = task.order;

      const updatedTasks = projectTasks.map((t) => {
        if (t.id === task.id) return { ...t, order: newOrder };
        if (t.id === other.id) return { ...t, order: oldOrder };
        return t;
      });

      // Sort local state optimistically
      setProjectTasks(
        [...updatedTasks].sort((a, b) => {
          if ((a.milestone || "") !== (b.milestone || "")) {
            return (a.milestone || "").localeCompare(b.milestone || "");
          }
          return a.order - b.order;
        })
      );

      try {
        await fetch(`/api/projects/${project.id}/tasks/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: [
              { id: task.id, order: newOrder },
              { id: other.id, order: oldOrder },
            ],
          }),
        });
      } catch (e) {
        fetchTasks();
      }
    } else if (direction === "down" && idx < groupTasks.length - 1) {
      const other = groupTasks[idx + 1];
      const newOrder = other.order;
      const oldOrder = task.order;

      const updatedTasks = projectTasks.map((t) => {
        if (t.id === task.id) return { ...t, order: newOrder };
        if (t.id === other.id) return { ...t, order: oldOrder };
        return t;
      });

      setProjectTasks(
        [...updatedTasks].sort((a, b) => {
          if ((a.milestone || "") !== (b.milestone || "")) {
            return (a.milestone || "").localeCompare(b.milestone || "");
          }
          return a.order - b.order;
        })
      );

      try {
        await fetch(`/api/projects/${project.id}/tasks/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tasks: [
              { id: task.id, order: newOrder },
              { id: other.id, order: oldOrder },
            ],
          }),
        });
      } catch (e) {
        fetchTasks();
      }
    }
  };

  if (loading && projectTasks.length === 0) {
    return <div className="p-8 text-center text-xs text-white/30 animate-pulse">Loading tasks...</div>;
  }

  // Group tasks by milestone
  const tasksByMilestone = projectTasks.reduce((acc, task) => {
    const key = task.milestone || "__none__";
    acc[key] = acc[key] || [];
    acc[key].push(task);
    return acc;
  }, {} as Record<string, ProjectTask[]>);

  const milestones = Object.keys(tasksByMilestone).filter((k) => k !== "__none__");

  return (
    <div className="p-6 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-white/70">Tasks</h2>
        <div className="flex items-center gap-2">
          <input
            placeholder="New milestone..."
            className={`${inputStyle} w-36 text-xs py-1`}
            value={newMilestoneInput}
            onChange={(e) => setNewMilestoneInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                addMilestone(newMilestoneInput);
                setNewMilestoneInput("");
              }
            }}
          />
          <button onClick={addTask} className={primaryBtn}>
            + Task
          </button>
        </div>
      </div>

      {/* Ungrouped tasks first */}
      {tasksByMilestone["__none__"]?.length > 0 && (
        <TaskGroup
          label={null}
          tasks={tasksByMilestone["__none__"]}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onAddTask={() => addTaskToMilestone(null)}
          onMove={moveTask}
          onRename={() => {}}
        />
      )}

      {/* Milestone groups */}
      {milestones.map((milestone) => (
        <TaskGroup
          key={milestone}
          label={milestone}
          tasks={tasksByMilestone[milestone]}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onAddTask={() => addTaskToMilestone(milestone)}
          onMove={moveTask}
          onRename={(newName) => renameMilestone(milestone, newName)}
        />
      ))}

      {projectTasks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-white/20 text-sm">No tasks yet</div>
          <button onClick={addTask} className={`${secondaryBtn} mt-3`}>
            Add first task
          </button>
        </div>
      )}
    </div>
  );
}

interface TaskGroupProps {
  label: string | null;
  tasks: ProjectTask[];
  onUpdate: (id: string, updates: Partial<ProjectTask>) => void;
  onDelete: (id: string) => void;
  onAddTask: () => void;
  onMove: (task: ProjectTask, direction: "up" | "down") => void;
  onRename: (newName: string) => void;
}

function TaskGroup({
  label,
  tasks,
  onUpdate,
  onDelete,
  onAddTask,
  onMove,
  onRename,
}: TaskGroupProps) {
  const completed = tasks.filter((t) => t.completed).length;

  return (
    <div className="mb-6">
      {label && (
        <div className="flex items-center gap-2 mb-2 group/m">
          <span
            className="text-xs font-medium text-white/50 cursor-pointer hover:text-white/80 transition-colors"
            title="Double click to rename milestone"
            onDoubleClick={() => {
              const newName = prompt("Rename milestone to:", label);
              if (newName && newName.trim()) {
                onRename(newName.trim());
              }
            }}
          >
            {label}
          </span>
          <button
            onClick={() => {
              const newName = prompt("Rename milestone to:", label);
              if (newName && newName.trim()) {
                onRename(newName.trim());
              }
            }}
            className="opacity-0 group-hover/m:opacity-100 text-[10px] text-white/30 hover:text-white/60 transition-opacity ml-1 cursor-pointer"
          >
            ✎
          </button>
          <div className="flex-1 h-px bg-white/[0.04]" />
          <span className="text-[10px] text-white/25">
            {completed}/{tasks.length}
          </span>
        </div>
      )}
      {tasks.map((task) => (
        <div
          key={task.id}
          className="flex items-center gap-2 py-1.5 group border-b border-white/[0.03]"
        >
          <button
            onClick={() => onUpdate(task.id, { completed: !task.completed })}
            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
              task.completed
                ? "bg-green-500/20 border-green-500/40"
                : "border-white/20 hover:border-white/40"
            }`}
          >
            {task.completed && <span className="text-green-400 text-[10px]">✓</span>}
          </button>
          <span
            className={`text-xs flex-1 ${
              task.completed ? "line-through text-white/25" : "text-white/70"
            }`}
          >
            {task.title}
          </span>
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-2 transition-opacity">
            {/* Reorder actions */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => onMove(task, "up")}
                className="text-white/20 hover:text-white/60 text-[8px] p-1 cursor-pointer font-mono"
                title="Move Up"
              >
                ▲
              </button>
              <button
                onClick={() => onMove(task, "down")}
                className="text-white/20 hover:text-white/60 text-[8px] p-1 cursor-pointer font-mono"
                title="Move Down"
              >
                ▼
              </button>
            </div>
            {/* Priority */}
            <span
              className={`text-[10px] uppercase font-mono tracking-wider px-1 bg-white/5 rounded border border-white/5 ${
                task.priority === "urgent"
                  ? "text-red-400/70 border-red-500/10 bg-red-500/5"
                  : task.priority === "high"
                  ? "text-orange-400/70 border-orange-500/10 bg-orange-500/5"
                  : "text-white/25"
              }`}
            >
              {task.priority !== "medium" ? task.priority : ""}
            </span>
            {/* Due date */}
            {task.dueDate && (
              <span
                className={`text-[10px] font-mono ${
                  new Date(task.dueDate) < new Date() ? "text-red-400/70" : "text-white/25"
                }`}
              >
                {new Date(task.dueDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            <button
              onClick={() => onDelete(task.id)}
              className="text-white/15 hover:text-red-400 text-xs cursor-pointer px-1"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={onAddTask}
        className="mt-1 text-[11px] text-white/20 hover:text-white/50 transition-colors cursor-pointer"
      >
        + add task {label ? `to ${label}` : ""}
      </button>
    </div>
  );
}
