import { describe, expect, it, vi } from 'vitest'
import { saveTimelineEventWithAttachment, timelineDatesFromMatch } from './timeline'

describe('timeline persistence', () => {
  it('reports a failed archive attachment separately from a saved event', async () => {
    const result = await saveTimelineEventWithAttachment(
      async () => ({ eventId: 'event-1', error: null }),
      'archive-1',
      async () => ({ error: new Error('link failed') }),
    )

    expect(result).toEqual({ status: 'attachment-error', eventId: 'event-1' })
  })

  it('does not attempt an attachment when saving the event fails', async () => {
    const attachFile = vi.fn(async () => ({ error: null }))
    const result = await saveTimelineEventWithAttachment(
      async () => ({ eventId: null, error: new Error('save failed') }),
      'archive-1',
      attachFile,
    )

    expect(result.status).toBe('event-error')
    expect(attachFile).not.toHaveBeenCalled()
  })
})

describe('possible-match timeline dates', () => {
  it('preserves a known range without calling its lower bound exact', () => {
    expect(timelineDatesFromMatch({ earliest_date: '2008-01-01', latest_date: '2010-06-30' })).toEqual({
      event_date: '2008-01-01',
      end_date: '2010-06-30',
      date_precision: 'unknown',
    })
  })

  it('uses exact precision only when both bounds identify the same day', () => {
    expect(timelineDatesFromMatch({ earliest_date: '2008-01-01', latest_date: '2008-01-01' }).date_precision).toBe('exact')
  })
})
