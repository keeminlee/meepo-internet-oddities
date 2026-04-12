# Meepo — Strange minds behind strange software

Meepo is a **creator platform for authored software**.

This project is building a public home for weird little AI-built artifacts where:
- makers are visible,
- taste and personality are the product,
- and software is treated like culture (not just SaaS).

**Keemin:** yeah what Codex said, also I honestly just felt like vibe coding is basically the new Youtube (like old Youtube) where people can express themselves. And it's cool to see the weird unique stuff people come up with even if it's not particularly useful (yet?!)
But like, you see how the point for some reason when it comes to SaaS is always about how USEFUL it is, not how cool or inspiring or fascinating it is? Being useful is just one part of what makes something worth sharing, and that's what I'm all about :)

## Product thesis

Modern software got polished, faceless, and interchangeable.

Meepo intentionally moves in the other direction:
- **Authorship over anonymity**
- **Personality over polish**
- **Artifacts over feature checklists**
- **Curiosity over growth-hack feeds**

Think: **early YouTube energy for strange software**.

## Current direction (this repo)

The current app preserves a practical browse flow while shifting toward creator-first identity.

### 1) Creator identity (first-class)
Every project should clearly show the person behind it:
- profile image / handle / short bio
- "why I make things like this"
- list of all their projects

### 2) Project identity (compact + recognizable)
Each project should have a compact identity surface separate from screenshots:
- project avatar/sigil/icon
- one-line pitch
- emotional tags/vibes

### 3) Discovery model (hybrid)
Homepage should evolve into:
- **Top layer:** observatory / constellation "sky view" for serendipitous discovery
- **Bottom layer:** grounded browse + filters + cards for practical navigation

### 4) Social mechanics (intentionally light)
MVP should focus on taste and discovery, not heavy social complexity:
- lightweight reactions/saves
- follow creators (later)
- comments/discourse only when signal quality can be preserved

## MVP vs later

### MVP now
- Creator-forward cards and project pages
- Strong "Why I made this" prominence
- Clear authored copy and visual language
- Keep existing typed project model + detail flow

### Later
- Dedicated creator profile pages
- Project avatars/sigils generated or uploaded
- Observatory layer with constellations + tastemaker curation
- Lightweight social graph mechanics

## Project status

This codebase started from a Lovable-generated MVP and is now being iterated toward the creator-platform thesis above.

## Local development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```
