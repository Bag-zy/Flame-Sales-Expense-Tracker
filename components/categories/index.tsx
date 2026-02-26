'use client';

import { useState } from 'react';
import { FolderOpen, Tag, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface ProjectCategory {
  id: number;
  category_name: string;
  description?: string;
  is_custom?: boolean;
  created_by: number;
  created_at: string;
}

export interface ExpenseCategory {
  id: number;
  category_name: string;
  description?: string;
  project_category_id?: number;
  created_by: number;
  created_at: string;
}

export interface ProjectCategoryCardProps {
  category: ProjectCategory;
  isSelected?: boolean;
  expenseCount?: number;
  onSelect?: (category: ProjectCategory) => void;
  onEdit?: (category: ProjectCategory) => void;
  onDelete?: (category: ProjectCategory) => void;
}

export function ProjectCategoryCard({
  category,
  isSelected = false,
  expenseCount = 0,
  onSelect,
  onEdit,
  onDelete,
}: ProjectCategoryCardProps) {
  const description =
    category.description && !category.description.startsWith('Custom category:')
      ? category.description
      : '';

  return (
    <button
      type="button"
      onClick={() => onSelect?.(category)}
      className={`w-full text-left rounded-lg border p-4 transition-colors bg-card ${
        isSelected
          ? 'border-primary ring-1 ring-primary/40'
          : 'border-border hover:border-border/80'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 shrink-0">
              <FolderOpen className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground truncate">
              {category.category_name}
            </h3>
            {!!category.is_custom && (
              <Badge variant="secondary" className="text-[10px] shrink-0">Custom</Badge>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
          )}
          {expenseCount > 0 && (
            <p className="text-xs text-muted-foreground">{expenseCount} expense categories</p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-1 ml-2 shrink-0">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(category);
                }}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export interface ExpenseCategoryCardProps {
  category: ExpenseCategory;
  projectCategoryName?: string;
  onEdit?: (category: ExpenseCategory) => void;
  onDelete?: (category: ExpenseCategory) => void;
}

export function ExpenseCategoryCard({
  category,
  projectCategoryName,
  onEdit,
  onDelete,
}: ExpenseCategoryCardProps) {
  return (
    <Card className="transition-all hover:shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted shrink-0">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{category.category_name}</CardTitle>
              {projectCategoryName && (
                <p className="text-xs text-muted-foreground truncate">{projectCategoryName}</p>
              )}
            </div>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-1 shrink-0">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(category)}>
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(category)}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      {category.description && (
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{category.description}</p>
        </CardContent>
      )}
    </Card>
  );
}

export interface CategoryListProps {
  projectCategories: ProjectCategory[];
  expenseCategories: ExpenseCategory[];
  selectedProjectCategoryId?: number | null;
  onSelectProjectCategory: (category: ProjectCategory) => void;
  onEditProjectCategory: (category: ProjectCategory) => void;
  onDeleteProjectCategory: (category: ProjectCategory) => void;
  onEditExpenseCategory: (category: ExpenseCategory) => void;
  onDeleteExpenseCategory: (category: ExpenseCategory) => void;
  onAddProjectCategory: () => void;
  onAddExpenseCategory: () => void;
  isLoading?: boolean;
  getProjectCategoryName?: (id?: number) => string;
}

export function CategoryList({
  projectCategories,
  expenseCategories,
  selectedProjectCategoryId,
  onSelectProjectCategory,
  onEditProjectCategory,
  onDeleteProjectCategory,
  onEditExpenseCategory,
  onDeleteExpenseCategory,
  onAddProjectCategory,
  onAddExpenseCategory,
  isLoading = false,
  getProjectCategoryName,
}: CategoryListProps) {
  const [projectSearch, setProjectSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  const filteredProjectCategories = projectCategories.filter((c) =>
    c.category_name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const visibleExpenseCategories = selectedProjectCategoryId
    ? expenseCategories.filter(
        (c) =>
          c.project_category_id === selectedProjectCategoryId &&
          c.category_name.toLowerCase().includes(expenseSearch.toLowerCase())
      )
    : [];

  const selectedProjectCategory = selectedProjectCategoryId
    ? projectCategories.find((c) => c.id === selectedProjectCategoryId)
    : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Project Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Project Categories ({projectCategories.length})</h2>
          </div>
          <Button size="sm" onClick={onAddProjectCategory}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search project categories..."
            value={projectSearch}
            onChange={(e) => setProjectSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="space-y-3 h-[60vh] overflow-y-auto pr-1">
          {filteredProjectCategories.map((category) => (
            <ProjectCategoryCard
              key={category.id}
              category={category}
              isSelected={selectedProjectCategoryId === category.id}
              expenseCount={expenseCategories.filter((e) => e.project_category_id === category.id).length}
              onSelect={onSelectProjectCategory}
              onEdit={onEditProjectCategory}
              onDelete={onDeleteProjectCategory}
            />
          ))}

          {filteredProjectCategories.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No project categories</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {projectSearch ? 'Try adjusting your search' : 'Create your first project category'}
              </p>
              {!projectSearch && (
                <Button onClick={onAddProjectCategory} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Expense Categories</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProjectCategory
                ? `For "${selectedProjectCategory.category_name}"`
                : 'Select a project category first'}
            </p>
          </div>
          <Button size="sm" onClick={onAddExpenseCategory} disabled={!selectedProjectCategoryId}>
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search expense categories..."
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            className="pl-9"
            disabled={!selectedProjectCategoryId}
          />
        </div>

        <div className="space-y-3 h-[60vh] overflow-y-auto pr-1">
          {selectedProjectCategoryId ? (
            visibleExpenseCategories.map((category) => (
              <ExpenseCategoryCard
                key={category.id}
                category={category}
                onEdit={onEditExpenseCategory}
                onDelete={onDeleteExpenseCategory}
              />
            ))
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No category selected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Select a project category to view its expense categories
              </p>
            </div>
          )}

          {selectedProjectCategoryId && visibleExpenseCategories.length === 0 && (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Tag className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No expense categories</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {expenseSearch ? 'Try adjusting your search' : 'Create your first expense category'}
              </p>
              {!expenseSearch && (
                <Button onClick={onAddExpenseCategory} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense Category
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
