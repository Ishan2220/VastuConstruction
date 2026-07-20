import React, { useState } from 'react';
import { Plus, Trash2, Check, ChevronDown } from 'lucide-react';
import { useCustomCategories } from '@/hooks/useCustomCategories';
import { toast } from 'sonner';

interface CategorySelectProps {
  module: 'labour' | 'materials' | 'tasks' | 'expenses' | 'vendors' | 'incomes' | 'sites' | 'payment_method' | 'lead_source' | 'material_unit';
  value: string;
  onChange: (value: string) => void;
  defaultOptions?: string[];
  placeholder?: string;
  className?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  module,
  value,
  onChange,
  defaultOptions = [],
  placeholder = 'Select category...',
  className = '',
}) => {
  const { allCategories, customCategories, addCategory, deleteCategory } = useCustomCategories(module, defaultOptions);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newCatName.trim()) return;
    const formatted = newCatName.trim().toUpperCase();
    addCategory(formatted);
    onChange(formatted);
    setNewCatName('');
    setIsAdding(false);
    setIsOpen(false);
    toast.success(`Category "${formatted}" added permanently!`);
  };

  const handleDelete = (cat: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCategory(cat);
    if (value === cat) {
      onChange(allCategories.find(c => c !== cat) || '');
    }
    toast.success(`Category "${cat}" removed`);
  };

  return (
    <div className="relative w-full text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 shadow-2xs transition-all hover:border-slate-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${className}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsAdding(false);
              setIsManaging(false);
            }}
          />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-80 w-full min-w-[220px] overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            {/* Standard and Custom categories */}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {allCategories.map((cat) => (
                <div
                  key={cat}
                  onClick={() => {
                    onChange(cat);
                    setIsOpen(false);
                  }}
                  className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                    value === cat
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate">{cat}</span>
                  <div className="flex items-center gap-1.5">
                    {value === cat && <Check className="h-3.5 w-3.5 shrink-0 text-indigo-600" />}
                    {customCategories.includes(cat) && isManaging && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(cat, e)}
                        className="rounded p-1 text-rose-500 hover:bg-rose-50"
                        title="Delete custom category"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="my-1.5 border-t border-slate-100" />

            {/* Add Custom Category Form */}
            {isAdding ? (
              <form onSubmit={handleAddSubmit} className="p-1 space-y-2">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Type category name..."
                  autoFocus
                  className="w-full rounded-lg border border-indigo-200 bg-indigo-50/30 px-2.5 py-1.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAdding(false);
                    }}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAdding(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition-all hover:bg-indigo-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Custom Category...</span>
                </button>
                {customCategories.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsManaging(!isManaging);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-slate-500 hover:bg-slate-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>{isManaging ? 'Done Deleting' : 'Delete Custom Category...'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
