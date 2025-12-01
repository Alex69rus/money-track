import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Chip,
  Stack,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Transaction } from '../types';
import TagAutocomplete from './TagAutocomplete';

interface QuickTagSelectorProps {
  transaction: Transaction;
  onTagsUpdate: (transactionId: number, newTags: string[]) => Promise<void>;
  disabled?: boolean;
}

const QuickTagSelector: React.FC<QuickTagSelectorProps> = ({
  transaction,
  onTagsUpdate,
  disabled = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTags, setCurrentTags] = useState(transaction.tags || []);
  const [isUpdating, setIsUpdating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update currentTags when transaction.tags changes
  useEffect(() => {
    setCurrentTags(transaction.tags || []);
  }, [transaction.tags]);

  // Handle click outside to close editing
  useEffect(() => {
    const isClickInsideAutocomplete = (target: Node) => {
      const poppers = document.querySelectorAll('.MuiAutocomplete-popper');
      for (const popper of Array.from(poppers)) {
        if (popper.contains(target)) return true;
      }
      const listboxes = document.querySelectorAll('[role="listbox"]');
      for (const listbox of Array.from(listboxes)) {
        if (listbox.contains(target)) return true;
      }
      return false;
    };

    const handlePointerDown = (event: Event) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !isClickInsideAutocomplete(target)
      ) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);
      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('touchstart', handlePointerDown);
      };
    }
  }, [isEditing]);

  // Handle escape key to close editing
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isEditing]);

  const handleTagsChange = async (newTags: string[]) => {
    setCurrentTags(newTags); // Optimistic update
    setIsUpdating(true);

    try {
      await onTagsUpdate(transaction.id, newTags);
      setIsEditing(false);
    } catch (error) {
      // Revert optimistic update on error
      setCurrentTags(transaction.tags || []);
      console.error('Failed to update tags:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChipClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!disabled && !isUpdating) {
      setIsEditing(true);
    }
  };

  if (isEditing) {
    return (
      <Box
        ref={containerRef}
        sx={{
          minWidth: 200,
          maxWidth: { xs: '100%', sm: 300 },
          position: 'relative'
        }}
      >
        <TagAutocomplete
          value={currentTags}
          onChange={handleTagsChange}
          size="small"
          disabled={isUpdating}
          label=""
          placeholder="Add or remove tags..."
          autoFocus
        />
        {isUpdating && (
          <Box
            sx={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <CircularProgress size={16} />
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Box ref={containerRef}>
      <Stack
        direction="row"
        spacing={1}
        flexWrap="wrap"
        useFlexGap
        onClick={handleChipClick}
        role="button"
        aria-label="Edit tags"
        tabIndex={disabled || isUpdating ? -1 : 0}
        sx={{
          cursor: disabled || isUpdating ? 'default' : 'pointer',
          minHeight: 32,
          alignItems: 'center'
        }}
      >
        {currentTags.length > 0 ? (
          currentTags.map((tag, index) => (
            <Chip
              key={index}
              label={tag}
              size="small"
              variant="outlined"
              sx={{
                opacity: isUpdating ? 0.6 : 1,
                transition: 'opacity 0.2s ease',
                '&:hover': {
                  backgroundColor: disabled || isUpdating ? 'transparent' : 'action.hover'
                }
              }}
            />
          ))
        ) : (
          <Chip
            label="+ Add tags"
            size="small"
            variant="outlined"
            color="primary"
            sx={{
              opacity: disabled || isUpdating ? 0.4 : 0.7,
              '&:hover': {
                opacity: disabled || isUpdating ? 0.4 : 1,
                backgroundColor: disabled || isUpdating ? 'transparent' : 'primary.50'
              }
            }}
          />
        )}
        {isUpdating && (
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
              Updating...
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default QuickTagSelector;