# pwa-id

Generate the stable ID Chromium assigns to a Progressive Web App based on its manifest identity.

```ts
import getPwaId from 'get-pwa-id'

getPwaId('pro.x.com')
// => 'alfckbjcdinlldfagnmeabfnenmajchc'

getPwaId('https://slop.gallery/')
// => 'jinebmjifepcaalpaokcfopcpkdfolnk'

getPwaId('example.com', {
  id: '/app',
  start_url: '/app/index.html',
})
// => 'kjjibnhbmhbfpepapmpinclgfdpahbil'
```

The function accepts a hostname, absolute URL or relative URL. When an application manifest `id` or `start_url` is overridden, the resolution follows the same rules Chromium uses for web app IDs.
