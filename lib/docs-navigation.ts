import {
  FileText,
  BookOpen,
  Layers3,
  Code2,
  Users,
  Package,
  UserCircle2,
  ShoppingCart,
  Receipt,
  BarChart3,
  Link2,
  Calendar,
  Car,
} from 'lucide-react'

export type DocNavItem = {
  name: string
  href: string
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

export type DocNavGroup = {
  title: string
  items: DocNavItem[]
}

export const docNavigation: DocNavGroup[] = [
  {
    title: 'Guides',
    items: [
      {
        name: 'Overview',
        href: '/docs',
        icon: FileText,
      },
      {
        name: 'Getting Started',
        href: '/docs/getting-started',
        icon: BookOpen,
      },
    ],
  },
  {
    title: 'Core Features',
    items: [
      {
        name: 'Features overview',
        href: '/docs/features',
        icon: Layers3,
      },
      {
        name: 'Organizations & users',
        href: '/docs/features/organizations-and-users',
        icon: Users,
      },
      {
        name: 'Products & pricing',
        href: '/docs/features/products-and-pricing',
        icon: Package,
      },
      {
        name: 'Customers & vendors',
        href: '/docs/features/customers-and-vendors',
        icon: UserCircle2,
      },
      {
        name: 'Categories',
        href: '/docs/features/categories',
        icon: Layers3,
      },
      {
        name: 'Sales',
        href: '/docs/features/sales',
        icon: ShoppingCart,
      },
      {
        name: 'Expenses',
        href: '/docs/features/expenses',
        icon: Receipt,
      },
      {
        name: 'Cycles',
        href: '/docs/features/cycles',
        icon: Calendar,
      },
      {
        name: 'Invoices',
        href: '/docs/features/invoices',
        icon: FileText,
      },
      {
        name: 'Receipts & attachments',
        href: '/docs/features/receipts-and-attachments',
        icon: Receipt,
      },
      {
        name: 'Reports and Analytics',
        href: '/docs/features/reports',
        icon: BarChart3,
      },
      {
        name: 'Multi-Currency Support',
        href: '/docs/features/multi-currency-support',
        icon: BarChart3,
      },
      {
        name: 'Mileage logs',
        href: '/docs/features/mileage-logs',
        icon: Car,
      },
    ],
  },
  {
    title: 'Developers',
    items: [
      {
        name: 'Developers & integrations',
        href: '/docs/features/developers-and-integrations',
        icon: Link2,
      },
      {
        name: 'API Reference',
        href: '/api-docs',
        icon: Code2,
      },
    ],
  },
]
