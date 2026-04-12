## Meepo MVP — “A public home for authored software”

### Founding line

**Meepo is a home for authored software — tiny AI-built projects that feel personal, strange, expressive, and alive.**

This is not a sterile launchpad, not a B2B dashboard, and not a generic Product Hunt clone.

Meepo exists to preserve the weirdness of the AI software explosion.

It should feel like:

- a gallery
- a bazaar
- a cabinet of curiosities
- a stage for weird little internet things

The emotional core is:  
**“I made this strange little thing and I want it to live somewhere.”**

The product should subtly communicate:

- software can be self-expression
- the maker matters
- not every project needs to be a startup
- browsing should be fun in itself

---

## Visual Identity

### Palette

- Warm cream / off-white background
- Dark charcoal text
- Accent colors in playful purples, oranges, greens
- Slightly more expressive than before — avoid flat “clean SaaS” sterility
- Tags and badges should feel collectible and lively, not enterprise-coded

### Typography

- Bold, slightly quirky headings
- Clean, readable body text
- Favor warmth and personality over hyper-neutrality

### Vibe

**Gallery-meets-bazaar, but with a sense of authorship**

- generous whitespace
- screenshot-forward cards
- rounded corners
- soft shadows
- subtle motion
- editorial / curated feel rather than “database of entries”

### Logo

- Text-based **meepo** wordmark
- small playful accent/icon
- should feel like a little creature/place/artifact rather than a tech company logo

---

## Product-level design guidance

### What the site should feel like

- expressive
- curious
- human
- slightly mischievous
- maker-proud
- visually inviting to browse for fun

### What it should NOT feel like

- growth-hacker optimized
- startup-bro
- leaderboards-first
- “scale your SaaS”
- sanitized corporate tooling
- generic AI template gallery

### Key principle

**This should feel like a rebellion against sterile software.**

---

## Pages & Components

## 1. Homepage (/)

### Hero

Keep:

- Large bold title: **meepo**
- Subtitle
- Two CTAs

But revise subtitle direction toward authorship and weirdness.

Best options:

- **Where vibe-coded projects go to live**
- **A public home for weird little AI-built projects**
- **Authored software for the curious internet**
- **Tiny software. Strange ideas. Real personality.**

Body copy should emphasize that these are:

- experiments
- playful utilities
- odd little tools
- story-driven sites
- things people made because they cared

Avoid copy that sounds like “launch your SaaS faster.”

### CTAs

- **Post your project**
- **Browse the weirdness**

That second CTA is better than just “Browse.”

### Tag filter row

Keep the row, but make tags feel more like **vibes / browsing lenses**, not just categories.

Recommended set:

- Weird
- Useful
- Beautiful
- Cursed
- Game
- Tool
- Experiment
- Story
- Prototype
- Playful
- Personal

### Homepage sections

Keep:

- Featured
- Newest
- Seeking Users

But revise the framing a bit:

#### Featured

This should feel **curated**, not algorithmic.  
Maybe label it:

- **Featured oddities**
- **Picked by taste**
- **Things we love**

#### Newest

Fine as-is.

#### Seeking Users

Good — but frame it like:

- **Needs curious humans**
- **Looking for first users**

That feels more alive.

### Footer

Change from:

- “Meepo · tiny software deserves a real home”

To one of:

- **Meepo · tiny software deserves a real home**
- **Meepo · software should feel human again**
- **Meepo · weird little projects deserve to live somewhere**

---

## 2. Project Card Component

This is still the most important component.

### Keep:

- Screenshot hero
- Name + pitch
- Maker
- Status badge
- Built with
- Tags
- Clicks sent
- Hover effects

### But tweak the priority:

The card should communicate:

1. **What kind of thing this is**
2. **Who made it**
3. **Why it feels interesting**
4. **That it’s getting attention**

So visually, **maker identity should matter more** than before.

### Add:

- a stronger **“by [maker]”** treatment
- optional tiny maker avatar/initial if easy
- a slightly more editorial card tone

### De-emphasize:

- pure utility metrics
- anything that makes it feel like a marketplace SKU

### Keep “clicks sent”

But it should feel like:

- proof of life
- proof of attention  
not:
- performance analytics dashboard

---

## 3. Project Detail Page (/project/:slug)

Keep all existing structure, but add one stronger authorship layer.

### Include:

- Large hero screenshot
- Title, pitch, maker, tags, built with, status
- Visit project button
- Clicks sent
- About this project
- Why it’s cool / Built for

### Add one more section:

**Why I made this**  
Even if seeded with mock content for now.

That single section pushes the product away from “directory” and toward **authored artifact**.

That is very important.

### Tone

This page should feel like:

- a little exhibit placard
- or a lovingly made project page  
not just metadata.

---

## 4. Submit Project

Keep the form mostly the same.

### Add one optional field:

- **Why did you make this?**

Even short.  
Even optional.

This is strategically important because it makes the site about **makers expressing something**, not just listing tools.

### Keep low-friction

Do not make this heavy.  
Just enough to capture personality.

---

## 5. Seed Data

Keep 15 projects, but revise what kind of mock projects you include.

### Make sure the seed set includes:

- useful tiny tools
- weird experiments
- aesthetic/beautiful one-off sites
- joke/cursed projects
- story-driven or emotionally specific projects
- one Starstory-adjacent entry
- a couple projects that feel obviously made by one quirky person

### Each seed project should feel like it reveals something about the maker.

Not just “here is a tool.”

That means the mock copy should include:

- personality
- oddity
- specificity
- a touch of internet-life

---

## Data Architecture

Keep as-is:

- centralized mock data
- typed interface
- constants file
- easy future swap to Supabase

### But expand project interface slightly

Recommend fields like:

- `makerBio` or short maker line
- `whyMade`
- maybe `vibeTags`

Even if optional.

That will make the product easier to grow into the authored-software vision later.

---

## Key UX Details

Keep:

- fully responsive
- card grid
- tasteful hover
- tag filtering
- screenshot-forward hierarchy
- warm playful tone

### Add:

- homepage should be **fun to browse even if you never submit**
- cards should feel a little collectible
- browsing should reward curiosity
- some microcopy should hint at cultural identity, not just utility

---

## Copy tone

This is where the biggest shift should happen.

### Good tone

- playful
- curious
- warm
- proud of weirdness
- slightly anti-sterile without sounding preachy

### Good lines

- **Built something weird? Put it here.**
- **Not every project needs to be a unicorn.**
- **Tiny software. Big personality.**
- **Some things are useful. Some are strange. Some are both.**
- **Software can be personal too.**
- **A home for the things people make because they care.**

### Avoid

- “launch your startup”
- “maximize exposure”
- “grow your product”
- “scale your SaaS”
- “optimize conversions”
- any generic startup-growth language

---

## Most important product principle

Replace this:

> a beautiful bulletin board for internet-native software curiosities

With this:

> **a beautiful home for authored software — weird, tiny AI-built projects with personality**

That’s the stronger version.

---

## Final deliverable

Produce the first full draft of Meepo so that it feels like:

- a gallery of expressive software
- a cultural home for vibe-coded things
- a place makers would feel proud to appear
- a place curious people would actually want to browse

It should feel alive immediately.

&nbsp;