import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { TodoItem } from '../types';

interface TodoDrawerProps {
  todos: TodoItem[];
  onAddTodo: (text: string) => void;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
  onPlayBlip: (pitch?: number) => void;
}

export const TodoDrawer: React.FC<TodoDrawerProps> = ({
  todos,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onPlayBlip,
}) => {
  // Collapsed by default per anti-clutter rules
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');

  const completedCount = todos.filter((t) => t.completed).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddTodo(trimmed);
    setInput('');
  };

  return (
    <div className="border-t-2 border-[#17181c] pt-2 mt-2">
      {/* Collapsible Drawer Toggle Header */}
      <button
        type="button"
        onClick={() => {
          onPlayBlip(1.05);
          setIsOpen((prev) => !prev);
        }}
        className="w-full px-2.5 py-1.5 ps1-button bg-black/25 hover:bg-black/40 flex items-center justify-between text-xs"
      >
        <div className="flex items-center gap-1.5">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
          )}
          <span className="font-pixel text-[10px] uppercase tracking-wider">
            TAPED TO-DO NOTEPAD
          </span>
        </div>
        <span className="font-mono text-[10px] px-1.5 py-0.2 bg-[var(--accent-primary)] text-[#17181c] font-bold">
          {completedCount}/{todos.length}
        </span>
      </button>

      {/* Taped Notepad Body (Only rendered when expanded) */}
      {isOpen && (
        <div
          className="relative ps1-card masking-tape-top-left p-2.5 mt-2.5"
          style={{
            backgroundColor: '#FAF3EB',
            color: '#221E26',
            backgroundImage:
              'repeating-linear-gradient(transparent, transparent 20px, rgba(182, 166, 202, 0.3) 20px, rgba(182, 166, 202, 0.3) 21px)',
          }}
        >
          <div className="flex items-center gap-1 text-[10px] font-pixel uppercase text-[#D96B6B] mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>PAPER MEMO // RUSTLE ON CHECK</span>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-1 mb-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add quick task..."
              className="flex-1 min-w-0 px-2 py-1 text-xs bg-white/90 border border-[#221E26] text-[#221E26] placeholder:text-[#221E26]/45 focus:outline-none"
            />
            <button
              type="submit"
              className="px-2 py-1 bg-[#D8A7B1] text-[#17181c] ps1-button font-pixel text-[10px]"
              title="Add task"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="space-y-1 max-h-[155px] overflow-y-auto pr-0.5">
            {todos.length === 0 ? (
              <p className="text-[11px] italic opacity-60 py-2 text-center">
                No tasks left on notepad~
              </p>
            ) : (
              todos.map((todo) => (
                <div
                  key={todo.id}
                  className={`group flex items-start gap-1.5 text-xs py-0.5 px-1 rounded ${
                    todo.completed ? 'opacity-55' : 'hover:bg-black/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleTodo(todo.id)}
                    className="mt-0.5 shrink-0 text-[#221E26] hover:text-[#D96B6B]"
                  >
                    {todo.completed ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#D96B6B]" />
                    ) : (
                      <Square className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <span
                    onClick={() => onToggleTodo(todo.id)}
                    className={`flex-1 cursor-pointer leading-tight ${
                      todo.completed ? 'line-through' : 'font-medium'
                    }`}
                  >
                    {todo.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#221E26]/60 hover:text-[#D96B6B]"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
