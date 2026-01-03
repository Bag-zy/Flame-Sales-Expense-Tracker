import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Callout } from '@/components/docs-callout'

export function useMDXComponents(components: Record<string, any>) {
  return {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    Callout,
    ...components,
  }
}
