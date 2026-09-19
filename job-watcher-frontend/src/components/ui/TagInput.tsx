import React, { useState, KeyboardEvent } from 'react';
import { Badge } from './Badge';
import { X } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const TagInput: React.FC<TagInputProps> = ({ tags, onChange, placeholder, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      onChange(tags.slice(0, tags.length - 1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    if (disabled) return;
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div
      className={`flex flex-wrap items-center gap-2 p-2.5 border border-slate-800 rounded-xl bg-slate-900/80 transition-all ${
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'focus-within:border-cyan-500 focus-within:ring-1 focus-within:ring-cyan-500/50'
      }`}
    >
      {tags.map(tag => (
        <Badge
          key={tag}
          variant="outline"
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-cyan-950/40 border-cyan-500/30 text-cyan-300 rounded-lg"
        >
          <span>{tag}</span>
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-cyan-400/60 hover:text-cyan-200 focus:outline-none ml-0.5"
            disabled={disabled}
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[140px] bg-transparent outline-none text-xs font-mono text-slate-100 placeholder:text-slate-500"
        disabled={disabled}
      />
    </div>
  );
};
