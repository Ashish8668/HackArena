import { describe, expect, it } from 'vitest'
import { askAboutTrial } from '../ask/askTrial'
import { SYNTHETIC_TRIALS } from '../data/trials'

describe('trial ask', () => {
  it('answers age from the selected trial record', () => {
    const trial = SYNTHETIC_TRIALS.find((item) => item.trial_id === 'T001')
    const result = askAboutTrial(trial, 'What is the age range?')
    expect(result.answer).toContain('30')
    expect(result.answer).toContain('65')
  })

  it('does not invent facts outside the record', () => {
    const trial = SYNTHETIC_TRIALS.find((item) => item.trial_id === 'T001')
    const result = askAboutTrial(trial, 'xyzzy unknown topic')
    expect(result.answer).toBe('Not in this trial record.')
  })
})
