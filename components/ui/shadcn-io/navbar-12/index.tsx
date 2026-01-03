'use client';

import * as React from 'react';
import {
  CompassIcon,
  FeatherIcon,
  HouseIcon,
  SearchIcon,
  type LucideIcon,
} from 'lucide-react';
import TeamSwitcher from './TeamSwitcher';
import UserMenu from './UserMenu';
import { Button } from '@/components/ui/button';
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Hamburger icon component
const HamburgerIcon = ({ className, ...props }: React.SVGAttributes<SVGElement>) => (
  <svg
    className={cn('pointer-events-none', className)}
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
    {...(props as any)}
  >
    <path
      d="M4 12L20 12"
      className="origin-center -translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-x-0 group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[315deg]"
    />
    <path
      d="M4 12H20"
      className="origin-center transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.8)] group-aria-expanded:rotate-45"
    />
    <path
      d="M4 12H20"
      className="origin-center translate-y-[7px] transition-all duration-300 ease-[cubic-bezier(.5,.85,.25,1.1)] group-aria-expanded:translate-y-0 group-aria-expanded:rotate-[135deg]"
    />
  </svg>
);

// Types
export interface Navbar12NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
}

export interface Navbar12Props extends React.HTMLAttributes<HTMLElement> {
  navigationLinks?: Navbar12NavItem[];
  teams?: string[];
  defaultTeam?: string;
  switchers?: React.ReactNode;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  userAvatar?: string;
  onNavItemClick?: (href: string) => void;
  onTeamChange?: (team: string) => void;
  onUserItemClick?: (item: string) => void;
}

// Default navigation links
const defaultNavigationLinks: Navbar12NavItem[] = [
  { href: '#', label: 'Dashboard', icon: HouseIcon },
  { href: '#', label: 'Explore', icon: CompassIcon },
  { href: '#', label: 'Write', icon: FeatherIcon },
  { href: '#', label: 'Search', icon: SearchIcon },
];

// Default teams
const defaultTeams = ['shadcn/ui', 'Acme Inc.', 'Origin UI'];

export const Navbar12 = React.forwardRef<HTMLElement, Navbar12Props>(
  (
    {
      className,
      navigationLinks = defaultNavigationLinks,
      teams = defaultTeams,
      defaultTeam = teams[0],
      switchers,
      userName = 'John Doe',
      userEmail = 'john@example.com',
      userRole,
      userAvatar,
      onNavItemClick,
      onTeamChange,
      onUserItemClick,
      ...props
    },
    ref
  ) => {
    return (
      <header
        ref={ref}
        className={cn(
          'border-b px-4 md:px-6 [&_*]:no-underline',
          className
        )}
        {...(props as any)}
      >
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2">
          {/* Left side */}
          <div className="flex grow-0 items-center gap-2 md:flex-1">
            {/* Mobile menu trigger */}
            {navigationLinks.length ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="group size-8 md:hidden hover:bg-accent hover:text-accent-foreground"
                    variant="ghost"
                    size="icon"
                  >
                    <HamburgerIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-1 md:hidden">
                  <NavigationMenu className="max-w-none *:w-full">
                    <NavigationMenuList className="flex-col items-start gap-0 md:gap-2">
                      {navigationLinks.map((link, index) => {
                        const Icon = link.icon;
                        return (
                          <NavigationMenuItem key={index} className="w-full">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (onNavItemClick && link.href) onNavItemClick(link.href);
                              }}
                              className="flex w-full items-center gap-2 py-1.5 px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer rounded-md no-underline"
                            >
                              <Icon
                                size={16}
                                className="text-muted-foreground"
                                aria-hidden={true}
                              />
                              <span>{link.label}</span>
                            </button>
                          </NavigationMenuItem>
                        );
                      })}
                    </NavigationMenuList>
                  </NavigationMenu>
                </PopoverContent>
              </Popover>
            ) : null}
            {switchers ? (
              <>{switchers}</>
            ) : (
              <TeamSwitcher 
                teams={teams} 
                defaultTeam={defaultTeam} 
                onTeamChange={onTeamChange}
              />
            )}
          </div>
          {/* Middle area */}
          {navigationLinks.length ? (
            <NavigationMenu className="max-md:hidden">
              <NavigationMenuList className="gap-2">
                {navigationLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <NavigationMenuItem key={index}>
                      <NavigationMenuLink
                        href={link.href}
                        onClick={(e) => {
                          e.preventDefault();
                          if (onNavItemClick && link.href) onNavItemClick(link.href);
                        }}
                        className="flex size-8 items-center justify-center p-1.5 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors cursor-pointer"
                        title={link.label}
                      >
                        <Icon aria-hidden={true} />
                        <span className="sr-only">{link.label}</span>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                })}
              </NavigationMenuList>
            </NavigationMenu>
          ) : (
            <div className="flex-1" />
          )}
          {/* Right side */}
          <div className="hidden grow-0 items-center justify-end gap-4 md:flex md:flex-1">
            <UserMenu 
              userName={userName}
              userEmail={userEmail}
              userRole={userRole}
              userAvatar={userAvatar}
              onItemClick={onUserItemClick}
            />
          </div>
        </div>
      </header>
    );
  }
);

Navbar12.displayName = 'Navbar12';

export { HamburgerIcon, TeamSwitcher, UserMenu };