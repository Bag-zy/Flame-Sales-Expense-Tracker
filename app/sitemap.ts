import type { MetadataRoute } from 'next'

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
const normalizedSiteUrl = rawSiteUrl
  ? rawSiteUrl.startsWith('http://') || rawSiteUrl.startsWith('https://')
    ? rawSiteUrl
    : `https://${rawSiteUrl}`
  : process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://flame-sales-and-expense-tracker.bagumajonah3.workers.dev'

const siteUrl = normalizedSiteUrl.replace(/\/+$/, '')

const docsFeatureSlugs = [
  'categories',
  'customers',
  'customers-and-vendors',
  'cycles',
  'developers-and-integrations',
  'expenses',
  'invoices',
  'mileage-logs',
  'multi-currency-support',
  'organizations-and-users',
  'products-and-pricing',
  'receipts-and-attachments',
  'reports',
  'sales',
]

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    {
      url: `${siteUrl}/`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/docs`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/docs/getting-started`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/docs/features`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    ...docsFeatureSlugs.map(
      (slug): MetadataRoute.Sitemap[number] => ({
        url: `${siteUrl}/docs/features/${slug}`,
        lastModified,
        changeFrequency: 'monthly',
        priority: 0.6,
      })
    ),
    {
      url: `${siteUrl}/docs/api`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${siteUrl}/api-docs`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
