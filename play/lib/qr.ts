import QRCode from 'qrcode'

// QR codes as inline SVG, ink on cream. Made on the server, so the big screen
// needs no extra script to draw them.
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#111311', light: '#F2EEE5' },
  })
}
