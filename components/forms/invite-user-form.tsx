'use client';

import { useState, useEffect, FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DialogFooter } from '@/components/ui/dialog';
import { MultiSwitcher, Switcher } from '@/components/ui/shadcn-io/navbar-12/Switcher';

interface Project {
  id: number;
  project_name: string;
}

interface InviteUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function InviteUserForm({ onSuccess, onCancel }: InviteUserFormProps) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('user');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch projects to populate the multi-select
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/v1/projects');
        const data = await response.json();
        if (data.status === 'success') {
          setProjects(data.projects);
        }
      } catch (error) {
        toast.error('Failed to load projects');
      }
    };
    fetchProjects();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/v1/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, role, project_ids: selectedProjects }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Invitation sent successfully');
        onSuccess();
      } else {
        toast.error(data.message || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error('Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const projectItems = projects.map((p) => ({ value: String(p.id), label: p.project_name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground">Email *</label>
        <Input
          type="email"
          placeholder="Enter user's email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Username *</label>
        <Input
          placeholder="Enter a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Role *</label>
        <Switcher
          items={[
            { value: 'user', label: 'User' },
            { value: 'admin', label: 'Admin' },
          ]}
          value={role}
          onChange={setRole}
          placeholder="Select role..."
          searchPlaceholder="Search role..."
          emptyText="No roles found."
          widthClassName="w-full"
          allowClear={false}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-foreground">Assign to Projects</label>
        <MultiSwitcher
          items={projectItems}
          values={selectedProjects.map(String)}
          onChange={(nextValues) => setSelectedProjects(nextValues.map((v) => Number(v)))}
          placeholder="Select projects..."
          searchPlaceholder="Search project..."
          emptyText="No projects found."
          widthClassName="w-full"
        />
      </div>
      <DialogFooter className='pt-4'>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Send Invitation
        </Button>
      </DialogFooter>
    </form>
  );
}
