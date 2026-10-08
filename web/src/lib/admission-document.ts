export type FeeSnapshot = {
  monthly_amount_kes?: number
  full_course_amount_kes?: number
  full_course_regular_amount_kes?: number
  monthly_amount_usd?: number
  full_course_amount_usd?: number
  full_course_regular_amount_usd?: number
  payments_enabled?: boolean
  monthly_payments_enabled?: boolean
  full_course_payments_enabled?: boolean
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character)
}

export function admissionEmailHtml(title: string, content: string, profileUrl: string, linkText = 'Open your saved copy in PyLearn Pro') {
  const paragraphs = content.split(/\n{2,}/).map((paragraph) => {
    const trimmed = paragraph.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('## ')) return `<h2 style="font-size:18px;margin:22px 0 8px">${escapeHtml(trimmed.slice(3))}</h2>`
    if (trimmed.split('\n').every((line) => line.trim().startsWith('- '))) {
      return `<ul>${trimmed.split('\n').map((line) => `<li style="margin:5px 0">${escapeHtml(line.trim().slice(2))}</li>`).join('')}</ul>`
    }
    return `<p style="line-height:1.65;margin:10px 0">${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>`
  }).join('')
  return `<div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;color:#292524"><h1 style="font-size:24px">${escapeHtml(title)}</h1>${paragraphs}<p style="margin-top:24px"><a href="${escapeHtml(profileUrl)}">${escapeHtml(linkText)}</a></p></div>`
}

function pdfEscape(value: string) {
  return value.replace(/[^\x20-\x7e]/g, '?').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function wrapText(value: string, width = 96) {
  const words = value.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (!current) current = word
    else if (`${current} ${word}`.length <= width) current += ` ${word}`
    else { lines.push(current); current = word }
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['']
}

export function buildAdmissionPdf(title: string, content: string, version: number, acceptedAt: string, fees: FeeSnapshot) {
  const feeText = [
    'FEE SNAPSHOT AT ACCEPTANCE',
    `Monthly: KSh ${fees.monthly_amount_kes?.toLocaleString('en-KE') ?? 'Not set'} / $${fees.monthly_amount_usd?.toFixed(2) ?? 'Not set'}`,
    `Full course sale: KSh ${fees.full_course_amount_kes?.toLocaleString('en-KE') ?? 'Not set'} / $${fees.full_course_amount_usd?.toFixed(2) ?? 'Not set'}`,
    `Full course regular: KSh ${fees.full_course_regular_amount_kes?.toLocaleString('en-KE') ?? 'Not set'} / $${fees.full_course_regular_amount_usd?.toFixed(2) ?? 'Not set'}`,
    `Full course KSh saving: KSh ${Math.max(0, (fees.full_course_regular_amount_kes ?? 0) - (fees.full_course_amount_kes ?? 0)).toLocaleString('en-KE')}`,
    `Monthly payments available: ${fees.payments_enabled && fees.monthly_payments_enabled ? 'Yes' : 'No'}`,
    `Full-course payments available: ${fees.payments_enabled && fees.full_course_payments_enabled ? 'Yes' : 'No'}`,
    `Admission guide version: ${version}    Record date: ${acceptedAt}`,
  ]
  const bodyLines = content.split('\n').flatMap((line) => {
    const trimmed = line.trim()
    if (!trimmed) return ['']
    const plain = trimmed.replace(/^#{1,6}\s+/, '').replace(/^[-*]\s+/, '• ')
    return wrapText(plain)
  })
  const lines = [...wrapText(title, 72), '', ...bodyLines, '', ...feeText.flatMap((line) => wrapText(line))]
  const perPage = 52
  const pages: string[][] = []
  for (let index = 0; index < lines.length; index += perPage) pages.push(lines.slice(index, index + perPage))
  const objects: string[] = ['', '', '/Type /Font /Subtype /Type1 /BaseFont /Helvetica', '/Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold']
  const pageIds: number[] = []
  pages.forEach((pageLines, pageIndex) => {
    const pageId = 5 + pageIndex * 2
    const streamId = pageId + 1
    pageIds.push(pageId)
    const textOps = pageLines.map((line, index) => {
      const isTitle = pageIndex === 0 && index === 0
      const font = isTitle ? 'F2' : 'F1'
      const size = isTitle ? 16 : 9
      const offset = isTitle ? 23 : 13
      return `/${font} ${size} Tf (${pdfEscape(line)}) Tj 0 -${offset} Td`
    }).join('\n')
    const stream = `BT\n48 792 Td\n${textOps}\nET`
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamId} 0 R >>`
    objects[streamId - 1] = `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`
  })
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`
  let output = '%PDF-1.4\n'
  const offsets = [0]
  for (let index = 0; index < objects.length; index++) {
    offsets.push(Buffer.byteLength(output, 'ascii'))
    output += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`
  }
  const xrefOffset = Buffer.byteLength(output, 'ascii')
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let index = 1; index < offsets.length; index++) output += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  return Buffer.from(output, 'ascii')
}

export async function sendAdmissionEmail(to: string, subject: string, html: string, pdf: Buffer, filename: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL || process.env.OTP_FROM_EMAIL
  if (!apiKey || !from) return { sent: false, reason: 'Email delivery is not configured yet.' }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html, attachments: [{ filename, content: pdf.toString('base64') }] }),
  })
  if (!response.ok) return { sent: false, reason: 'Email delivery failed. Your saved copy is still available in your profile.' }
  return { sent: true as const }
}
