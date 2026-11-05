# QBP Theme

One Shopify theme (Dawn 15.2.0) shared by the QBP brand stores.

| Branch | Purpose |
|---|---|
| `main` | Shared theme code. Only approved work is merged here. |
| `Salsa-Theme` | Connected to the Salsa store through Shopify's GitHub integration. |
| `Surly-Theme` | Connected to the Surly store through Shopify's GitHub integration. |
| `Teravail-Theme` | Connected to the Teravail store through Shopify's GitHub integration. |
| `Surly-Sandbox` | Connected to an unpublished theme in the Surly store, for testing and client review. |
| `feature/*` | New work, branched from `main`. |

Every push to `main` runs [`.github/workflows/sync-store-branches.yml`](.github/workflows/sync-store-branches.yml), which merges `main` into each store branch. Shopify then deploys each branch to its store's connected theme.

## What syncs and what doesn't

| Files | Behaviour |
|---|---|
| `layout/`, `sections/*.liquid`, `snippets/`, `blocks/`, `assets/`, `locales/` | **Shared.** Synced from `main` to every store. |
| `config/settings_schema.json` | **Shared.** New settings appear in every store's theme editor. |
| `config/settings_data.json` | **Per store.** Theme editor values. Never overwritten. |
| `templates/**/*.json` | **Per store.** Never overwritten. New templates added on `main` are copied to stores. |
| `sections/*-group.json` | **Per store.** Header and footer content. Never overwritten. |
| `config/markets.json` | **Per store.** Never overwritten. |

The per-store files on `main` are Salsa's and act as a baseline for new stores.

## Rules for shared code

1. **Settings are additive.** Add new settings; don't rename or remove a setting `id`, block `type` or section a store uses. Stores keep their saved values, and anything unsaved falls back to the schema default.
2. **Don't change the default of an existing setting.** A store that never saved that setting would silently pick up the new default.
3. **Store differences go behind settings,** not separate code:
   - **Brand styling:** `assets/brand-<store>.css`, chosen by *Theme settings → Brand → Store brand*.
   - **Fonts:** *Theme settings → Brand → Adobe Typekit kit ID*. The brand stylesheet's font block only applies when a kit ID is set; otherwise the *Typography* fonts are used.
   - **Features one store uses:** a checkbox that defaults to off (for example *Badges → Enable clearance pricing and Shop Local badges*, *Cart → Show free delivery bar*).
4. **Don't edit code in Shopify's code editor** on a connected theme. It commits to the store branch, and the change never reaches `main` or the other stores.

## Building and testing new work

New code is tested on the sandbox theme before it reaches any store. Nothing syncs until it is merged into `main`.

```bash
git checkout -b feature/new-thing main     # 1. start from main
# ...commit your work...
git checkout Surly-Sandbox
git merge feature/new-thing                # 2. merge into the sandbox
git push                                   # 3. the Surly sandbox theme updates for review
```

When the client approves, merge the **feature branch** (never the sandbox) into `main` and push. The sync workflow sends it to every store, including the sandbox.

- **Don't merge `Surly-Sandbox` into `main`.** It holds Surly's templates and settings, plus any test edits made in the theme editor.
- **Template changes don't sync.** If a feature needs a section added to a page, add it to each store's template (theme editor or store branch) after it is live.
- **To refresh the sandbox** with the live store's latest templates and settings: `git checkout Surly-Sandbox && git reset --hard origin/Surly-Theme && git push --force`, then merge any unapproved feature branches back in.

## Adding a store

1. Add an option to `store_brand` in `config/settings_schema.json` and create `assets/brand-<store>.css`.
2. Create the store branch from `main`, then replace its templates, `settings_data.json`, section groups and `markets.json` with the store's own (`shopify theme pull --only ...`).
3. Set `store_brand` and `typekit_kit_id` in that branch's `settings_data.json`. Both default to empty (`none` / blank), which gives plain theme-editor styling and fonts.
4. Add the branch to the `matrix.branch` list in the sync workflow.
5. Connect the branch in Shopify (*Online Store → Themes → Add theme → Connect from GitHub*), review the new theme, then publish.

## Local setup

```bash
git config merge.ours.driver true   # needed for .gitattributes when merging main into a store branch by hand
```
