const theme = 'default' // Zustand で管理してもOK

export const playSuccess = (): void => {
  new Audio(`/sounds/${theme}/success.mp3`).play().catch(() => {})
}

export const playError = (): void => {
  new Audio(`/sounds/${theme}/error.mp3`).play().catch(() => {})
}
