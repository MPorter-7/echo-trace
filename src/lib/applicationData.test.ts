import { describe, expect, it, vi } from 'vitest'
import { resetApplicationData } from './applicationData'

describe('application data reset', () => {
  it('does not delete database metadata when archive removal fails', async () => {
    const deleteDatabaseRecords = vi.fn(async () => ({ error: null }))
    const result = await resetApplicationData({
      listArchivePaths: async () => ({ paths: ['user/file.pdf'], error: null }),
      removeArchiveFiles: async () => ({ error: new Error('storage unavailable') }),
      deleteDatabaseRecords,
    })

    expect(result).toEqual({ ok: false, failedStage: 'archive-storage' })
    expect(deleteDatabaseRecords).not.toHaveBeenCalled()
  })

  it('deletes database records only after storage cleanup succeeds', async () => {
    const removeArchiveFiles = vi.fn(async () => ({ error: null }))
    const deleteDatabaseRecords = vi.fn(async () => ({ error: null }))
    const result = await resetApplicationData({
      listArchivePaths: async () => ({ paths: ['user/file.pdf'], error: null }),
      removeArchiveFiles,
      deleteDatabaseRecords,
    })

    expect(result).toEqual({ ok: true, failedStage: null })
    expect(removeArchiveFiles).toHaveBeenCalledWith(['user/file.pdf'])
    expect(deleteDatabaseRecords).toHaveBeenCalledOnce()
  })
})
