import { createContext, useContext, useState, type ReactNode } from 'react';

export type Task = {
  id: string;
  text: string;
  done: boolean;
};

export type TodoList = {
  id: string;
  name: string;
  tasks: Task[];
};

type TodoListsContextValue = {
  lists: TodoList[];
  createList: (name: string) => string;
  addTask: (listId: string, text: string) => void;
  toggleTask: (listId: string, taskId: string) => void;
  deleteTask: (listId: string, taskId: string) => void;
};

const TodoListsContext = createContext<TodoListsContextValue | null>(null);

export function TodoListsProvider({ children }: { children: ReactNode }) {
  const [lists, setLists] = useState<TodoList[]>([]);

  function createList(name: string) {
    const id = `${lists.length}-${name}-${Math.random()}`;
    setLists((prev) => [...prev, { id, name, tasks: [] }]);
    return id;
  }

  function addTask(listId: string, text: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              tasks: [
                ...list.tasks,
                { id: `${list.tasks.length}-${text}-${Math.random()}`, text, done: false },
              ],
            }
          : list,
      ),
    );
  }

  function toggleTask(listId: string, taskId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              tasks: list.tasks.map((task) =>
                task.id === taskId ? { ...task, done: !task.done } : task,
              ),
            }
          : list,
      ),
    );
  }

  function deleteTask(listId: string, taskId: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? { ...list, tasks: list.tasks.filter((task) => task.id !== taskId) }
          : list,
      ),
    );
  }

  return (
    <TodoListsContext.Provider value={{ lists, createList, addTask, toggleTask, deleteTask }}>
      {children}
    </TodoListsContext.Provider>
  );
}

export function useTodoLists() {
  const context = useContext(TodoListsContext);
  if (!context) {
    throw new Error('useTodoLists must be used within a TodoListsProvider');
  }
  return context;
}
