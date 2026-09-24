// primevue ships this module without type declarations.
declare module 'primevue/toasteventbus' {
  const ToastEventBus: {
    emit(event: 'add', message: { severity?: string; summary?: string; detail?: string; life?: number }): void
  }
  export default ToastEventBus
}
