# Advanced Scene Rating

A Stash plugin that adds a multi-category rating system for scenes. Instead of a single star rating, you rate scenes across configurable criteria — the plugin then calculates an overall score and sets the Stash rating automatically.

<!-- screenshots -->

## Requirements

- [Stash](https://stashapp.cc) v0.27+
- Python 3.x
- [stashapp-tools](https://github.com/stg-annon/stashapp-tools): `pip install stashapp-tools`

## Installation

1. Download this repository (Code → Download ZIP) and extract it
2. Place the extracted folder inside a category subfolder of your Stash plugins directory:
   - **Linux/Mac:** `~/.stash/plugins/Utilities/Advanced Scene Rating/`
   - **Windows:** `%USERPROFILE%\.stash\plugins\Utilities\Advanced Scene Rating\`
   
   > The plugin must be **two levels deep** inside the plugins directory — `plugins/Category/Plugin/`. Placing it directly under `plugins/` will cause it not to appear in Stash.

3. In Stash, go to **Settings → Plugins** and click **Reload Plugins**
4. Enable **Advanced Scene Rating**
5. Run the **Create Tags** task to generate the rating tag hierarchy

## Usage

1. Navigate to any scene in Stash
2. Click the **★+** button near the scene's rating
3. A modal opens showing all rating categories with 1–5 star selectors
4. Rate each category — the overall scene rating updates automatically when you close the modal
5. Hover over a category name to see a description of what it rates

The overall rating is the average of all rated categories, rounded to the nearest star and mapped to Stash's 0–100 scale.

## Configuration

Go to **Settings → Plugins → Advanced Scene Rating** to configure:

| Setting | Default | Description |
|---|---|---|
| Categories | `Production Quality,Chemistry,Performance,Aesthetics,Creativity` | Comma-separated list of rating categories |
| Minimum Required Tags | `5` | How many categories must be rated before a score is calculated |
| Allow Destructive Actions | `false` | Must be enabled before the Remove Tags task will run |

> **Note:** Due to a bug in Stash, settings fields will appear blank even when defaults are set. You don't need to fill them in — the plugin uses the defaults shown above automatically if a field is left empty. Only enter a value if you want to override the default.

After changing categories, re-run **Create Tags** to generate tags for any new categories.

## Tasks

- **Process All Scenes** — Recalculates ratings for every scene based on their existing tags
- **Create Tags** — Creates the rating tag hierarchy under an "Advanced Rating System" parent tag
- **Remove Tags** — Deletes all rating tags (requires Allow Destructive Actions to be enabled)

## How It Works

Each category gets a tag in the format `Category: N` (e.g. `Performance: 4`). When a scene is updated, the hook reads those tags, averages the scores, and sets the Stash rating. Tags are organised in a hierarchy: `Advanced Rating System > Category > Category: N`.
