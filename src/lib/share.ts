/** navigator.clipboard needs a secure page; the old execCommand path covers local http testing. */
export async function copyText(text: string) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text)
  const field = document.createElement('textarea')
  field.value = text
  field.setAttribute('readonly', '')
  field.style.position = 'fixed'
  field.style.opacity = '0'
  document.body.appendChild(field)
  field.select()
  const ok = document.execCommand('copy')
  field.remove()
  if (!ok) throw new Error('Copy failed')
}

export const canNativeShare = () => typeof navigator.share === 'function'

/**
 * Opens the phone's share sheet, or copies the link where that isn't available.
 * Returns 'copied' so the caller can confirm it, 'shared', or 'cancelled'.
 */
export async function shareLink(data: { title: string; text?: string; url: string }) {
  if (canNativeShare()) {
    try {
      await navigator.share(data)
      return 'shared' as const
    } catch {
      return 'cancelled' as const
    }
  }
  await copyText(data.url)
  return 'copied' as const
}
