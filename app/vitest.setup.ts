import '@testing-library/jest-dom'
import 'whatwg-fetch'
import 'fake-indexeddb/auto'
Object.defineProperty(globalThis.navigator, 'serviceWorker', { value: { register: () => Promise.resolve() } })
