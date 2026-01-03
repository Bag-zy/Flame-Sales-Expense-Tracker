import fs from 'fs'
import path from 'path'
import { getSwaggerSpec } from '../lib/swagger'

async function main() {
  const spec = getSwaggerSpec()

  const outputPath = path.join(process.cwd(), 'public', 'openapi.json')
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })

  fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf8')
}

main().catch((err) => {
  console.error('Failed to generate OpenAPI spec', err)
  process.exit(1)
})
