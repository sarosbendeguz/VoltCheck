# Blog

Drop a `.md` file here, push to `main`, and GitHub Actions publishes it.

```
---
title: Post title
date: 2026-11-23
description: One or two sentences, used for search results and link previews.
image: /blog/my-image.png   # optional, defaults to og-image.png
draft: true                 # optional, hides the post
---
```

- Wrap `title` and `description` in double quotes if they contain a colon.
- The filename is the URL: `ev-akku-teszt.md` becomes `/blog/ev-akku-teszt/` (lowercase letters, digits, hyphens).
- Put images next to the post (`blog/my-image.png`) and reference them as `/blog/my-image.png`.
- Preview locally: `npm install && npm run build && python3 -m http.server -d _site`.
