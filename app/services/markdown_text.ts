import { parseMarkdown } from '@tanstack/markdown/parser'
import type { BlockNode, InlineNode } from '@tanstack/markdown'
import { journalMarkdownOptions } from '#shared/journal_markdown'

/**
 * The words of some Markdown, with the marks taken off: no emphasis stars, list
 * bullets, link addresses or heading hashes. Used where a short plain preview of
 * an entry is shown (the journal list).
 *
 * It reads the text with the same options the page does (shared/journal_markdown),
 * so front matter is not a thing in a journal entry and raw HTML is plain text.
 */
export function plainTextOf(markdown: string): string {
  const document = parseMarkdown(markdown, journalMarkdownOptions)
  const pieces: string[] = []
  for (const block of document.children) {
    collectBlock(block, pieces)
  }
  return pieces.join(' ').replace(/\s+/g, ' ').trim()
}

function collectBlock(node: BlockNode, pieces: string[]) {
  switch (node.type) {
    case 'heading':
    case 'paragraph':
      pieces.push(inlineText(node.children))
      break
    case 'code':
    case 'html':
      pieces.push(node.value)
      break
    case 'list':
      for (const item of node.items) {
        item.children.forEach((child) => collectBlock(child, pieces))
      }
      break
    case 'blockquote':
    case 'callout':
    case 'component':
      node.children.forEach((child) => collectBlock(child, pieces))
      break
    case 'table':
      for (const cell of [...node.header, ...node.rows.flat()]) {
        pieces.push(inlineText(cell.children))
      }
      break
    case 'footnotes':
      for (const item of node.items) {
        item.children.forEach((child) => collectBlock(child, pieces))
      }
      break
    case 'thematicBreak':
      break
  }
}

function inlineText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
        case 'inlineCode':
        case 'inlineHtml':
          return node.value
        case 'strong':
        case 'emphasis':
        case 'strike':
        case 'link':
        case 'inlineComponent':
          return inlineText(node.children)
        case 'image':
          return node.alt
        case 'break':
          return ' '
        case 'footnoteReference':
          return ''
      }
    })
    .join('')
}
