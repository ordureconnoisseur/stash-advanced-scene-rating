# Advanced Scene Rating

A Stash plugin that adds a multi-category rating system for scenes. Instead of a single star rating, you rate scenes across configurable criteria — the plugin then calculates an overall score and sets the Stash rating automatically.

## Requirements

- [Stash](https://stashapp.cc) v0.27+
- Python 3.x
- [stashapp-tools](https://github.com/stashapp/stash-app-tools): `pip install stashapp-tools`

## Installation

1. Download and extract the plugin into your Stash plugins directory (e.g. `~/.stash/plugins/Advanced Scene Rating/`)
2. In Stash, go to **Settings → Plugins** and click **Reload Plugins**
3. The **Advanced Scene Rating** plugin should now appear — enable it
4. Run the **Create Tags** task to generate the rating tag hierarchy

## Usage

1. Navigate to any scene in Stash
2. Click the **★+** button near the scene's rating
3. A modal opens showing all rating categories with 1–5 star selectors
4. Rate each category — the overall scene rating updates automatically when you close the modal
5. Hovering over categories shows a description of what to rate

The overall rating is the average of all rated categories, rounded to the nearest star and mapped to Stash's 0–100 scale.

## Configuration

Go to **Settings → Plugins → Advanced Scene Rating** to configure:

| Setting | Default | Description |
|---|---|---|
| Categories | `Production Quality,Chemistry,Performance,Aesthetics,Creativity` | Comma-separated list of rating categories |
| Minimum Required Tags | `5` | How many categories must be rated before a score is calculated |
| Allow Destructive Actions | `false` | Must be enabled before the Remove Tags task will run |

After changing categories, re-run **Create Tags** to generate tags for any new categories.

## Tasks

- **Process All Scenes** — Recalculates ratings for every scene based on their existing tags
- **Create Tags** — Creates the rating tag hierarchy under an "Advanced Rating System" parent tag
- **Remove Tags** — Deletes all rating tags (requires Allow Destructive Actions to be enabled)

## How It Works

Each category gets a tag in the format `Category: N` (e.g. `Performance: 4`). When a scene is updated, the hook reads those tags, averages the scores, and sets the Stash rating. Tags are organised in a hierarchy: `Advanced Rating System > Category > Category: N`.
