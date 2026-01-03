"use client"

import { useEffect, useRef, useState } from "react"

// Declare the global SwaggerUIBundle that will be provided by the CDN script.
declare global {
  interface Window {
    SwaggerUIBundle?: any
  }
}

export default function ApiDocsPage() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [loaded, setLoaded] = useState(false)

  const applyResponseStatusClasses = () => {
    const root = containerRef.current
    if (!root) return

    const rows = root.querySelectorAll<HTMLTableRowElement>(
      '.responses-inner table tbody tr',
    )

    rows.forEach((row) => {
      const statusCell = row.querySelector<HTMLElement>('.response-col_status')
      if (!statusCell) return

      const text = statusCell.textContent?.trim()
      if (!text) return

      const match = text.match(/^(\d{3})/)
      if (!match) return

      const code = parseInt(match[1], 10)
      if (Number.isNaN(code)) return

      statusCell.classList.remove(
        'swagger-status-success',
        'swagger-status-error',
        'swagger-status-warning',
      )

      if (code >= 200 && code < 300) {
        statusCell.classList.add('swagger-status-success')
      } else if (code >= 400 && code < 600) {
        statusCell.classList.add('swagger-status-error')
      } else if (code >= 300 && code < 400) {
        statusCell.classList.add('swagger-status-warning')
      }
    })
  }

  useEffect(() => {
    let cancelled = false
    let observer: MutationObserver | undefined

    async function loadSwaggerUI() {
      if (typeof window === "undefined") return
      if (!containerRef.current) return

      // Ensure Swagger UI CSS is loaded once
      if (!document.querySelector('link[data-swagger-ui-css="true"]')) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = "https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
        link.setAttribute("data-swagger-ui-css", "true")
        document.head.appendChild(link)
      }

      // Load the Swagger UI bundle script if it's not already present
      if (!window.SwaggerUIBundle) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script")
          script.src = "https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
          script.crossOrigin = "anonymous"
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Failed to load Swagger UI"))
          document.body.appendChild(script)
        })
      }

      if (cancelled || !window.SwaggerUIBundle || !containerRef.current) return

      // Clear any previous UI (in case of Fast Refresh / remount)
      containerRef.current.innerHTML = ""

      window.SwaggerUIBundle({
        url: "/api/openapi",
        dom_id: "#swagger-ui-root",
        presets: [window.SwaggerUIBundle.presets.apis],
        layout: "BaseLayout",
        docExpansion: "full",
        deepLinking: true,
      })

      if (cancelled || !containerRef.current) return

      applyResponseStatusClasses()

      if (typeof MutationObserver !== "undefined") {
        observer = new MutationObserver(() => {
          applyResponseStatusClasses()
        })

        observer.observe(containerRef.current, {
          childList: true,
          subtree: true,
        })
      }

      if (!cancelled) {
        setLoaded(true)
      }
    }

    loadSwaggerUI().catch((err) => {
      console.error("Failed to initialize Swagger UI", err)
    })

    return () => {
      cancelled = true
      if (observer) {
        observer.disconnect()
      }
    }
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            API Reference
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Explore the Flame Sales &amp; Expense Tracker REST API. Generated from the
            live OpenAPI specification.
          </p>
        </div>
      </header>

      <div className="min-h-[60vh] w-full overflow-auto rounded-lg border bg-card p-2 sm:p-4">
        <div
          id="swagger-ui-root"
          ref={containerRef}
          className="min-h-[60vh] bg-background"
        />
        {!loaded && (
          <p className="mt-4 text-xs text-muted-foreground">
            Loading API documentation...
          </p>
        )}
      </div>
    </div>
  )
}
