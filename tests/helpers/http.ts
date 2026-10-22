import server from '@adonisjs/core/services/server'
import type { AddressInfo } from 'node:net'

export type InertiaPage = {
  component: string
  url: string
  props: Record<string, any>
  flash: Record<string, any>
}

export type TestResponse = {
  status: number
  /** Where a redirect points, as a path (the origin is stripped). */
  location: string | null
  /** The Inertia page, when the response is one. */
  page: InertiaPage | null
  body: string
}

function origin() {
  const address = server.getNodeServer()!.address() as AddressInfo
  return `http://localhost:${address.port}`
}

/**
 * A browser-like session for functional tests: it keeps cookies between
 * requests, sends the CSRF token the way the real frontend does, and asks for
 * Inertia responses. Redirects are not followed automatically so tests can
 * assert on them; use `follow` to take the next step.
 */
export class Session {
  private cookies = new Map<string, string>()
  private currentPath = '/'

  get(path: string) {
    return this.send('GET', path)
  }

  post(path: string, form: Record<string, string> = {}, options: { from?: string } = {}) {
    return this.send('POST', path, form, options)
  }

  put(path: string, form: Record<string, string> = {}, options: { from?: string } = {}) {
    return this.send('PUT', path, form, options)
  }

  delete(path: string, form: Record<string, string> = {}, options: { from?: string } = {}) {
    return this.send('DELETE', path, form, options)
  }

  /**
   * Sets a cookie the way page script does (`document.cookie = name=encodeURIComponent(value)`).
   */
  setCookie(name: string, value: string) {
    this.cookies.set(name, encodeURIComponent(value))
  }

  /**
   * Opens a page and follows redirects until a page (not a redirect) comes back.
   */
  async visit(path: string, maxRedirects = 5): Promise<TestResponse> {
    let response = await this.get(path)
    for (let hops = 0; response.location && hops < maxRedirects; hops++) {
      response = await this.follow(response)
    }
    return response
  }

  /**
   * The signed-in user as the app shows them, or null when signed out.
   */
  async currentUser() {
    const landed = await this.visit('/')
    return (landed.page?.props.user as Record<string, any> | undefined) ?? null
  }

  /**
   * Takes the redirect in a response, as the browser would.
   */
  async follow(response: TestResponse): Promise<TestResponse> {
    if (!response.location) {
      throw new Error(`Expected a redirect but got status ${response.status}`)
    }
    return this.get(response.location)
  }

  /**
   * Sends a request without the CSRF token, to check it is refused.
   */
  postWithoutCsrf(path: string, form: Record<string, string> = {}) {
    return this.send('POST', path, form, { csrf: false })
  }

  /**
   * Visits the page a form lives on (to get cookies and a CSRF token), then
   * submits the form from there.
   */
  async submitFrom(formPage: string, method: 'POST' | 'PUT' | 'DELETE', path: string, form = {}) {
    await this.get(formPage)
    return this.send(method, path, form, { from: formPage })
  }

  private async send(
    method: string,
    path: string,
    form?: Record<string, string>,
    options: { from?: string; csrf?: boolean } = {}
  ): Promise<TestResponse> {
    const headers: Record<string, string> = {
      'Accept': 'text/html, application/xhtml+xml',
      'X-Inertia': 'true',
      'X-Inertia-Version': '1',
      'Referer': origin() + (options.from ?? this.currentPath),
    }

    const cookie = [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ')
    if (cookie) {
      headers.Cookie = cookie
    }

    let body: string | undefined
    if (method !== 'GET') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
      body = new URLSearchParams(form ?? {}).toString()
      const token = this.cookies.get('XSRF-TOKEN')
      if (token && options.csrf !== false) {
        headers['X-XSRF-TOKEN'] = decodeURIComponent(token)
      }
    }

    const response = await fetch(origin() + path, { method, headers, body, redirect: 'manual' })
    this.storeCookies(response)

    const text = await response.text()
    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400) {
      this.currentPath = path
    }

    return {
      status: response.status,
      location: location ? location.replace(origin(), '') : null,
      page: this.parsePage(text),
      body: text,
    }
  }

  private storeCookies(response: Response) {
    for (const header of response.headers.getSetCookie()) {
      const [pair, ...attributes] = header.split(';').map((part) => part.trim())
      const separator = pair.indexOf('=')
      const name = pair.slice(0, separator)
      const value = pair.slice(separator + 1)
      const expired = attributes.some((attribute) => /^max-age=0$/i.test(attribute))

      if (!value || expired) {
        this.cookies.delete(name)
      } else {
        this.cookies.set(name, value)
      }
    }
  }

  private parsePage(text: string): InertiaPage | null {
    try {
      return JSON.parse(text)
    } catch {
      const embedded = text.match(
        /<script data-page="app" type="application\/json">(.*?)<\/script>/s
      )
      return embedded ? JSON.parse(embedded[1]) : null
    }
  }
}
