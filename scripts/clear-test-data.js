import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearTestData() {
  try {
    console.log('Starting to clear test data...')

    // Clear all curriculum progress
    const { error: progressError, count: progressCount } = await supabase
      .from('user_content_progress')
      .delete()
      .neq('id', '')
    if (progressError) throw progressError
    console.log(`✓ Deleted ${progressCount} progress records`)

    // Clear all reflections
    const { error: reflectionError, count: reflectionCount } = await supabase
      .from('user_content_reflections')
      .delete()
      .neq('id', '')
    if (reflectionError) throw reflectionError
    console.log(`✓ Deleted ${reflectionCount} reflection records`)

    // Clear all wins and announcements (community posts)
    const { error: postsError, count: postsCount } = await supabase
      .from('community_posts')
      .delete()
      .neq('id', '')
    if (postsError) throw postsError
    console.log(`✓ Deleted ${postsCount} community post records`)

    console.log('✓ All test data cleared successfully!')
  } catch (error) {
    console.error('Error clearing test data:', error)
    process.exit(1)
  }
}

clearTestData()
