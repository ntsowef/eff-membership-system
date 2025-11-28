/**
 * FilterBar Component
 * Reusable filter bar with search and select filters
 */

import React from 'react';
import {
  Paper,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
} from '@mui/material';
import { Search, FilterList, Clear } from '@mui/icons-material';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface FilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  onClearFilters?: () => void;
  showClearButton?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  onClearFilters,
  showClearButton = true,
}) => {
  const hasActiveFilters =
    searchValue ||
    filters.some((filter) => filter.value && filter.value !== 'all');

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2} alignItems="center">
        {/* Search Field */}
        {onSearchChange && (
          <Grid item xs={12} md={filters.length > 0 ? 4 : 8}>
            <TextField
              fullWidth
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
        )}

        {/* Filter Selects */}
        {filters.map((filter) => (
          <Grid
            item
            xs={12}
            md={onSearchChange ? 12 / (filters.length + 1) : 12 / filters.length}
            key={filter.id}
          >
            <FormControl fullWidth>
              <InputLabel>{filter.label}</InputLabel>
              <Select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                label={filter.label}
              >
                {filter.options.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        ))}

        {/* Clear Filters Button */}
        {showClearButton && hasActiveFilters && onClearFilters && (
          <Grid item xs={12} md="auto">
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={onClearFilters}
              fullWidth
            >
              Clear Filters
            </Button>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default FilterBar;

