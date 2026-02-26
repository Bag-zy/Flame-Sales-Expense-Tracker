'use client';

import { useMemo, useState } from 'react';
import { Users, User, Mail, Shield, Plus, Search, Trash2, Pencil, Eye, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export interface Team {
  id: number;
  name: string;
  team_lead_id: number | null;
}

export interface UserItem {
  id: number;
  employee_name: string;
  email?: string;
  user_role?: string;
  status?: 'pending' | 'active';
}

export interface TeamCardProps {
  team: Team;
  teamLeadName?: string;
  onViewMembers?: (team: Team) => void;
  onEdit?: (team: Team) => void;
  onDelete?: (team: Team) => void;
}

export function TeamCard({
  team,
  teamLeadName,
  onViewMembers,
  onEdit,
  onDelete,
}: TeamCardProps) {
  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900/20">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">{team.name}</CardTitle>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm text-muted-foreground">
          Team Lead: {teamLeadName || 'Not assigned'}
        </p>

        <div className="flex justify-end gap-2 pt-2 border-t">
          {onViewMembers && (
            <Button variant="ghost" size="sm" onClick={() => onViewMembers(team)}>
              <Users className="h-4 w-4 mr-1" />
              Members
            </Button>
          )}
          {onEdit && (
            <Button variant="ghost" size="sm" onClick={() => onEdit(team)}>
              <Pencil className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDelete(team)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface TeamListProps {
  teams: Team[];
  users: UserItem[];
  onViewMembers: (team: Team) => void;
  onEdit: (team: Team) => void;
  onDelete: (team: Team) => void;
  onAddNew: () => void;
  isLoading?: boolean;
}

export function TeamList({
  teams,
  users,
  onViewMembers,
  onEdit,
  onDelete,
  onAddNew,
  isLoading = false,
}: TeamListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  const getTeamLeadName = (teamLeadId: number | null) => {
    if (!teamLeadId) return undefined;
    return users.find((u) => u.id === teamLeadId)?.employee_name;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Teams ({teams.length})</h2>
        </div>
        <Button onClick={onAddNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            teamLeadName={getTeamLeadName(team.team_lead_id)}
            onViewMembers={onViewMembers}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {teams.length === 0 && (
          <div className="col-span-full">
            <div className="p-8 bg-card rounded-lg border border-border text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold mb-2">No teams found</h3>
              <p>Create your first team to get started.</p>
              <Button onClick={onAddNew} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export interface UserListProps {
  users: UserItem[];
  onInviteUser?: () => void;
  isLoading?: boolean;
}

export function UserList({
  users,
  onInviteUser,
  isLoading = false,
}: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    return users.filter(
      (u) =>
        u.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-10 w-32 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-lg border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 border-b animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Team Members ({users.length})</CardTitle>
        </div>
        {onInviteUser && (
          <Button onClick={onInviteUser}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite User
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/40" />
            <p>No users found.</p>
            <p className="text-sm mt-2">
              Invited users will appear here after they complete registration.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border/60">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50">
                    <td className="px-4 py-2 text-foreground">{user.id}</td>
                    <td className="px-4 py-2 text-foreground font-medium">{user.employee_name}</td>
                    <td className="px-4 py-2 text-foreground">{user.email || 'N/A'}</td>
                    <td className="px-4 py-2 text-foreground">{user.user_role || 'user'}</td>
                    <td className="px-4 py-2 text-foreground">
                      <Badge
                        variant={user.status === 'active' || !user.status ? 'default' : 'secondary'}
                        className={
                          user.status === 'active' || !user.status
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                        }
                      >
                        {user.status || 'active'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
