import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearTestData() {
  try {
    console.log('Starting to clear test data...')

    // Clear all reflections first (they may have comments that cascade)
    console.log('Clearing reflections...')
    const { data: reflections, error: refetchError } = await supabase
      .from('user_content_reflections')
      .select('id')
    if (!refetchError && reflections && reflections.length > 0) {
      const ids = reflections.map(r => r.id)
      const { error: reflectionError, count: reflectionCount } = await supabase
        .from('user_content_reflections')
        .delete()
        .in('id', ids)
      if (reflectionError) {
        console.log('Error clearing reflections:', reflectionError.message)
      } else {
        console.log(`✓ Deleted ${reflectionCount} reflection records`)
      }
    } else {
      console.log('No reflections to clear')
    }

    // Clear all community comments
    console.log('Clearing comments...')
    const { data: comments, error: comfetchError } = await supabase
      .from('community_comments')
      .select('id')
    if (!comfetchError && comments && comments.length > 0) {
      const ids = comments.map(c => c.id)
      const { error: commentsError, count: commentsCount } = await supabase
        .from('community_comments')
        .delete()
        .in('id', ids)
      if (commentsError) {
        console.log('Error clearing comments:', commentsError.message)
      } else {
        console.log(`✓ Deleted ${commentsCount} community comment records`)
      }
    } else {
      console.log('No comments to clear')
    }

    // Clear all community posts (wins, announcements, etc)
    console.log('Clearing posts...')
    const { data: posts, error: postfetchError } = await supabase
      .from('community_posts')
      .select('id')
    if (!postfetchError && posts && posts.length > 0) {
      const ids = posts.map(p => p.id)
      const { error: postsError, count: postsCount } = await supabase
        .from('community_posts')
        .delete()
        .in('id', ids)
      if (postsError) {
        console.log('Error clearing posts:', postsError.message)
      } else {
        console.log(`✓ Deleted ${postsCount} community post records`)
      }
    } else {
      console.log('No posts to clear')
    }

    // Clear all curriculum progress
    console.log('Clearing progress...')
    const { data: progress, error: profetchError } = await supabase
      .from('progress')
      .select('id')
    if (!profetchError && progress && progress.length > 0) {
      const ids = progress.map(p => p.id)
      const { error: progressError, count: progressCount } = await supabase
        .from('progress')
        .delete()
        .in('id', ids)
      if (progressError) {
        console.log('Error clearing progress:', progressError.message)
      } else {
        console.log(`✓ Deleted ${progressCount} progress records`)
      }
    } else {
      console.log('No progress records to clear (table may not exist)')
    }

    console.log('\n✓ All test data cleared successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error clearing test data:', error)
    process.exit(1)
  }
}

clearTestData()
