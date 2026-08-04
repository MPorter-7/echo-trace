export type ApplicationDataResetStage = 'archive-list' | 'archive-storage' | 'database'

interface ResetResult {
  ok: boolean
  failedStage: ApplicationDataResetStage | null
}

interface ResetActions {
  listArchivePaths: () => Promise<{ paths: string[]; error: unknown | null }>
  removeArchiveFiles: (paths: string[]) => Promise<{ error: unknown | null }>
  deleteDatabaseRecords: () => Promise<{ error: unknown | null }>
}

export async function resetApplicationData(actions: ResetActions): Promise<ResetResult> {
  let stage: ApplicationDataResetStage = 'archive-list'
  try {
    const archiveList = await actions.listArchivePaths()
    if (archiveList.error) return { ok: false, failedStage: 'archive-list' }

    if (archiveList.paths.length) {
      stage = 'archive-storage'
      const storageRemoval = await actions.removeArchiveFiles(archiveList.paths)
      if (storageRemoval.error) return { ok: false, failedStage: 'archive-storage' }
    }

    stage = 'database'
    const databaseRemoval = await actions.deleteDatabaseRecords()
    if (databaseRemoval.error) return { ok: false, failedStage: 'database' }

    return { ok: true, failedStage: null }
  } catch {
    return { ok: false, failedStage: stage }
  }
}
