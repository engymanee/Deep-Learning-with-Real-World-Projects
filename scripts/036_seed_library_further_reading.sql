-- Idempotent demo seed for the Further Reading tab. Two universal
-- rows + one cohort-C-only row so the cumulative-access rule has
-- something to demonstrate beyond A/B.
do $$
declare
  rows record;
begin
  for rows in
    select * from (values
      (
        'Vivamus lacinia odio (Further reading)',
        'Pellentesque habitant morbi tristique senectute et netus et malesuada fames.',
        'reading'::text,
        array['foundations']::text[],
        'https://example.com/articles/lacinia-odio',
        true,
        array['A','B','C']::text[]
      ),
      (
        'Curabitur pretium tincidunt lacus',
        'Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra.',
        'video',
        array['orientation']::text[],
        'https://example.com/videos/pretium-tincidunt',
        true,
        array['A','B','C']
      ),
      (
        'Aliquam erat volutpat (Cohort C)',
        'Maecenas ut ante. Praesent dapibus, neque id cursus faucibus.',
        'document',
        array['advanced']::text[],
        'https://example.com/aliquam-erat.pdf',
        false,
        array['C']
      )
    ) as v(title, description, resource_type, tags, url, is_universal, cohorts)
  loop
    insert into public.community_resources
      (title, description, resource_type, tags, url, is_universal, cohorts)
    values
      (rows.title, rows.description, rows.resource_type, rows.tags, rows.url, rows.is_universal, rows.cohorts)
    on conflict do nothing;
  end loop;
end $$;
