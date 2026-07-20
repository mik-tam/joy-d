import type { JoyCapsule } from './joyCapsule'
import type { JoySignature } from '../components/SmileCamera/createJoySignature'

const cardWidth = 1080
const cardHeight = 1350

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (context.measureText(candidate).width > maxWidth && line) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  if (line) lines.push(line)
  return lines
}

export function renderJoyStoryCard(
  signature: JoySignature,
  capsules: JoyCapsule[],
): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas')
  canvas.width = cardWidth
  canvas.height = cardHeight
  const context = canvas.getContext('2d')
  if (!context) return null

  const backdrop = context.createLinearGradient(0, 0, cardWidth * 0.4, cardHeight)
  backdrop.addColorStop(0, '#572a7d')
  backdrop.addColorStop(0.55, '#251244')
  backdrop.addColorStop(1, '#182a52')
  context.fillStyle = backdrop
  context.fillRect(0, 0, cardWidth, cardHeight)

  context.fillStyle = 'rgba(255,255,255,0.08)'
  for (let index = 0; index < 60; index += 1) {
    const x = (index * 173) % cardWidth
    const y = (index * 271) % cardHeight
    context.beginPath()
    context.arc(x, y, index % 3 === 0 ? 3 : 1.6, 0, Math.PI * 2)
    context.fill()
  }

  const serif = '"Fraunces Variable", "Iowan Old Style", Georgia, serif'
  const sans = 'Inter, system-ui, sans-serif'

  context.fillStyle = 'rgba(255,231,163,0.9)'
  context.font = `700 30px ${sans}`
  context.textAlign = 'center'
  context.fillText('M Y   J O Y : D   J O U R N E Y', cardWidth / 2, 120)

  context.fillStyle = '#ffffff'
  context.font = `900 96px ${serif}`
  context.fillText('Three impossible', cardWidth / 2, 250)
  context.fillText('places.', cardWidth / 2, 356)

  context.font = `600 34px ${sans}`
  context.fillStyle = 'rgba(255,255,255,0.78)'
  context.fillText(`${signature.wonderTitle} · ${signature.shape} · ${signature.signalPercent}% signal`, cardWidth / 2, 430)

  signature.colorTrail.forEach((color, index) => {
    context.beginPath()
    context.fillStyle = color
    context.arc(cardWidth / 2 - 60 + index * 60, 500, 26, 0, Math.PI * 2)
    context.fill()
    context.lineWidth = 6
    context.strokeStyle = 'rgba(20,8,42,0.55)'
    context.stroke()
  })

  let y = 610
  context.textAlign = 'left'
  capsules.forEach((capsule, index) => {
    context.fillStyle = 'rgba(255,231,163,0.85)'
    context.font = `800 30px ${sans}`
    context.fillText(`${index + 1}`, 110, y)
    context.fillStyle = '#ffffff'
    context.font = `700 44px ${serif}`
    context.fillText(capsule.worldName, 170, y)
    y += 56
    context.fillStyle = 'rgba(255,255,255,0.6)'
    context.font = `400 28px ${sans}`
    for (const line of wrapText(context, capsule.surprise, cardWidth - 280).slice(0, 2)) {
      context.fillText(line, 170, y)
      y += 38
    }
    y += 44
  })

  const quote = capsules.at(-1)?.quote ?? ''
  context.fillStyle = 'rgba(255,244,213,0.95)'
  context.font = `italic 600 38px ${serif}`
  context.textAlign = 'center'
  let quoteY = Math.max(y + 30, 1090)
  for (const line of wrapText(context, `“${quote}”`, cardWidth - 240).slice(0, 3)) {
    context.fillText(line, cardWidth / 2, quoteY)
    quoteY += 52
  }

  context.fillStyle = 'rgba(255,255,255,0.65)'
  context.font = `700 30px ${sans}`
  context.fillText('Every smile opens a new world — JOY:D', cardWidth / 2, cardHeight - 70)

  return canvas
}

export async function shareJoyStoryCard(
  signature: JoySignature,
  capsules: JoyCapsule[],
  storyText: string,
): Promise<'shared' | 'downloaded' | 'copied' | 'failed'> {
  const canvas = renderJoyStoryCard(signature, capsules)
  if (canvas) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (blob) {
      const file = new File([blob], 'joyd-story.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'My JOY:D Journey', text: storyText })
          return 'shared'
        } catch {
          // Fall through to download below.
        }
      }
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'joyd-story.png'
      link.click()
      URL.revokeObjectURL(url)
      return 'downloaded'
    }
  }

  try {
    await navigator.clipboard.writeText(storyText)
    return 'copied'
  } catch {
    return 'failed'
  }
}
