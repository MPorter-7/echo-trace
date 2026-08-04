import type { DatePrecision, PossibleMatch } from '../types/echo'

interface SaveEventResult {
  eventId: string | null
  error: unknown | null
}

interface AttachmentResult {
  error: unknown | null
}

export type TimelineSaveStatus = 'saved' | 'event-error' | 'attachment-error'

export async function saveTimelineEventWithAttachment(
  saveEvent: () => Promise<SaveEventResult>,
  archiveFileId: string,
  attachFile: (eventId: string, archiveFileId: string) => Promise<AttachmentResult>,
): Promise<{ status: TimelineSaveStatus; eventId: string | null }> {
  const saved = await saveEvent()
  if (saved.error || !saved.eventId) return { status: 'event-error', eventId: null }

  if (archiveFileId) {
    const attachment = await attachFile(saved.eventId, archiveFileId)
    if (attachment.error) return { status: 'attachment-error', eventId: saved.eventId }
  }

  return { status: 'saved', eventId: saved.eventId }
}

export function timelineDatesFromMatch(match: Pick<PossibleMatch, 'earliest_date' | 'latest_date'>): {
  event_date: string | null
  end_date: string | null
  date_precision: DatePrecision
} {
  const earliest = match.earliest_date
  const latest = match.latest_date
  const isSingleExactDate = Boolean(earliest && latest && earliest === latest)

  return {
    event_date: earliest,
    end_date: latest && latest !== earliest ? latest : null,
    date_precision: isSingleExactDate ? 'exact' : 'unknown',
  }
}
