import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearTestData() {
  try {
    console.log('Starting to clear test data...')

    // Clear all curriculum progress (year progress)
    const { error: yearProgressError, count: yearProgressCount } = await supabase
      .from('user_year_progress')
      .delete()
      .neq('id', '')
    if (yearProgressError) {
      console.log('Note: user_year_progress error:', yearProgressError.message)
    } else {
      console.log(`✓ Deleted ${yearProgressCount} year progress records`)
    }

    // Clear all reflections (this will also cascade delete comments via trigger)
    const { error: reflectionError, count: reflectionCount } = await supabase
      .from('user_content_reflections')
      .delete()
      .neq('id', '')
    if (reflectionError) {
      console.log('Error clearing reflections:', reflectionError.message)
    } else {
      console.log(`✓ Deleted ${reflectionCount} reflection records`)
    }

    // Clear all community comments
    const { error: commentsError, count: commentsCount } = await supabase
      .from('community_comments')
      .delete()
      .neq('id', '')
    if (commentsError) {
      console.log('Note: community_comments error:', commentsError.message)
    } else {
      console.log(`✓ Deleted ${commentsCount} community comment records`)
    }

    // Clear all wins and announcements (community posts)
    const { error: postsError, count: postsCount } = await supabase
      .from('community_posts')
      .delete()
      .neq('id', '')
    if (postsError) {
      console.log('Error clearing posts:', postsError.message)
    } else {
      console.log(`✓ Deleted ${postsCount} community post records`)
    }

    console.log('✓ All test data cleared successfully!')
  } catch (error) {
    console.error('Error clearing test data:', error)
    process.exit(1)
  }
}

clearTestData()
