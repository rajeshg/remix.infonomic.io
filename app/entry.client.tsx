import { startTransition, StrictMode } from 'react'

import { RemixBrowser } from '@remix-run/react'

import { hydrateRoot } from 'react-dom/client'

import { registerFocusTrap } from '~/ui/elements/focus-trap.client'

registerFocusTrap()

function RemixApp() {
  return (
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  )
}

function hydrate() {
  startTransition(() => {
    // @ts-expect-error
    hydrateRoot(document.getElementById('root'), <RemixApp />)
    // since <Head> is wrapped in <ClientOnly> it will
    // not render until after hydration
    // so we need to remove the server rendered head
    // in preparation for the client side render.
    //
    // https://stackoverflow.com/questions/28262715/replace-multiline-text-between-two-strings
    // Makes this a little less brittle - should anyone change the format of the
    // head string in entry.server.tsx
    document.head.innerHTML = document.head.innerHTML.replace(
      /<!--start head-->[\s\S]*?<!--end head-->/g,
      ''
    )
  })
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate)
} else {
  // Safari doesn't support requestIdleCallback
  // https://caniuse.com/requestidlecallback
  window.setTimeout(hydrate, 1)
}
