import { Task } from "@/types/task";

let tasks: Task[] = [];

export function addTask(task: Task) {
  tasks.push(task);
}

export function getTasks() {
  return tasks;
}

export function clearTasks() {
  tasks = [];
}
