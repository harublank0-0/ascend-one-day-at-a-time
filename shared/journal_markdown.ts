import type { RenderOptions } from '@tanstack/markdown'

/**
 * How a journal entry is read as Markdown. This one file is used by the browser
 * (rendering a saved entry) and the server (the plain-text excerpts), so they
 * cannot drift apart. Everything not named here keeps the
 * library's safe default: raw HTML is shown as text, and executable link
 * addresses (javascript: and the like) are dropped.
 *
 * - No front matter: a journal entry that starts with a --- line is writing,
 *   not metadata, and must not disappear.
 * - No heading ids: an id made from "Today" could clash with an id on the page.
 * - No images: a remote image would contact another server every time the
 *   journal is opened. The alt text is kept.
 * - No extensions and no highlighter: callouts, tabs and the rest are for
 *   documentation sites, and code is shown as plain monospace text.
 */
export const journalMarkdownOptions: RenderOptions = {
  frontmatter: false,
  headingIds: false,
  urlTransform: (_url, kind, defaultUrl) => (kind === 'image' ? null : defaultUrl),
}
