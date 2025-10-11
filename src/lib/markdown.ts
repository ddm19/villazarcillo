import type { MarkdownContent } from './types'

export function markdownContentToString(content: MarkdownContent): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((entry) => markdownContentToString(entry))
      .filter((value) => value.trim().length > 0)
      .join('\n\n')
  }

  switch (content.type) {
    case 'paragraph':
      return markdownContentToString(content.text)
    case 'heading': {
      const level = Math.min(Math.max(content.level ?? 3, 1), 6)
      const headingText = markdownContentToString(content.text)
      return `${'#'.repeat(level)} ${headingText}`
    }
    case 'list':
      return content.items
        .map((item, index) => formatListItem(item, content.ordered ? index + 1 : undefined))
        .join('\n')
    case 'quote':
      return content.items
        .map((item) => prefixLines(markdownContentToString(item), '> '))
        .join('\n')
    case 'code':
      return formatCodeBlock(content.value, content.language)
    default:
      return ''
  }
}

function formatListItem(item: MarkdownContent, order?: number) {
  const marker = order ? `${order}.` : '-'
  const value = markdownContentToString(item)
  const lines = value.split('\n')
  return lines
    .map((line, index) => (index === 0 ? `${marker} ${line}` : `  ${line}`))
    .join('\n')
}

function prefixLines(value: string, prefix: string) {
  return value
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n')
}

function formatCodeBlock(value: string, language?: string) {
  const fence = '```'
  const lang = language ? language.trim() : ''
  return `${fence}${lang}\n${value}\n${fence}`
}
