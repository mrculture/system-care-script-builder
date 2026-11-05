# System Care Script Builder

One-page Utility Shelf concept for generating custom cleaning scripts from consented browser-visible device hints, manual system details, and selected cleanup scope.

## Important Browser Limitation

A normal webpage cannot fully extract hardware specifications, installed software, drive health, Windows build data, or privileged OS details. This prototype only collects browser-exposed hints after the user clicks the scan button:

- operating system and browser hints
- logical CPU thread count
- approximate device memory when exposed
- browser storage quota estimate
- WebGL renderer hint

For deeper profiling, the product would need a separate local helper script or desktop app that the user runs intentionally.

## Production URL

https://system-care-script-builder.utilityshelf.site/

## Open

Open `index.html` in a browser. No build step is required.

## Automated checks

GitHub Actions runs **Quality checks** on pushes to main, pull requests targeting main, and manual dispatch. It validates sitemap URLs, canonical tags, local links, JavaScript syntax and browser page loading. Functional regression tests live in `.github/qa/tests`.

Run locally with Node 24 or later:

```sh
cd .github/qa
npm ci --ignore-scripts
npx playwright install chromium
npm test
```

Failed runs retain browser traces and an HTML report for seven days. Tests use synthetic data and block external browser requests, including analytics. CI files and dependencies stay under `.github/qa`. Cloudflare Pages redirects `/.github/*` requests to the homepage, so test files are not served to visitors. The test source remains available in this public GitHub repository.

These checks report failures. Existing Cloudflare deployments still run independently. Making this a required merge/deployment gate is a separate configuration change.

System Care checks cover all four Safe/Recycle Bin download combinations, unsupported presets, changed task consent, and batch preview payloads. PowerShell downloads are parsed for syntax, never executed. Local tests need Windows PowerShell or `pwsh`. These checks do not replace Marketplace App VM cleanup tests.
