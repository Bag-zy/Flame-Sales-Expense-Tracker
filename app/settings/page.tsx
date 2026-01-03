"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AuthGuard } from '@/components/auth-guard';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import UsersPage from '@/app/users/page';
import TeamsPage from '@/app/teams/page';
import OrganizationsPage from '@/app/organizations/page';
import ProjectsPage from '@/app/projects/page';
import CategoriesPage from '@/app/categories/page';
import VendorsPage from '@/app/vendors/page';
import PaymentMethodsPage from '@/app/payment-methods/page';
import DevelopersPage from '@/app/developers/page';

type SettingsSection =
  | 'profile'
  | 'teams'
  | 'organizations'
  | 'projects'
  | 'categories'
  | 'vendors'
  | 'paymentMethods'
  | 'developers';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<SettingsSection>('profile');

  useEffect(() => {
    const sectionParam = searchParams.get('section') as SettingsSection | null;
    if (sectionParam) {
      setSection(sectionParam);
    }
  }, [searchParams]);

  return (
    <AuthGuard>
      <div className="flex flex-col md:flex-row gap-6 p-6 w-full">
        {/* Navigation column */}
        <aside className="w-full md:w-64 space-y-2 border border-border rounded-lg bg-card p-4 sticky top-0 self-start">
          <h2 className="text-sm font-semibold text-foreground mb-2">Navigation</h2>
          <RadioGroup
            value={section}
            onValueChange={(value) => setSection(value as SettingsSection)}
            className="flex flex-wrap gap-2 md:flex-col"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="organizations" id="settings-organizations" />
              <Label htmlFor="settings-organizations" className="text-sm">
                Organizations
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="projects" id="settings-projects" />
              <Label htmlFor="settings-projects" className="text-sm">
                Projects
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="categories" id="settings-categories" />
              <Label htmlFor="settings-categories" className="text-sm">
                Categories
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="vendors" id="settings-vendors" />
              <Label htmlFor="settings-vendors" className="text-sm">
                Vendors
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paymentMethods" id="settings-payment-methods" />
              <Label htmlFor="settings-payment-methods" className="text-sm">
                Payment Methods
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="developers" id="settings-developers" />
              <Label htmlFor="settings-developers" className="text-sm">
                Developers / API Keys
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="teams" id="settings-teams" />
              <Label htmlFor="settings-teams" className="text-sm">
                Teams
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="profile" id="settings-profile" />
              <Label htmlFor="settings-profile" className="text-sm">
                User Profile
              </Label>
            </div>
          </RadioGroup>
        </aside>

        {/* Content area */}
        <section className="flex-1 min-h-[60vh] space-y-4">
          {section === 'profile' && (
            <div className="space-y-4">
              <UsersPage />
            </div>
          )}

          {section === 'teams' && (
            <div className="space-y-4">
              <TeamsPage />
            </div>
          )}

          {section === 'organizations' && (
            <div className="space-y-4">
              <OrganizationsPage />
            </div>
          )}

          {section === 'projects' && (
            <div className="space-y-4">
              <ProjectsPage />
            </div>
          )}

          {section === 'categories' && (
            <div className="space-y-4">
              <CategoriesPage />
            </div>
          )}

          {section === 'vendors' && (
            <div className="space-y-4">
              <VendorsPage />
            </div>
          )}

          {section === 'paymentMethods' && (
            <div className="space-y-4">
              <PaymentMethodsPage />
            </div>
          )}

          {section === 'developers' && (
            <div className="space-y-4">
              <DevelopersPage />
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
