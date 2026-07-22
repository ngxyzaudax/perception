export type TodoStatus = "pending" | "in_progress" | "completed";

export type TodoItem = {
  id: string;
  content: string;
  status: TodoStatus;
};

let todos: TodoItem[] = [];

export const setTodos = (next: TodoItem[]): TodoItem[] => {
  todos = next;
  return todos;
};

export const getTodos = (): TodoItem[] => todos;

export const formatTodos = (items: TodoItem[]): string => {
  if (items.length === 0) {
    return "No todos.";
  }
  return items
    .map((item) => `[${statusMark(item.status)}] ${item.content}`)
    .join("\n");
};

const statusMark = (status: TodoStatus): string => {
  if (status === "completed") {
    return "x";
  }
  if (status === "in_progress") {
    return ">";
  }
  return " ";
};
