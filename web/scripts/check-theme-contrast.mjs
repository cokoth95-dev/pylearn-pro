import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const css = await readFile(fileURLToPath(new URL('../src/app/globals.css', import.meta.url)), 'utf8')
const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, declarations]) => ({ selector, declarations }))

function colorFor(theme, className, property) {
  const token = `[class~="${className}"]`
  const rule = rules.findLast(({ selector, declarations }) =>
    selector.includes(`:root[data-theme="${theme}"]`) && selector.includes(token) && declarations.includes(`${property}:`),
  )
  const value = rule?.declarations.match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})`))?.[1]
  if (!value) throw new Error(`Missing ${theme}-mode ${property} color rule for ${className}`)
  return value
}

function colorInRule(selectorText, property, variableName) {
  const rule = rules.find(({ selector }) => selector.trim() === selectorText)
  const expression = variableName
    ? new RegExp(`${variableName}:\\s*(#[0-9a-fA-F]{6})`)
    : new RegExp(`(?:^|;)\\s*${property}:\\s*(#[0-9a-fA-F]{6})`)
  const value = rule?.declarations.match(expression)?.[1]
  if (!value) throw new Error(`Missing ${selectorText} ${variableName ?? property} color`)
  return value
}

function luminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => parseInt(channel, 16) / 255)
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (values[0] + 0.05) / (values[1] + 0.05)
}

const checks = [
  ['light-mode page copy', colorInRule(':root', 'color', '--foreground'), colorInRule(':root', 'background-color', '--background')],
  ['dark-mode page copy', colorInRule(':root[data-theme="dark"]', 'color', '--foreground'), colorInRule(':root[data-theme="dark"]', 'background-color', '--background')],
  ['dark instructor and admin body copy', colorFor('dark', 'text-stone-900', 'color'), colorFor('dark', 'bg-white/95', 'background-color')],
  ['dark muted copy', colorFor('dark', 'text-stone-500', 'color'), colorFor('dark', 'bg-stone-50', 'background-color')],
  ['dark success callout', colorFor('dark', 'text-emerald-900', 'color'), colorFor('dark', 'bg-emerald-50', 'background-color')],
  ['dark warning callout', colorFor('dark', 'text-amber-950', 'color'), colorFor('dark', 'bg-amber-50', 'background-color')],
  ['dark warning badge', colorFor('dark', 'text-amber-900', 'color'), colorFor('dark', 'bg-amber-100', 'background-color')],
  ['dark error callout', colorFor('dark', 'text-rose-900', 'color'), colorFor('dark', 'bg-rose-50', 'background-color')],
  ['light inline lesson code', colorInRule('.lesson-inline-code', 'color'), colorInRule('.lesson-inline-code', 'background')],
  ['dark inline lesson code', colorInRule(':root[data-theme="dark"] .lesson-inline-code', 'color'), colorInRule(':root[data-theme="dark"] .lesson-inline-code', 'background')],
]

for (const [label, foreground, background] of checks) {
  const ratio = contrast(foreground, background)
  if (ratio < 4.5) throw new Error(`${label}: ${ratio.toFixed(2)}:1 contrast is below 4.5:1 (${foreground} on ${background})`)
  console.log(`PASS ${label}: ${ratio.toFixed(2)}:1`)
}

const headerRule = rules.find(({ selector }) => selector.includes(':root[data-theme="dark"]') && selector.includes('[class~="bg-white/95"]'))
if (!headerRule) throw new Error('Dark-mode translucent white headers are missing a dark surface override')
if (!/background-color:\s*#161b22/.test(headerRule.declarations)) throw new Error('Dark-mode instructor header is not mapped to the dark surface color')
console.log('PASS dark-mode instructor header uses a dark surface')

const lightButtonRule = rules.find(({ selector }) => selector.includes(':root[data-theme="light"]') && selector.includes('[class~="text-white"]') && selector.includes('[class~="bg-emerald-700"]'))
if (!lightButtonRule || !/color:\s*#ffffff/.test(lightButtonRule.declarations)) throw new Error('Light-mode green action buttons need white labels')
const buttonRatio = contrast('#ffffff', '#047857')
if (buttonRatio < 4.5) throw new Error(`Light-mode green button labels have insufficient contrast: ${buttonRatio.toFixed(2)}:1`)
console.log(`PASS light-mode green action button labels: ${buttonRatio.toFixed(2)}:1`)
