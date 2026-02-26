'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthGuard } from '@/components/auth-guard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FolderKanban, Repeat, Settings } from 'lucide-react';
import { useFilter } from '@/lib/context/filter-context';

// Import components
import { OrganizationList, Organization } from '@/components/organizations';
import { ProjectList, Project } from '@/components/projects';
import { CycleList, Cycle } from '@/components/cycles';

// Import forms
import { OrganizationForm } from '@/components/forms/organization-form';
import { ProjectForm } from '@/components/forms/project-form';
import { CycleForm } from '@/components/forms/cycle-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ProjectCategory {
  id: number;
  category_name: string;
}

interface ExpenseCategory {
  id: number;
  category_name: string;
}

export default function WorkspaceManagementPage() {
  const router = useRouter();
  const {
    selectedOrganization,
    selectedProject,
    selectedCycle,
    setSelectedOrganization,
    setSelectedProject,
    setSelectedCycle,
    organizations,
    projects,
    cycles,
    refreshOrganizations,
    refreshProjects,
    refreshCycles
  } = useFilter();

  const [activeTab, setActiveTab] = useState('organizations');

  const searchParams = useSearchParams();

  // Load params on mount
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    if (tab && ['organizations', 'projects', 'cycles'].includes(tab)) {
      setActiveTab(tab);
    }

    // Small timeout to allow state to settle or components to mount
    if (action) {
      setTimeout(() => {
        if (action === 'new' && tab === 'organizations') setShowOrgForm(true);
        if (action === 'new' && tab === 'projects') setShowProjectForm(true);
        if (action === 'new' && tab === 'cycles') setShowCycleForm(true);

        // Explicit new actions emitted by the AI assistant directly:
        if (action === 'add-org') setShowOrgForm(true);
        if (action === 'add-project') setShowProjectForm(true);
        if (action === 'add-cycle') setShowCycleForm(true);
      }, 100);
    }
  }, [searchParams]);

  // Data states
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projList, setProjList] = useState<Project[]>([]);
  const [cycleList, setCycleList] = useState<Cycle[]>([]);
  const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);

  // Loading states
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCycles, setLoadingCycles] = useState(true);

  // Modal states
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showCycleForm, setShowCycleForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);

  // Load organizations
  useEffect(() => {
    loadOrganizations();
  }, []);

  // Load projects when organization changes
  useEffect(() => {
    if (selectedOrganization) {
      loadProjects(selectedOrganization);
    } else {
      setProjList([]);
      setLoadingProjects(false);
    }
  }, [selectedOrganization]);

  // Load cycles when project changes
  useEffect(() => {
    if (selectedProject) {
      loadCycles(selectedProject);
    } else {
      setCycleList([]);
      setLoadingCycles(false);
    }
  }, [selectedProject]);

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const response = await fetch('/api/v1/organizations/all');
      const data = await response.json();
      if (data.status === 'success') {
        setOrgs(data.organizations || []);
      }
    } catch (error) {
      toast.error('Failed to load organizations');
    } finally {
      setLoadingOrgs(false);
    }
  };

  const loadProjects = async (orgId: string) => {
    setLoadingProjects(true);
    try {
      const response = await fetch(`/api/v1/projects?org_id=${orgId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setProjList(data.projects || []);
      }

      // Also load categories
      const catRes = await fetch(`/api/v1/project-categories?organizationId=${orgId}`);
      const catData = await catRes.json();
      if (catData.status === 'success') {
        setProjectCategories(catData.categories || []);
      }

      const expCatRes = await fetch(`/api/v1/expense-categories?organizationId=${orgId}`);
      const expCatData = await expCatRes.json();
      if (expCatData.status === 'success') {
        setExpenseCategories(expCatData.categories || []);
      }
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadCycles = async (projectId: string) => {
    setLoadingCycles(true);
    try {
      const response = await fetch(`/api/v1/cycles?project_id=${projectId}`);
      const data = await response.json();
      if (data.status === 'success') {
        setCycleList(data.cycles || []);
      }
    } catch (error) {
      toast.error('Failed to load cycles');
    } finally {
      setLoadingCycles(false);
    }
  };

  // Organization handlers
  const handleOrgSelect = (org: Organization) => {
    setSelectedOrganization(org.id.toString());
    setActiveTab('projects');
    toast.success(`Selected organization: ${org.name}`);
  };

  const handleOrgEdit = (org: Organization) => {
    setEditingOrg(org);
    setShowOrgForm(true);
  };

  const handleOrgDelete = async (org: Organization) => {
    if (!confirm(`Delete organization "${org.name}"?`)) return;
    try {
      const response = await fetch(`/api/v1/organizations?id=${org.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Organization deleted');
        loadOrganizations();
        if (selectedOrganization === org.id.toString()) {
          setSelectedOrganization('');
        }
      }
    } catch (error) {
      toast.error('Failed to delete organization');
    }
  };

  // Project handlers
  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project.id.toString());
    setActiveTab('cycles');
    toast.success(`Selected project: ${project.project_name}`);
  };

  const handleProjectEdit = (project: Project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleProjectDelete = async (project: Project) => {
    if (!confirm(`Delete project "${project.project_name}"?`)) return;
    try {
      const response = await fetch(`/api/v1/projects?id=${project.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Project deleted');
        if (selectedOrganization) {
          loadProjects(selectedOrganization);
        }
        if (selectedProject === project.id.toString()) {
          setSelectedProject('');
        }
      }
    } catch (error) {
      toast.error('Failed to delete project');
    }
  };

  // Cycle handlers
  const handleCycleSelect = (cycle: Cycle) => {
    setSelectedCycle(cycle.id.toString());
    toast.success(`Selected cycle: ${cycle.cycle_name}`);
  };

  const handleCycleView = (cycle: Cycle) => {
    router.push(`/cycles/${cycle.id}`);
  };

  const handleCycleEdit = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setShowCycleForm(true);
  };

  const handleCycleDelete = async (cycle: Cycle) => {
    if (!confirm(`Delete cycle "${cycle.cycle_name}"?`)) return;
    try {
      const response = await fetch(`/api/v1/cycles?id=${cycle.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.status === 'success') {
        toast.success('Cycle deleted');
        if (selectedProject) {
          loadCycles(selectedProject);
        }
      }
    } catch (error) {
      toast.error('Failed to delete cycle');
    }
  };

  const getProjectName = (id?: number) => {
    if (!id) return 'Unknown';
    return projList.find(p => p.id === id)?.project_name || 'Unknown';
  };

  // Custom Success Handlers to support flow
  const handleOrgSuccess = (newOrg: any) => {
    setShowOrgForm(false);
    setEditingOrg(null);
    loadOrganizations(); // Local refresh
    refreshOrganizations(); // Global context refresh
    if (newOrg?.id) {
      setSelectedOrganization(newOrg.id.toString());
      setActiveTab('projects');
      setTimeout(() => setShowProjectForm(true), 500); // Auto-open next form
      toast.success("Organization created! Now let's create a project.");
    }
  };

  const handleProjectSuccess = (newProject: any) => {
    setShowProjectForm(false);
    setEditingProject(null);
    if (selectedOrganization) loadProjects(selectedOrganization); // Local refresh
    refreshProjects(); // Global context refresh
    if (newProject?.id) {
      setSelectedProject(newProject.id.toString());
      setActiveTab('cycles');
      setTimeout(() => setShowCycleForm(true), 500); // Auto-open next form
      toast.success("Project created! Now let's create a cycle.");
    }
  };

  const handleCycleSuccess = (newCycle: any) => {
    setShowCycleForm(false);
    setEditingCycle(null);
    if (selectedProject) loadCycles(selectedProject); // Local refresh
    refreshCycles(); // Global context refresh
    if (newCycle?.id) {
      setSelectedCycle(newCycle.id.toString());
    }
    toast.success("Cycle created successfully!");
  }

  return (
    <AuthGuard>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Workspace Management</h1>
              <p className="text-sm text-muted-foreground">
                Manage your organizations, projects, and cycles hierarchy
              </p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="organizations" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Organizations</span>
              <span className="sm:hidden">Orgs</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="flex items-center gap-2" disabled={!selectedOrganization}>
              <FolderKanban className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
              <span className="sm:hidden">Proj</span>
            </TabsTrigger>
            <TabsTrigger value="cycles" className="flex items-center gap-2" disabled={!selectedProject}>
              <Repeat className="h-4 w-4" />
              <span className="hidden sm:inline">Cycles</span>
              <span className="sm:hidden">Cycle</span>
            </TabsTrigger>
          </TabsList>

          {/* Organizations Tab */}
          <TabsContent value="organizations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organizations
                </CardTitle>
                <CardDescription>
                  Select an organization to manage its projects and cycles
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OrganizationList
                  organizations={orgs}
                  selectedOrganizationId={selectedOrganization}
                  onSelect={handleOrgSelect}
                  onEdit={handleOrgEdit}
                  onDelete={handleOrgDelete}
                  onAddNew={() => {
                    setEditingOrg(null);
                    setShowOrgForm(true);
                  }}
                  isLoading={loadingOrgs}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-4">
            {selectedOrganization ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FolderKanban className="h-5 w-5" />
                    Projects
                  </CardTitle>
                  <CardDescription>
                    {orgs.find(o => o.id.toString() === selectedOrganization)?.name || 'Selected Organization'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ProjectList
                    projects={projList}
                    selectedProjectId={selectedProject}
                    onSelect={handleProjectSelect}
                    onEdit={handleProjectEdit}
                    onDelete={handleProjectDelete}
                    onAddNew={() => {
                      setEditingProject(null);
                      setShowProjectForm(true);
                    }}
                    isLoading={loadingProjects}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p>Please select an organization first</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab('organizations')}
                  >
                    Go to Organizations
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Cycles Tab */}
          <TabsContent value="cycles" className="space-y-4">
            {selectedProject ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Repeat className="h-5 w-5" />
                    Cycles
                  </CardTitle>
                  <CardDescription>
                    {projList.find(p => p.id.toString() === selectedProject)?.project_name || 'Selected Project'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CycleList
                    cycles={cycleList}
                    selectedCycleId={selectedCycle}
                    onSelect={handleCycleSelect}
                    onView={handleCycleView}
                    onEdit={handleCycleEdit}
                    onDelete={handleCycleDelete}
                    onAddNew={() => {
                      setEditingCycle(null);
                      setShowCycleForm(true);
                    }}
                    isLoading={loadingCycles}
                    getProjectName={getProjectName}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
                  <p>Please select a project first</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setActiveTab('projects')}
                  >
                    Go to Projects
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Selected Context Summary */}
        {(selectedOrganization || selectedProject || selectedCycle) && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {selectedOrganization && (
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Organization:</span>
                    <span className="font-medium">
                      {orgs.find(o => o.id.toString() === selectedOrganization)?.name}
                    </span>
                  </div>
                )}
                {selectedProject && (
                  <div className="flex items-center gap-2">
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Project:</span>
                    <span className="font-medium">
                      {projList.find(p => p.id.toString() === selectedProject)?.project_name}
                    </span>
                  </div>
                )}
                {selectedCycle && (
                  <div className="flex items-center gap-2">
                    <Repeat className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Cycle:</span>
                    <span className="font-medium">
                      {cycleList.find(c => c.id.toString() === selectedCycle)?.cycle_name || `Cycle #${cycleList.find(c => c.id.toString() === selectedCycle)?.cycle_number}`}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Organization Form Dialog */}
        <Dialog open={showOrgForm} onOpenChange={setShowOrgForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingOrg ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
            </DialogHeader>
            <OrganizationForm
              editingOrganization={editingOrg}
              onSuccess={handleOrgSuccess}
              onCancel={() => {
                setShowOrgForm(false);
                setEditingOrg(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Project Form Dialog */}
        <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Edit Project' : 'Add Project'}</DialogTitle>
            </DialogHeader>
            {selectedOrganization && (
              <ProjectForm
                editingProject={editingProject}
                selectedOrganizationId={selectedOrganization}
                organizations={orgs}
                projectCategories={projectCategories}
                setProjectCategories={setProjectCategories}
                expenseCategories={expenseCategories}
                setExpenseCategories={setExpenseCategories}
                onSuccess={handleProjectSuccess}
                onCancel={() => {
                  setShowProjectForm(false);
                  setEditingProject(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Cycle Form Dialog */}
        <Dialog open={showCycleForm} onOpenChange={setShowCycleForm}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingCycle ? 'Edit Cycle' : 'Add Cycle'}</DialogTitle>
            </DialogHeader>
            {selectedProject && (
              <CycleForm
                projectId={parseInt(selectedProject)}
                existingCycle={editingCycle}
                existingCycles={cycleList}
                onSuccess={handleCycleSuccess}
                onCancel={() => {
                  setShowCycleForm(false);
                  setEditingCycle(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
