import '@testing-library/jest-dom/vitest'

// jsdom does not implement blob object URLs; cover upload previews need this.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-object-url'
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => undefined
}
