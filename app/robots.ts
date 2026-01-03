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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/_next/',
        '/_offline/',
        '/handler/',
        '/accept-invitation/',
        '/categories',
        '/customers',
        '/cycles',
        '/developers',
        '/expenses',
        '/invoices',
        '/organizations',
        '/payment-methods',
        '/products',
        '/projects',
        '/receipts',
        '/reports',
        '/sales',
        '/settings',
        '/setup',
        '/teams',
        '/users',
        '/vendors',
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
