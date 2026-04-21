-- =============================================================================
-- WAW Program — Curriculum Seed
-- Populates the 3 program years, the 5 Year One labs, their lessons, and all
-- resources (pre-lab + post-lab) as shown in the Wisdom At Work syllabus.
-- Idempotent: uses INSERT ... ON CONFLICT DO UPDATE.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- YEARS
-- -----------------------------------------------------------------------------

insert into public.years (id, order_index, title, description) values
  ('year-1', 1, 'Year One: Deep Learning',
   'Five Wisdom Labs grounding leadership in the Practical Wisdom Framework.'),
  ('year-2', 2, 'Year Two: Execution & Brokering',
   'Coaching, change implementation, and cross-system brokering.'),
  ('year-3', 3, 'Year Three: Community of Practice',
   'Peer learning, mentoring, and scaling leadership.')
on conflict (id) do update
  set order_index = excluded.order_index,
      title       = excluded.title,
      description = excluded.description;

-- -----------------------------------------------------------------------------
-- YEAR ONE LABS
-- -----------------------------------------------------------------------------

insert into public.labs
  (id, year_id, order_index, title, subtitle, description, scheduled_date, is_lab) values

  ('lab-1', 'year-1', 1, 'Lab One',
   'Wise Leadership Begins with Taking People Seriously as Persons',
   'What is Practical Wisdom and why does it matter to school leadership? The challenges we navigate daily are multiple and changing all the time. This module reminds us that leadership is not a solo act and introduces the Practical Wisdom Framework™, a leadership compass, and two powerful practices for activating the wisdom needed to keep character education efforts responsive to the people before us — faculty, staff, students and parents: Reflective Listening and Recalibration.',
   date '2026-11-12', true),

  ('lab-2', 'year-1', 2, 'Lab Two',
   'Ground Your Compass: Finding your True North Amidst Competing Values and Views',
   'What excites you most about your work as a school leader? What drew you into education and keeps you there everyday? Tapping into this motivation and keeping it present before us provides powerful inspiration, even under the most challenging circumstances. The Practical Wisdom Framework™ will help you identify shared understandings about character education and flourishing — connecting the dots between character, wisdom, and flourishing.',
   date '2026-01-07', true),

  ('lab-3', 'year-1', 3, 'Lab Three',
   'Follow the Trailheads',
   'Every subject in school, every learning experience and every student interaction has the potential to expand students horizons — to school their desires not simply to earn good grades or stay out of trouble, but to become the kind of person who is eager to pursue rugged, noble paths of school and life. Using principles of moral motivation and the Practical Wisdom Framework™ we will identify and mine the formative opportunities present in academic and non-academic experiences that contribute to students agency, character and flourishing.',
   date '2026-02-04', true),

  ('lab-4', 'year-1', 4, 'Lab Four',
   'Navigate Challenges to Promote Character',
   'Life is messy and unpredictable. We are all works in progress, taking shape as we navigate life''s ups and downs. For students to take ownership of their own character development they need many opportunities for both guided and independent practice, as well as opportunities to learn from mistakes and make amends. Using the Practical Wisdom Framework Coaching Conversations & Formative Discipline Protocols™ you will learn to accompany, coach, and empower students (and adults) as they confront and navigate challenges.',
   date '2026-03-04', true),

  ('lab-5', 'year-1', 5, 'Lab Five',
   'Practical Wisdom for Courageous Dialogue',
   'You will learn to recognize first reactions in yourself and others, recalibrate intentionally, stay agile, and engage others in shared reflection and decision-making so you can adjudicate conflict with curiosity, fair-mindedness, and respect for the dignity of all. In turn, you can empower your colleagues to do the same within and beyond the classroom. In this Module, you will use the Practical Wisdom Framework™ to engage in courageous dialogue, navigate change, and respond to crises in ways that advance your commitment to character, flourishing and high performance.',
   date '2026-04-08', true)

on conflict (id) do update
  set year_id        = excluded.year_id,
      order_index    = excluded.order_index,
      title          = excluded.title,
      subtitle       = excluded.subtitle,
      description    = excluded.description,
      scheduled_date = excluded.scheduled_date,
      is_lab         = excluded.is_lab;

-- -----------------------------------------------------------------------------
-- YEAR TWO / THREE PLACEHOLDER MODULES (locked)
-- -----------------------------------------------------------------------------

insert into public.labs (id, year_id, order_index, title, subtitle, is_lab) values
  ('module-2-1','year-2',1,'Module 1: Team Coaching Fundamentals','Available after Year One', false),
  ('module-2-2','year-2',2,'Module 2: Implementation Strategies','Available after Year One',  false),
  ('module-2-3','year-2',3,'Module 3: Brokering Across Systems','Available after Year One',   false),
  ('module-2-4','year-2',4,'Module 4: Collaborative Problem-Solving','Available after Year One', false),
  ('module-3-1','year-3',1,'Module 1: Building Community','Available after Years One & Two',  false),
  ('module-3-2','year-3',2,'Module 2: Peer Learning & Mentoring','Available after Years One & Two', false),
  ('module-3-3','year-3',3,'Module 3: Scaling & Sustainability','Available after Years One & Two',  false)
on conflict (id) do update
  set title   = excluded.title,
      subtitle= excluded.subtitle;

-- -----------------------------------------------------------------------------
-- LESSONS (one lesson per lab in Year One; placeholder for locked modules)
-- -----------------------------------------------------------------------------

insert into public.lessons
  (id, lab_id, order_index, title, description,
   learning_journal_prompt, discussion_prompt, reflection_survey_url) values

  ('lesson-1-1','lab-1',1,
   'Wise Leadership Begins with Taking People Seriously as Persons',
   'Introduces the Practical Wisdom Framework™ and two core practices: Reflective Listening and Recalibration.',
   'After engaging with the Practical Wisdom Framework, what shifts are you noticing in how you see your faculty, staff, students, and parents? Where might you practice Reflective Listening or Recalibration this week?',
   'Identify a passage, quote, example or insight from the readings that resonates with you. Tell us why it speaks to you or relates to your leadership practice in your Learning Journal.',
   '#reflection-on-practice-lab-1'),

  ('lesson-2-1','lab-2',1,
   'Ground Your Compass: Finding your True North',
   'Develop clarity on your core values and learn to navigate situations where values are in tension.',
   'What is the true north you keep returning to as a leader? What pulls you off course, and what helps you recalibrate?',
   'Identify a passage, quote, example or insight from the readings that resonates with you. Tell us why it speaks to you or relates to your leadership practice in your Learning Journal.',
   '#reflection-on-practice-lab-2'),

  ('lesson-3-1','lab-3',1,
   'Follow the Trailheads',
   'Identify and follow the key markers of character formation in academic and non-academic experiences.',
   'Where have you noticed a trailhead — a small opening for character formation — in your school this week?',
   'Identify a passage, quote, example or insight from the readings that resonates with you. Tell us why it speaks to you or relates to your leadership practice in your Learning Journal.',
   '#reflection-on-practice-lab-3'),

  ('lesson-4-1','lab-4',1,
   'Navigate Challenges to Promote Character',
   'Use challenges as opportunities to develop character through coaching conversations and formative discipline.',
   'Think of a recent challenge with a student or colleague. How might the Coaching Conversation protocol reshape that interaction?',
   'Identify a passage, quote, example or insight from the readings that resonates with you. Tell us why it speaks to you or relates to your leadership practice in your Learning Journal.',
   '#reflection-on-practice-lab-4'),

  ('lesson-5-1','lab-5',1,
   'Practical Wisdom for Courageous Dialogue',
   'Engage in courageous dialogue, navigate change, and respond to crises with practical wisdom.',
   'Where is a courageous dialogue waiting to happen in your community? What would wise preparation look like?',
   'Identify a passage, quote, example or insight from the readings that resonates with you. Tell us why it speaks to you or relates to your leadership practice in your Learning Journal.',
   '#reflection-on-practice-lab-5'),

  -- Locked placeholders
  ('lesson-2-1-1','module-2-1',1,'Coaching Foundations','Available after completing Year One', null, null, null),
  ('lesson-2-2-1','module-2-2',1,'Strategic Implementation','Available after completing Year One', null, null, null),
  ('lesson-2-3-1','module-2-3',1,'Systemic Brokering','Available after completing Year One', null, null, null),
  ('lesson-2-4-1','module-2-4',1,'Problem-Solving Together','Available after completing Year One', null, null, null),
  ('lesson-3-1-1','module-3-1',1,'Community Foundations','Available after Years One and Two', null, null, null),
  ('lesson-3-2-1','module-3-2',1,'Peer Learning Circles','Available after Years One and Two', null, null, null),
  ('lesson-3-3-1','module-3-3',1,'Scaling Leadership','Available after Years One and Two', null, null, null)

on conflict (id) do update
  set lab_id                  = excluded.lab_id,
      order_index             = excluded.order_index,
      title                   = excluded.title,
      description             = excluded.description,
      learning_journal_prompt = excluded.learning_journal_prompt,
      discussion_prompt       = excluded.discussion_prompt,
      reflection_survey_url   = excluded.reflection_survey_url;

-- -----------------------------------------------------------------------------
-- RESOURCES (pre-lab readings + post-lab materials)
-- -----------------------------------------------------------------------------

-- LAB ONE - pre-lab
insert into public.resources
  (id, lesson_id, order_index, title, resource_type, url, authors,
   publication_year, duration_minutes, has_audio, is_optional, is_post_lab) values
  ('res-1-1-1','lesson-1-1',1,'The Practical Wisdom Framework: A Compass for School Leaders',
   'reading','#', '{Karen Bohlin}', 2026, 12, false, true, false)
on conflict (id) do update set title = excluded.title;

-- LAB ONE - post-lab
insert into public.resources
  (id, lesson_id, order_index, title, resource_type, url, authors,
   publication_year, duration_minutes, has_audio, is_optional, is_post_lab) values
  ('post-1-1-1','lesson-1-1',1,'Companion Guide: Wisdom Lab One',
   'pdf','#','{WaW Program Team}',2026,15,false,false,true),
  ('post-1-1-2','lesson-1-1',2,'Deep Dive: Reflective Listening in Practice',
   'video','https://mux.com/watch/post-lab-1','{"Dr. Karen Bohlin"}',2026,18,true,false,true),
  ('post-1-1-3','lesson-1-1',3,'Recalibration Worksheet',
   'pdf','#','{WaW Program Team}',2026,10,false,true,true),
  ('post-1-1-4','lesson-1-1',4,'Further Reading: The Compass for School Leaders',
   'reading','#','{Karen Bohlin}',2026,20,false,true,true)
on conflict (id) do update set title = excluded.title;

-- LAB TWO - pre-lab
insert into public.resources
  (id, lesson_id, order_index, title, resource_type, url, authors,
   publication_year, duration_minutes, has_audio, is_optional, is_post_lab) values
  ('res-2-1-1','lesson-2-1',1,'The Practical Wisdom Framework: A Compass for School Leaders',
   'reading','#','{Karen Bohlin}',2026,12,false,false,false),
  ('res-2-1-2','lesson-2-1',2,'Cardinal Virtues: The Neighborhood of Practical Wisdom',
   'reading','#','{"Bohlin, Ryan, & Framer"}',2026,18,false,false,false),
  ('res-2-1-3','lesson-2-1',3,'Barry Schwartz: Using Our Practical Wisdom',
   'video','https://mux.com/watch/example-2','{"TED Talk"}',2026,23,true,false,false)
on conflict (id) do update set title = excluded.title;

-- LAB THREE - pre-lab
insert into public.resources
  (id, lesson_id, order_index, title, resource_type, url, authors,
   publication_year, duration_minutes, has_audio, is_optional, is_post_lab) values
  ('res-3-1-1','lesson-3-1',1,'Virtue: An Argument Worth Rehearsing',
   'reading','#','{Karen Bohlin}',2026,7,false,false,false),
  ('res-3-1-2','lesson-3-1',2,'Stress Tests of Character',
   'reading','#','{"Deborah Framer Kris","Karen Bohlin"}',2026,10,false,false,false),
  ('res-3-1-3','lesson-3-1',3,'How to Help Students Be the Best Version of Themselves',
   'reading','#','{"Deborah Framer Kris","Karen Bohlin"}',2026,8,false,false,false),
  ('res-3-1-4','lesson-3-1',4,'Building Character in School Resource Guide',
   'pdf','#','{"Bohlin","Ryan","Framer"}',2026,15,false,true,false)
on conflict (id) do update set title = excluded.title;

-- LAB FOUR - pre-lab
insert into public.resources
  (id, lesson_id, order_index, title, resource_type, url, authors,
   publication_year, duration_minutes, has_audio, is_optional, is_post_lab) values
  ('res-4-1-1','lesson-4-1',1,'The Student From Hell',
   'reading','#','{"Parker Palmer"}',2026,12,false,false,false)
on conflict (id) do update set title = excluded.title;

-- LAB FIVE - pre-lab
insert into public.resources
  (id, lesson_id, order_index, title, resource_type, url, authors,
   publication_year, duration_minutes, has_audio, is_optional, is_post_lab) values
  ('res-5-1-1','lesson-5-1',1,'Courageous Dialogue Toolkit: Practical Wisdom for School Leaders',
   'pdf','#','{WaW Program Team}',2026,20,false,false,false)
on conflict (id) do update set title = excluded.title;
