# Security policy

## Reporting a vulnerability
E-mail the address in [`/.well-known/security.txt`](https://www.biggandaily.pro.bd/.well-known/security.txt). Please do not open a public issue for security problems.

## What this project does to stay safe
- **Static site, no server code, no database.** There is nothing to inject into or to breach at runtime.
- **Strict Content-Security-Policy** (`default-src 'none'`, no `unsafe-inline`/`unsafe-eval`), generated from `site.config.json` so third-party hosts are allowed *only* when a feature that needs them is switched on.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, COOP/CORP, `frame-ancestors 'none'`.
- No third-party JavaScript by default; fonts are self-hosted; analytics are off by default.
- Client code builds DOM with `textContent` (never `innerHTML` from data) and only accepts same-origin relative URLs from the search index / localStorage.
- E-mail address is obfuscated from scrapers; `rel="noopener noreferrer"` on external links.
- CI runs a secret scanner, unit tests, the site quality gate (`npm run check`) and `npm audit`; Dependabot keeps dependencies current.

## Secrets
Never commit credentials. `.env*` is git-ignored and `npm run secrets` (also run in CI) fails if a credential-looking string is found.
