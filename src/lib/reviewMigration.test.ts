import { describe, expect, it } from 'vitest'
import reviewMigration from '../../supabase/migrations/202608040001_review_fixes.sql?raw'

describe('deployed-project review migration', () => {
  it('removes the caller application profile during a data reset', () => {
    expect(reviewMigration).toContain('delete from public.profiles where id = current_user_id;')
    expect(reviewMigration).toContain('security invoker')
  })
})
