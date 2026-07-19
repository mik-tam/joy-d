import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCapsuleOutput } from './capsuleParser.mjs'

const capsule = {
  worldName: 'Lantern Sea',
  visualDirection: 'teal waves',
  story: 'A tiny boat follows a star.',
  quote: 'The tide remembers every light.',
  soundMood: 'soft bells',
  surprise: 'A moonflower map',
}

test('parses a plain JSON object', () => {
  assert.deepEqual(parseCapsuleOutput(JSON.stringify(capsule)), capsule)
})

test('parses fenced JSON with an arbitrary fence language', () => {
  const output = `Here is your capsule:\n\n\`\`\`jsonc\n${JSON.stringify(capsule)}\n\`\`\``
  assert.deepEqual(parseCapsuleOutput(output), capsule)
})

test('parses an object with braces inside a JSON string', () => {
  const output = `A world arrives: ${JSON.stringify({ ...capsule, story: 'A note says { come closer }.' })} Good luck.`
  assert.equal(parseCapsuleOutput(output).story, 'A note says { come closer }.')
})

test('rejects output without a JSON object', () => {
  assert.throws(() => parseCapsuleOutput('A beautiful world, but no object.'))
})
