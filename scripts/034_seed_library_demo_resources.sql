-- 034_seed_library_demo_resources.sql
--
-- Demo seed for the Library page. cohorts is NOT NULL on this
-- table, so we explicitly publish to both cohorts ('{A,B}') instead
-- of leaving it blank. Idempotent: re-running won't create dupes.
do $$
declare
  rows record;
begin
  for rows in
    select * from (values
      (
        'Lorem ipsum dolor sit amet',
        'Consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.',
        'document'::text,
        array['leadership', 'getting-started']::text[],
        'https://example.com/lorem-ipsum.pdf'
      ),
      (
        'Ut enim ad minim veniam',
        'Quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
        'video',
        array['coaching']::text[],
        'https://example.com/videos/minim-veniam'
      ),
      (
        'Duis aute irure dolor',
        'In reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
        'reading',
        array['equity', 'reflection']::text[],
        'https://example.com/articles/irure-dolor'
      ),
      (
        'Excepteur sint occaecat cupidatat',
        'Non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        'link',
        array['toolkit']::text[],
        'https://example.com/toolkits/excepteur'
      ),
      (
        'Sed ut perspiciatis unde omnis',
        'Iste natus error sit voluptatem accusantium doloremque laudantium totam rem aperiam.',
        'document',
        array['data', 'planning']::text[],
        'https://example.com/sed-ut-perspiciatis.docx'
      ),
      (
        'Nemo enim ipsam voluptatem',
        'Quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores.',
        'video',
        array['change-management']::text[],
        'https://example.com/videos/nemo-enim'
      )
    ) as v(title, description, resource_type, tags, url)
  loop
    insert into public.community_resources
      (title, description, resource_type, tags, url, cohorts)
    values
      (
        rows.title,
        rows.description,
        rows.resource_type,
        rows.tags,
        rows.url,
        array['A','B']::text[]
      )
    on conflict do nothing;

    -- Backfill resource_type/tags for rows seeded by an earlier
    -- migration that pre-dated those columns (defaults: 'reading',
    -- empty array). Don't touch user-edited rows.
    update public.community_resources
       set resource_type = rows.resource_type,
           tags          = rows.tags
     where title = rows.title
       and (resource_type = 'reading' and tags = '{}'::text[]);
  end loop;
end $$;
