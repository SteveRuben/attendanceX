export function extractFieldErrors(err: any): Record<string, string> {
  const details = err?.fieldErrorDetails || err?.body?.fieldErrorDetails
  if (!Array.isArray(details)) return {}
  const map: Record<string, string> = {}
  for (const d of details) {
    if (d?.fieldName && d?.errorMessage) map[d.fieldName] = d.errorMessage
  }
  return map
}

export function extractMessage(err: any): string {
  return (
    err?.body?.message || err?.message || err?.body?.error || 'Something went wrong'
  )
}

