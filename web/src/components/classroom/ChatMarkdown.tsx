import React from 'react'

function inline(text: string): React.ReactNode[] {
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  return text.split(pattern).filter(Boolean).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="rounded bg-slate-800 px-1 py-0.5 font-mono text-[0.92em] text-emerald-200">{part.slice(1, -1)}</code>
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index} className="font-bold text-white">{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>
    return part
  })
}

function isTableRow(line: string) { return line.trim().startsWith('|') && line.trim().endsWith('|') }
function cells(line: string) { return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim()) }

export default function ChatMarkdown({ content }: { content: string }) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index++; continue }
    const fence = line.match(/^\s*```(\w*)\s*$/)
    if (fence) {
      const code: string[] = []; index++
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++])
      if (index < lines.length) index++
      blocks.push(<pre key={`b${blocks.length}`} className="my-2 overflow-x-auto rounded-lg border border-white/10 bg-slate-950 p-3 text-[11px] leading-5"><code className="font-mono text-emerald-100">{code.join('\n')}</code></pre>)
      continue
    }
    const heading = line.match(/^\s{0,3}(#{1,4})\s+(.+)$/)
    if (heading) {
      const depth = heading[1].length
      const Tag = (depth <= 2 ? 'h3' : 'h4') as 'h3' | 'h4'
      blocks.push(<Tag key={`b${blocks.length}`} className={`${depth <= 2 ? 'mt-3 text-sm' : 'mt-2 text-xs'} font-bold text-white first:mt-0`}>{inline(heading[2])}</Tag>); index++; continue
    }
    if (isTableRow(line) && index + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[index + 1])) {
      const header = cells(line); index += 2
      const rows: string[][] = []
      while (index < lines.length && isTableRow(lines[index])) rows.push(cells(lines[index++]))
      blocks.push(<div key={`b${blocks.length}`} className="my-2 overflow-x-auto rounded-lg border border-white/10"><table className="min-w-full text-left text-[11px]"><thead className="bg-slate-800 text-slate-100"><tr>{header.map((cell, i) => <th key={i} className="px-2 py-1.5 font-semibold">{inline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, ri) => <tr key={ri} className="border-t border-white/10">{header.map((_, ci) => <td key={ci} className="px-2 py-1.5 align-top">{inline(row[ci] ?? '')}</td>)}</tr>)}</tbody></table></div>); continue
    }
    const list = line.match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/)
    if (list) {
      const ordered = /^\s*\d+[.)]\s+/.test(line); const items: string[] = []
      while (index < lines.length) { const match = lines[index].match(/^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/); if (!match || /^\s*\d+[.)]\s+/.test(lines[index]) !== ordered) break; items.push(match[1]); index++ }
      const ListTag = ordered ? 'ol' : 'ul'
      blocks.push(<ListTag key={`b${blocks.length}`} className={`my-2 space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items.map((item, i) => <li key={i}>{inline(item)}</li>)}</ListTag>); continue
    }
    if (/^\s*([-*_]\s*){3,}$/.test(line)) { blocks.push(<hr key={`b${blocks.length}`} className="my-3 border-white/15"/>); index++; continue }
    const paragraph = [line.trim()]; index++
    while (index < lines.length && lines[index].trim() && !/^\s*```/.test(lines[index]) && !/^\s{0,3}#{1,4}\s/.test(lines[index]) && !isTableRow(lines[index]) && !/^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(lines[index])) paragraph.push(lines[index++].trim())
    blocks.push(<p key={`b${blocks.length}`} className="my-1.5 leading-5">{inline(paragraph.join(' '))}</p>)
  }
  return <div className="break-words">{blocks}</div>
}
