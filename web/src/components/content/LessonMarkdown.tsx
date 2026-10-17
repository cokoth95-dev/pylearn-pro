import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean)
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="lesson-inline-code">{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    return part
  })
}

export default function LessonMarkdown({ source, compact = false }: { source: string; compact?: boolean }) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }

    const fence = line.match(/^\s*```(?:[\w+-]+)?\s*$/)
    if (fence) {
      const code: string[] = []
      index++
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++])
      if (index < lines.length) index++
      blocks.push(<pre key={`code-${blocks.length}`} className="lesson-code-block"><code>{code.join('\n')}</code></pre>)
      continue
    }

    const heading = line.match(/^\s{0,3}(#{1,3})\s+(.+)$/)
    if (heading) {
      const Tag = (heading[1].length === 1 ? 'h2' : heading[1].length === 2 ? 'h3' : 'h4')
      blocks.push(<Tag key={`heading-${blocks.length}`} className="lesson-markdown-heading">{renderInline(heading[2])}</Tag>)
      index++
      continue
    }

    const unordered = line.match(/^\s*[-*+]\s+(.+)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      const isOrdered = Boolean(ordered)
      const items: string[] = []
      while (index < lines.length) {
        const match = lines[index].match(isOrdered ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/)
        if (!match) break
        items.push(match[1]); index++
      }
      const List = isOrdered ? 'ol' : 'ul'
      blocks.push(<List key={`list-${blocks.length}`} className={`lesson-markdown-list ${isOrdered ? 'ordered' : ''}`}>{items.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</List>)
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) quote.push(lines[index++].replace(/^\s*>\s?/, ''))
      blocks.push(<blockquote key={`quote-${blocks.length}`} className="lesson-markdown-quote">{quote.map((part, i) => <p key={i}>{renderInline(part)}</p>)}</blockquote>)
      continue
    }

    const paragraph = [line.trim()]
    index++
    while (index < lines.length && lines[index].trim() && !/^\s*```/.test(lines[index]) && !/^\s{0,3}#{1,3}\s/.test(lines[index]) && !/^\s*[-*+]\s+/.test(lines[index]) && !/^\s*\d+[.)]\s+/.test(lines[index]) && !/^\s*>\s?/.test(lines[index])) paragraph.push(lines[index++].trim())
    blocks.push(<p key={`paragraph-${blocks.length}`}>{renderInline(paragraph.join(' '))}</p>)
  }

  return <div className={`lesson-markdown ${compact ? 'compact' : ''}`}>{blocks}</div>
}
