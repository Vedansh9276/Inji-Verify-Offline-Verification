import { BrowserQRCodeReader } from '@zxing/browser'

let reader: BrowserQRCodeReader | null = null

export async function scanOnce(video: HTMLVideoElement): Promise<string | null> {
  if (!reader) reader = new BrowserQRCodeReader()
  try {
    const result = await reader.decodeOnceFromVideoDevice(undefined, video)
    return result.getText()
  } catch (e) {
    return null
  } finally {
    reader = null
  }
}

export function resetScanner() {
  reader = null
}
