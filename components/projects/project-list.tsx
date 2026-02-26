'use client';

import { useState } from 'react';
import { FolderKanban, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ProjectCard, Project } from './project-card';

export interface ProjectListProps {
  projects: Project[];
  selectedProjectId?: string;
  onSelect: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onAddNew: () => void;
  isLoading?: boolean;
  getCategoryName?: (id?: number) => string;
  currencyLabel?: string;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelect,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
  getCategoryName,
  currencyLabel = '',
}: ProjectListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProjects = projects.filter((project) =>
    project.project_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const now = new Date();
  const activeCount = projects.filter((p) => {
    const start = p.start_date ? new Date(p.start_date) : null;
    const end = p.end_date ? new Date(p.end_date) : null;
    return (!start || start <= now) && (!end || end >= now);
  }).length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
            <p className="text-xs text-muted-foreground">{activeCount} active</p>
          </div>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No projects found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating a new project'}
          </p>
          {!searchTerm && (
            <Button onClick={onAddNew} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              categoryName={getCategoryName?.(project.project_category_id)}
              isSelected={selectedProjectId === project.id.toString()}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              currencyLabel={currencyLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
