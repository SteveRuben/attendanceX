import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Input } from './Input';
import { Loader2, Search, AlertCircle, RefreshCw } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: Option[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  disabled?: boolean;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search options...",
  loading = false,
  error = null,
  onRetry,
  disabled = false,
  className
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.description && option.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(option => option.value === value);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <div className="flex items-center">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            <span>Loading options...</span>
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className={`${className} border-red-300`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-600">Failed to load options</span>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="text-blue-600 hover:underline text-sm flex items-center"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </button>
            )}
          </div>
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select 
      value={value} 
      onValueChange={onValueChange} 
      disabled={disabled}
      onOpenChange={setIsOpen}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedOption && (
            <div className="flex flex-col items-start">
              <span>{selectedOption.label}</span>
              {selectedOption.description && (
                <span className="text-xs text-gray-500">{selectedOption.description}</span>
              )}
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {/* Search Input */}
        {options.length > 5 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
          </div>
        )}

        {/* Options */}
        {filteredOptions.length === 0 ? (
          <SelectItem value="" disabled>
            <div className="text-gray-500 text-sm">
              {searchTerm ? 'No options match your search' : 'No options available'}
            </div>
          </SelectItem>
        ) : (
          filteredOptions.map(option => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              <div className="flex flex-col">
                <span>{option.label}</span>
                {option.description && (
                  <span className="text-xs text-gray-500">{option.description}</span>
                )}
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
};

export default SearchableSelect;