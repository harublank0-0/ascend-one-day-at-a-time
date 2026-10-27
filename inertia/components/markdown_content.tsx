import type { ComponentProps } from 'react'
import { Markdown } from '@tanstack/markdown/react'
import { journalMarkdownOptions } from '../../shared/journal_markdown'
import { cn } from '~/lib/utils'

/**
 * Journal Markdown, set for reading. It renders React elements, never an HTML
 * string, and the safe defaults live in `journalMarkdownOptions`.
 *
 * Lines are kept as they were typed (`whitespace-pre-line`): people write a
 * journal with single line breaks, which plain Markdown would run together.
 * User headings sit two levels down (an entry's # is an h3) because the page
 * already has its own h1 and h2.
 */
const heading = (tag: 'h3' | 'h4' | 'h5' | 'h6', sizing: string) =>
  function Heading({ className, ...props }: ComponentProps<'h3'>) {
    const Tag = tag
    return <Tag className={cn('font-semibold tracking-tight', sizing, className)} {...props} />
  }

const components = {
  h1: heading('h3', 'text-2xl'),
  h2: heading('h4', 'text-xl'),
  h3: heading('h5', 'text-lg'),
  h4: heading('h6', 'text-base'),
  h5: heading('h6', 'text-base'),
  h6: heading('h6', 'text-base'),

  p: ({ className, ...props }: ComponentProps<'p'>) => (
    <p className={cn('whitespace-pre-line', className)} {...props} />
  ),
  ul: ({ className, ...props }: ComponentProps<'ul'>) => (
    <ul className={cn('list-disc space-y-1 pl-6', className)} {...props} />
  ),
  ol: ({ className, ...props }: ComponentProps<'ol'>) => (
    <ol className={cn('list-decimal space-y-1 pl-6', className)} {...props} />
  ),
  li: ({ className, ...props }: ComponentProps<'li'>) => (
    <li
      className={cn(
        'whitespace-pre-line has-[input[type=checkbox]]:-ml-6 has-[input[type=checkbox]]:list-none',
        className
      )}
      {...props}
    />
  ),
  input: ({ className, ...props }: ComponentProps<'input'>) => (
    <input className={cn('mr-2 size-4 align-[-0.15em] accent-foreground', className)} {...props} />
  ),
  blockquote: ({ className, ...props }: ComponentProps<'blockquote'>) => (
    <blockquote
      className={cn('space-y-3 border-l-2 pl-4 text-muted-foreground italic', className)}
      {...props}
    />
  ),
  a: ({ className, href, ...props }: ComponentProps<'a'>) => {
    // Web addresses leave the app in a new tab; links inside the app and mail links do not.
    const external = href !== undefined && /^https?:/i.test(href)
    return (
      <a
        href={href}
        className={cn('underline underline-offset-4', className)}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        {...props}
      />
    )
  },
  code: ({ className, ...props }: ComponentProps<'code'>) => (
    <code
      className={cn('rounded bg-muted px-1.5 py-0.5 font-mono text-[0.9em]', className)}
      {...props}
    />
  ),
  pre: ({ className, ...props }: ComponentProps<'pre'>) => (
    <pre
      className={cn(
        'overflow-x-auto rounded-lg bg-muted p-4 text-sm leading-6 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-[1em]',
        className
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }: ComponentProps<'hr'>) => (
    <hr className={cn('border-t', className)} {...props} />
  ),
  table: ({ className, ...props }: ComponentProps<'table'>) => (
    <table
      className={cn('block max-w-full overflow-x-auto text-left text-sm', className)}
      {...props}
    />
  ),
  th: ({ className, ...props }: ComponentProps<'th'>) => (
    <th className={cn('border px-3 py-2 font-medium', className)} {...props} />
  ),
  td: ({ className, ...props }: ComponentProps<'td'>) => (
    <td className={cn('border px-3 py-2 whitespace-pre-line', className)} {...props} />
  ),
}

export function MarkdownContent({ source, className }: { source: string; className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <Markdown {...journalMarkdownOptions} components={components}>
        {source}
      </Markdown>
    </div>
  )
}
