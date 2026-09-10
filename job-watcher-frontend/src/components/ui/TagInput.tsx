import React, { useState, KeyboardEvent } from 'react';
import { Badge } from './Badge';

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
    <div className={`flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md bg-white ${disabled ? 'opacity-50 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500'}`}>
      {tags.map(tag => (
        <Badge key={tag} variant="default" className="flex items-center gap-1 px-2 py-1 text-sm">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
            disabled={disabled}
          >
            &times;
          </button>
        </Badge>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] bg-transparent outline-none text-sm text-gray-900 placeholder:text-gray-400"
        disabled={disabled}
      />
    </div>
  );
};
