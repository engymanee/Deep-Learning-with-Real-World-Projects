# Wisdom At Work - Learning Portal

A comprehensive professional development learning platform for the Wisdom At Work program featuring role-based access control, program management, progress tracking, and community collaboration.

## Features

### Core Features
- **Role-Based Access Control**: Four distinct user roles with specific permissions
- **Program Management**: Browse and enroll in 3-year professional development programs
- **Progress Tracking**: Monitor completion across programs and modules
- **Resource Library**: Access curated documents, videos, templates, and links
- **Program Modules**: Detailed view of all learning modules organized by year
- **Dashboard**: Personalized learning dashboard based on user role

### User Roles & Permissions

#### Participant
School leader enrolled in a cohort, belonging to one school team.
- View assigned content
- Mark resources complete
- Submit reflections
- Post in discussions
- Join live sessions

#### Team Lead
Optional role for a learner designated as lead for their school team.
- All Participant permissions PLUS:
- View team roster
- Nudge teammates via notifications

#### Facilitator
WaW program staff who delivers modules and coaches teams.
- Read progress for assigned cohorts/teams
- Grade or provide feedback on reflections
- Post announcements
- Schedule live sessions
- View team analytics

#### Admin
WaW program manager with full system access.
- Manage cohorts and user enrollments
- Author and edit curriculum
- Configure program calendar
- View all analytics
- Manage integrations

### Program Structure
- **Year One**: Deep Learning (listening session + 5 interactive modules + ongoing field work)
- **Year Two**: Wisdom Coaching (team coaching sessions + collaborative problem-solving)
- **Year Three**: Community of Practice (quarterly convenings + podcast + learning resources)

## Quick Start

### Demo Mode (No Authentication)
The portal runs in demo mode by default with **mock user data and role switching**:

1. Open `http://localhost:3000`
2. Use the **Role Selector** in the top-right to switch between roles and see different experiences:
   - **Participant**: Basic access to programs and resources
   - **Team Lead**: Team management features
   - **Facilitator**: Team analytics and coaching tools
   - **Admin**: Full administrative access

### Key Pages

| Route | Description |
|-------|-------------|
| `/` | Home/Dashboard with role selector and quick navigation |
| `/programs` | Browse all 3-year programs |
| `/programs/[id]` | Program details with modules and enrollment |
| `/dashboard` | Personalized learning progress dashboard |
| `/resources` | Filtered resource library by type |

## Database Schema

### Core Tables
- **users**: User profiles with role assignments
- **school_teams**: Team organization within schools
- **cohorts**: Program cohorts assigned to facilitators
- **programs**: 3-year programs (year_one, year_two, year_three)
- **modules**: Learning modules within programs
- **enrollments**: User program enrollments and status
- **progress**: Individual module completion tracking
- **resources**: Learning materials with role-based access
- **schedules**: Event scheduling for modules
- **attendance**: Session attendance tracking
- **discussions**: Forum, Q&A, and announcements
- **discussion_replies**: Threaded conversations

### Enums
- **user_role**: `participant`, `team_lead`, `facilitator`, `admin`
- **program_year**: `year_one`, `year_two`, `year_three`
- **enrollment_status**: `pending`, `enrolled`, `completed`, `dropped`
- **discussion_type**: `forum`, `qa`, `announcement`

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Database**: PostgreSQL (Supabase)
- **UI Components**: shadcn/ui
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **State Management**: React Context (useUser hook)

## Environment Variables

Required Supabase variables (auto-configured when integration is set up):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=...
```

## Architecture Notes

### Role-Based Access
- `lib/roles.ts` defines all roles and their permissions
- `lib/user-context.tsx` provides the `useUser()` hook for accessing current user and role
- Components check permissions using `getPermissions(user.role)` before rendering role-specific features
- Resources can be role-filtered at display time

### Demo Data
- Mock programs, modules, and resources are defined as constants in page components
- Facilitator and admin features are visible when those roles are selected
- Role switching on the home page demonstrates different permission levels in real-time

### No Authentication Required
- Removed Supabase auth checks from pages
- UserProvider with mock data allows exploration of all features
- Role switching enables testing different permission levels without multiple accounts

## Development Workflow

1. **View Home**: Start at `/` to select your role
2. **Switch Roles**: Use the role selector to see different features
3. **Explore Features**: Navigate to see how each role experiences the portal
4. **Check Permissions**: Open browser console to verify which features are available

## Future Enhancements

- [ ] Real database integration with Supabase
- [ ] User authentication and profile management
- [ ] Admin dashboard for content management
- [ ] Discussion forums and Q&A
- [ ] Real-time notifications
- [ ] Email digests
- [ ] Certificate generation
- [ ] Advanced analytics
- [ ] Mobile app version
- [ ] Video hosting and streaming

## Accessibility & Performance

- All components follow WCAG 2.1 guidelines
- Semantic HTML and ARIA labels throughout
- Tailwind CSS provides responsive design
- Icons and visual indicators support all roles
- Role selector provides quick testing of different permission levels

---

Built for Wisdom At Work - Empowering school leaders through collaborative professional development
