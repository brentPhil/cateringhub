"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, GripVertical } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  isRowExpanded?: (row: TData) => boolean;
  enableRowDragging?: boolean;
  onRowReorder?: (startIndex: number, endIndex: number) => void;
  getRowId?: (row: TData) => string;
}

// Drag handle component
function DragHandle() {
  return (
    <button
      type="button"
      className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// Sortable row component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface SortableRowProps<TData = any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<TData, any>[];
  renderExpandedRow?: (row: TData) => React.ReactNode;
  isRowExpanded?: (row: TData) => boolean;
  enableRowDragging?: boolean;
}

function SortableRow<TData>({
  row,
  columns,
  renderExpandedRow,
  isRowExpanded,
  enableRowDragging,
}: SortableRowProps<TData>) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isExpanded = isRowExpanded?.(row.original) ?? false;

  return (
    <React.Fragment>
      {/* Main row */}
      <TableRow
        ref={setNodeRef}
        style={style}
        data-state={row.getIsSelected() && "selected"}
        className={
          renderExpandedRow ? "cursor-pointer hover:bg-muted/50" : undefined
        }
      >
        {enableRowDragging && (
          <TableCell className="w-[40px]">
            <div {...attributes} {...listeners}>
              <DragHandle />
            </div>
          </TableCell>
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {row.getVisibleCells().map((cell: any) => (
          <TableCell key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>

      {/* Expanded row */}
      {isExpanded && renderExpandedRow && (
        <TableRow>
          <TableCell
            colSpan={columns.length + (enableRowDragging ? 1 : 0)}
            className="bg-muted/20 p-6"
          >
            {renderExpandedRow(row.original)}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Filter...",
  renderExpandedRow,
  isRowExpanded,
  enableRowDragging = false,
  onRowReorder,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getRowId: getRowId
      ? (row) => getRowId(row as TData)
      : (_row, index) => index.toString(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const rows = table.getRowModel().rows;
      const oldIndex = rows.findIndex((row) => row.id === active.id);
      const newIndex = rows.findIndex((row) => row.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        onRowReorder?.(oldIndex, newIndex);
      }
    }

    setActiveId(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const rowIds = table.getRowModel().rows.map((row) => row.id);

  const tableContent = (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {enableRowDragging && (
                <TableHead className="w-[40px]">
                  <span className="sr-only">Drag handle</span>
                </TableHead>
              )}
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table
              .getRowModel()
              .rows.map((row) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  renderExpandedRow={renderExpandedRow}
                  isRowExpanded={isRowExpanded}
                  enableRowDragging={enableRowDragging}
                />
              ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length + (enableRowDragging ? 1 : 0)}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table with optional drag-and-drop */}
      {enableRowDragging ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={rowIds}
            strategy={verticalListSortingStrategy}
          >
            {tableContent}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="bg-background rounded-md border shadow-lg opacity-80">
                <Table>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => {
                      if (row.id === activeId) {
                        return (
                          <TableRow key={row.id}>
                            {enableRowDragging && (
                              <TableCell className="w-[40px]">
                                <DragHandle />
                              </TableCell>
                            )}
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      }
                      return null;
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        tableContent
      )}

      {/* Pagination - Only show when needed */}
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between text-sm">
          {/* Left side: Items info and selection */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <div>
              Showing{" "}
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
              -
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}{" "}
              of {table.getFilteredRowModel().rows.length}
            </div>
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <div>
                {table.getFilteredSelectedRowModel().rows.length} selected
              </div>
            )}
          </div>

          {/* Right side: Page navigation */}
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
