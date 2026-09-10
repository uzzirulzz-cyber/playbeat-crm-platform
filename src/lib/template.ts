// Template renderer: replaces {{variable}} placeholders with lead data.
export function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  if (!template) return ''
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (match, name: string) => {
    return vars[name] !== undefined && vars[name] !== null ? String(vars[name]) : match
  })
}

export function extractVariables(template: string): string[] {
  if (!template) return []
  const set = new Set<string>()
  const re = /\{\{\s*([\w_]+)\s*\}\}/g
  let m
  while ((m = re.exec(template)) !== null) set.add(m[1])
  return Array.from(set)
}
