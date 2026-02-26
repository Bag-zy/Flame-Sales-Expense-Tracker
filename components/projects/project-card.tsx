'use client';

import { FolderKanban, Calendar, Wallet, Tag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface Project {
  id: number;
  project_name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  project_category_id?: number;
  category_id?: number;
  vendor_id?: number;
  department?: string;
  budget_allotment?: number;
  organization_id?: number;
  created_by: number;
  created_at: string;
  currency_code?: string | null;
}

export interface ProjectCardProps {
  project: Project;
  categoryName?: string;
  onSelect?: (project: Project) => void;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  isSelected?: boolean;
  showActions?: boolean;
  currencyLabel?: string;
}

export function ProjectCard({
  project,
  categoryName,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
  showActions = true,
  currencyLabel = '',
}: ProjectCardProps) {
  const now = new Date();
  const start = project.start_date ? new Date(project.start_date) : null;
  const end = project.end_date ? new Date(project.end_date) : null;

  const isActive = (!start || start <= now) && (!end || end >= now);
  const isUpcoming = start && start > now;
  const isCompleted = end && end < now;

  const getStatusBadge = () => {
    if (isActive) return <Badge variant="default" className="bg-green-600">Active</Badge>;
    if (isUpcoming) return <Badge variant="secondary">Upcoming</Badge>;
    if (isCompleted) return <Badge variant="outline">Completed</Badge>;
    return null;
  };

  return (
    <Card
      className={`transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(project)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <FolderKanban className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{project.project_name}</CardTitle>
              <CardDescription className="text-xs">
                {categoryName || 'No category'}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge()}
            {isSelected && <Badge variant="default">Selected</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">
              {project.start_date 
                ? new Date(project.start_date).toLocaleDateString() 
                : 'No start date'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-xs">
              {project.budget_allotment 
                ? `${currencyLabel} ${Number(project.budget_allotment).toLocaleString()}` 
                : 'No budget'}
            </span>
          </div>
        </div>

        {showActions && (onEdit || onDelete) && (
          <div className="flex justify-end gap-2 pt-2 border-t">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(project);
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
                  onDelete(project);
                }}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
