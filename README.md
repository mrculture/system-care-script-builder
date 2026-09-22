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
