# OBHS Student Life — Main Site

Full three-page site: Homepage, Student Hub, Faculty Hub.
Deployed on Vercel. Data pulled live from Google Sheets.

## Deploy (same as Club Hub — you've done this before)
1. Upload contents of this folder to a GitHub repo
2. Vercel → New Project → import repo → Deploy
3. You'll get a URL like obhs-site.vercel.app

## Connect your Google Sheet

### Step 1 — Create the Sheet
Make a new Google Sheet with these 5 tabs (exact names):
  - Announcements
  - Events
  - Dates
  - QuickLinks
  - Countdown

### Step 2 — Set up each tab

**Announcements** (columns: TITLE, DATE, SOURCE, TAG)
  TITLE              | DATE   | SOURCE       | TAG
  Final Exam Info    | Jun 10 | Student Life | All Students
  Hope Squad Meeting | Jun 10 | Clubs        | Club

  TAG options: All Students, Seniors, Juniors, Sophomores, Freshmen, Club, Deadline, Faculty

**Events** (columns: MONTH, DAY, TITLE, TIME, LOCATION)
  MONTH | DAY | TITLE              | TIME      | LOCATION
  JUN   | 15  | Final Exams Begin  | All day   | Various rooms
  JUN   | 19  | Last Day of School | Regular   |

**Dates** (columns: EMOJI, DATE, LABEL)
  EMOJI | DATE      | LABEL
  📅   | Jun 15–18 | Final Exams
  🎓   | Jun 19    | Last Day of School

**QuickLinks** (columns: EMOJI, LABEL, URL)
  EMOJI | LABEL                  | URL
  🤝   | Submit service hours    | https://forms.office.com/...
  🚌   | Field trip forms        | https://forms.office.com/...

**Countdown** (columns: LABEL, TARGET_DATE)
  LABEL                        | TARGET_DATE
  Days until last day of school | 2026-06-19

  TARGET_DATE format: YYYY-MM-DD

### Step 3 — Publish the Sheet
File → Share → Publish to web → Each tab → CSV → Publish
Copy the URL for the FIRST tab (Announcements).

### Step 4 — Paste the URL into index.html
Open public/index.html, find this line near the bottom:
  const SHEET = 'https://docs.google.com/...YOUR_SHEET_ID...';
Replace it with your published CSV URL.
Commit to GitHub → Vercel redeploys automatically.

### Step 5 — Get the GIDs for each tab
Each tab in Google Sheets has a numeric ID (gid).
To find it: click each tab → look at the URL → gid=XXXXXX
Update the GIDS object in index.html with your real numbers.

## Add real links
Search index.html for href='#' and replace with your real URLs:
- Microsoft Forms for field trips, early dismissals, announcements
- Community service Microsoft Form
- Club Hub Vercel URL (already set to obhs-student-life.vercel.app)

## Embed in SharePoint
1. Create a page in SharePoint
2. Add an Embed web part
3. Paste this site's Vercel URL
4. Set height to 900px
5. Publish

