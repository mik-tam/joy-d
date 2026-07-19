function extractJsonObject(text) {
  const start = text.indexOf('{')
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index += 1) {
    const character = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (character === '\\') {
        escaped = true
      } else if (character === '"') {
        inString = false
      }
      continue
    }

    if (character === '"') {
      inString = true
    } else if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
      if (depth === 0) return text.slice(start, index + 1)
    }
  }

  return null
}

export function parseCapsuleOutput(outputText) {
  if (typeof outputText !== 'string') {
    throw new SyntaxError('AI returned no text')
  }

  // Free OpenRouter models occasionally ignore structured output and return a
  // fenced object with an arbitrary language label or a short lead-in.
  const fencedBlocks = [...outputText.matchAll(/```[^\r\n]*\r?\n([\s\S]*?)```/g)]
    .map((match) => match[1])
  const candidates = [...fencedBlocks, outputText]
  let lastError = new SyntaxError('AI returned no JSON object')

  for (const candidate of candidates) {
    const objectText = extractJsonObject(candidate.trim())
    if (!objectText) continue
    try {
      return JSON.parse(objectText)
    } catch (error) {
      lastError = error instanceof SyntaxError ? error : lastError
    }
  }

  throw lastError
}
