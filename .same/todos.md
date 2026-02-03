# VersaTalent Todos

## Current Tasks

### Completed
- [x] Replace talent_ids text input with multi-select component in event form
  - Created TalentMultiSelect component with search, avatars, and industry badges
  - Visual checkmarks for selected talents
  - Search filtering by name, profession, industry

- [x] Auto-complete events after their date has passed
  - Events are automatically marked as "completed" when fetched if their date is in the past
  - Auto-updates in database when page loads
  - Shows blue info notice when editing a past event
  - Creates/updates with correct status even if user selects "upcoming"

- [x] Display industry-specific details on public talent profile pages
  - Created IndustryDetailsDisplay component with styled cards for each industry
  - Modeling: measurements, sizes, appearance details
  - Sports: team, positions, stats (goals, assists), league info
  - Music: genre, label, instruments, streaming links
  - Acting: types, agencies, notable roles, training
  - Culinary: specialties, restaurants, certifications, TV appearances

- [x] Add validation for industry-specific required fields
  - Created validateIndustryDetails() function in validation.ts
  - Shows errors for required fields (e.g., height for models, genre for music)
  - Shows warnings for recommended fields
  - Visual indicators in admin form with red/amber boxes

- [x] Create a sports player stats comparison feature
  - New page at /talents/compare
  - Select two sports talents to compare
  - Visual stat bars showing goals, assists, versatility, experience
  - Winner highlighting and overall score

- [x] Fix video display in portfolio lightbox (infinite loop issue)
  - Videos now render as embedded iframes
  - Added YouTube/Vimeo URL conversion

- [x] Add industry-specific fields to talent forms
  - All five industries have custom form sections
  - Stored as JSONB in industry_details column

### Notes
- Migration `015_add_industry_details.sql` needs to be run on the database
- Industry details are stored as JSONB for flexibility
- Sports comparison works best when talents have industry_details filled in
- Events with past dates are automatically marked as completed

## Previously Completed
- [x] Initial project setup
- [x] Cover image feature
- [x] Portfolio management
