import type { SourceReading } from '~/lib/types'

/**
 * One source's reading for the selected day, set for reading: a comfortable
 * measure, generous leading, and no boxes around the text. When the source has
 * nothing for the day it says so; it never shows another day's reading.
 */
export function ReadingSection({ slug, name, reading }: SourceReading) {
  const headingId = `reading-${slug}`

  return (
    <section aria-labelledby={headingId} className="border-t py-8">
      <h2 id={headingId} className="text-sm font-medium text-muted-foreground">
        {name}
      </h2>

      {reading ? (
        <article className="mt-3 max-w-[62ch]">
          {reading.title && (
            <h3 className="text-2xl font-semibold tracking-tight text-balance">{reading.title}</h3>
          )}

          {reading.quote && (
            <blockquote className="mt-5 border-l-2 pl-4 text-muted-foreground">
              <p className="leading-7 italic">{reading.quote.text}</p>
              {reading.quote.reference && (
                <footer className="mt-1 text-sm">{reading.quote.reference}</footer>
              )}
            </blockquote>
          )}

          <p className="mt-6 text-[1.0625rem] leading-8">{reading.content}</p>

          {reading.closing && (
            <p className="mt-6 text-[1.0625rem] leading-8 font-medium">{reading.closing}</p>
          )}
        </article>
      ) : (
        <p className="mt-3 max-w-prose text-muted-foreground">There is no reading for this date.</p>
      )}
    </section>
  )
}
