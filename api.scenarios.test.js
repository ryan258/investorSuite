// Basic backend API test for /api/scenarios
// To run: npx vitest run api.scenarios.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fetch from 'node-fetch'
import child_process from 'child_process'

let serverProcess = null
const PORT = 3003
const BASE_URL = `http://localhost:${PORT}`

describe('API /api/scenarios', () => {
  beforeAll(async () => {
    // Start the backend server
    serverProcess = child_process.spawn('node', ['index.js'], {
      cwd: process.cwd(),
      stdio: 'ignore',
      detached: true
    })
    // Wait a bit for the server to start
    await new Promise(resolve => setTimeout(resolve, 2000))
  })

  afterAll(() => {
    if (serverProcess) {
      process.kill(-serverProcess.pid)
    }
  })

  it('should return an array of scenarios', async () => {
    const res = await fetch(`${BASE_URL}/api/scenarios`)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })
})
