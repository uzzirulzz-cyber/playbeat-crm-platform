'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, ChevronDown, CheckSquare, Square } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  filterable?: boolean
  filters?: { key: string; label: string; options: { value: string; label: string }[] }[]
  bulkActions?: { label: string; onClick: (selectedIds: string[]) => void; variant?: 'default' | 'destructive' }[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

/**
 * Enterprise DataTable — search, filter, sticky header, bulk actions.
 * Used across Admin and CRM.
 */
export function DataTable<T>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Search…',
  filterable = false,
  filters = [],
  bulkActions = [],
  rowKey,
  onRowClick,
  emptyMessage = 'No data found.',
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Filter + search
  const filteredData = useMemo(() => {
    let result = [...data]

    if (search) {
      const s = search.toLowerCase()
      result = result.filter((row) =>
        columns.some((col) => {
          const val = (row as any)[col.key]
          return val !== null && val !== undefined && String(val).toLowerCase().includes(s)
        })
      )
    }

    for (const [key, value] of Object.entries(activeFilters)) {
      if (value && value !== '__all') {
        result = result.filter((row) => String((row as any)[key] || '') === value)
      }
    }

    if (sortBy) {
      result.sort((a, b) => {
        const aVal = (a as any)[sortBy]
        const bVal = (b as any)[sortBy]
        if (aVal === null || aVal === undefined) return 1
        if (bVal === null || bVal === undefined) return -1
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDir === 'asc' ? aVal - bVal : bVal - aVal
        }
        return sortDir === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal))
      })
    }

    return result
  }, [data, search, activeFilters, sortBy, sortDir, columns])

  const allSelected = filteredData.length > 0 && selected.size === filteredData.length
  const someSelected = selected.size > 0 && !allSelected

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filteredData.map(rowKey)))
    }
  }

  function toggleRow(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  function handleSort(key: string) {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortDir('asc')
    }
  }

  const selectedIds = Array.from(selected)

  return (
    <div className="space-y-3">
      {/* Toolbar: search + filters + bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {searchable && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        )}

        {filterable && filters.map((f) => (
          <div key={f.key} className="relative">
            <select
              value={activeFilters[f.key] || '__all'}
              onChange={(e) => setActiveFilters({ ...activeFilters, [f.key]: e.target.value })}
              className="h-9 text-sm border border-slate-200 rounded-md pl-3 pr-8 bg-white appearance-none cursor-pointer hover:border-slate-300 focus:outline-none focus:border-navy"
            >
              <option value="__all">All {f.label}</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        ))}

        {bulkActions.length > 0 && selectedIds.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-500 font-medium">{selectedIds.length} selected</span>
            {bulkActions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  action.onClick(selectedIds)
                  setSelected(new Set())
                }}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-md font-medium transition-colors',
                  action.variant === 'destructive'
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-navy text-white hover:bg-navy-light'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto custom-scroll">
          <table className="pb-table">
            <thead>
              <tr>
                {bulkActions.length > 0 && (
                  <th style={{ width: '40px' }}>
                    <button onClick={toggleAll} className="flex items-center">
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-navy" />
                      ) : someSelected ? (
                        <CheckSquare className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={col.width ? { width: col.width } : undefined}
                    className={col.sortable ? 'cursor-pointer select-none' : ''}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && sortBy === col.key && (
                        <span className="text-gold">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + (bulkActions.length > 0 ? 1 : 0)} className="text-center py-12 text-slate-400">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => {
                  const id = rowKey(row)
                  const isSelected = selected.has(id)
                  return (
                    <tr
                      key={id}
                      className={cn(
                        onRowClick && 'cursor-pointer',
                        isSelected && 'bg-cloud'
                      )}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {bulkActions.length > 0 && (
                        <td onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleRow(id)}>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-navy" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col.key}>
                          {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer count */}
      <div className="text-xs text-slate-500 text-right">
        {filteredData.length} of {data.length} {data.length === 1 ? 'record' : 'records'}
      </div>
    </div>
  )
}
