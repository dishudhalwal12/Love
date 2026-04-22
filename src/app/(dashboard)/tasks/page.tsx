"use client";

import { useFirestore } from "@/features/hooks";
import { Task } from "@/features/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, MoreHorizontal, Loader2, GripVertical, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { orderBy, query } from "firebase/firestore";
import { toast } from "sonner";

const COLUMNS = [
  { id: "today", title: "Today", color: "border-blue-500", bg: "bg-blue-500/5", glow: "shadow-blue-500/20", textColor: "text-blue-400" },
  { id: "urgent", title: "Urgent", color: "border-rose-500", bg: "bg-rose-500/5", glow: "shadow-rose-500/20", textColor: "text-rose-400" },
  { id: "waitingClient", title: "Waiting Client", color: "border-amber-500", bg: "bg-amber-500/5", glow: "shadow-amber-500/20", textColor: "text-amber-400" },
  { id: "done", title: "Done", color: "border-emerald-500", bg: "bg-emerald-500/5", glow: "shadow-emerald-500/20", textColor: "text-emerald-400" },
];

export default function TasksPage() {
  const { data: tasks, loading, add, update, remove } = useFirestore<Task>("tasks", [orderBy("order", "asc")]);
  const [localTasks, setLocalTasks] = useState<Task[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskCol, setNewTaskCol] = useState("today");

  // Sync local state when DB state changes (basic implementation)
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Optimistic UI update
    const sourceColTasks = localTasks.filter(t => t.columnId === source.droppableId).sort((a, b) => a.order - b.order);
    const destColTasks = localTasks.filter(t => t.columnId === destination.droppableId).sort((a, b) => a.order - b.order);

    const taskObj = localTasks.find(t => t.id === draggableId);
    if (!taskObj) return;

    const newLocalTasks = Array.from(localTasks);

    // Changing columns
    taskObj.columnId = destination.droppableId;

    // We update the local state immediately for snappy UX
    setLocalTasks([...newLocalTasks]);

    try {
      // Actually update the DB
      await update(draggableId, { columnId: destination.droppableId });
    } catch (err) {
      toast.error("Failed to move task");
      setLocalTasks(tasks); // revert on error
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const colTasks = localTasks.filter(t => t.columnId === newTaskCol);
    const order = colTasks.length > 0 ? Math.max(...colTasks.map(t => t.order)) + 1 : 0;

    try {
      await add({
        title: newTaskTitle,
        columnId: newTaskCol,
        order,
        tags: ["New"],
        createdAt: Date.now()
      } as any);
      toast.success("Task added");
      setNewTaskTitle("");
      setIsAddOpen(false);
    } catch (err) {
      toast.error("Failed to add task");
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Tasks</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage workload and priorities.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2" />}>
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-card border-border/50">
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTask} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Input placeholder="Task Description" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} required className="bg-background/50 border-border/50" />
              </div>
              <Button type="submit" className="w-full mt-4">Save Task</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
            <div className="flex gap-4 h-full min-w-max">
              {COLUMNS.map((column) => {
                const columnTasks = localTasks.filter(t => t.columnId === column.id).sort((a, b) => a.order - b.order);

                return (
                  <div key={column.id} className={`w-80 flex flex-col rounded-lg border border-border/40 ${column.bg}`}>
                    <div className={`p-4 flex items-center justify-between border-b ${column.color}/20 shrink-0`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${column.color.replace('border-', 'bg-')} animate-pulse`} />
                        <h3 className={`font-semibold text-sm ${column.textColor}`}>{column.title}</h3>
                        <Badge variant="secondary" className="bg-white/5 border-white/10 text-[10px] px-1.5 py-0">
                          {columnTasks.length}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>

                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`p-3 flex-1 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-background/20' : ''}`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <Card
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-card/80 backdrop-blur-sm border-white/5 border-t-2 ${column.color} shadow-sm hover:${column.glow} hover:border-white/20 transition-all cursor-grab active:cursor-grabbing ${snapshot.isDragging ? 'opacity-80 scale-105 rotate-2' : ''}`}
                                >
                                  <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-2">
                                      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50" />
                                      <span className="text-xs font-mono text-muted-foreground">TSK-{task.id?.slice(0, 4)}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); remove(task.id); }} className="text-muted-foreground hover:text-status-urgent transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </CardHeader>
                                  <CardContent className="p-3 pt-0 space-y-3">
                                    <p className="font-medium text-sm leading-tight pl-5">{task.title}</p>
                                    <div className="flex flex-wrap gap-1.5 pl-5">
                                      {task.tags?.map((tag) => (
                                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-muted/30 border-border/50 text-muted-foreground font-normal">
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          <Button
                            variant="ghost"
                            className="w-full text-xs text-muted-foreground hover:text-foreground h-8 justify-start px-2 mt-2"
                            onClick={() => {
                              setNewTaskCol(column.id);
                              setIsAddOpen(true);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" /> Add Task
                          </Button>
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
