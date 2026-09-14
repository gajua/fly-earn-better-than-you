# GitHub Release prep — v1.1.0

Tag: `v1.1.0`

Artifact:

```text
release/fly-earn-better-than-you-v1.1.0.zip
```

Build:

```bash
export E2E_TEST_MODE=0
export FLY_GLOBAL_LEARNING_ENABLED=1
export FLY_SUPABASE_URL=https://sfimnzdjndmipmtlnniq.supabase.co
export FLY_SUPABASE_PUBLISHABLE_KEY='<anon/publishable only>'
pnpm package:extension
```

## Gate before creating the release

1. Merge store packaging branch to `main`
2. Confirm `main` CI is green
3. Then:

```bash
git checkout main
git pull
git tag -a v1.1.0 -m "Fly Earn Better Than You v1.1.0"
git push origin v1.1.0
gh release create v1.1.0 \
  release/fly-earn-better-than-you-v1.1.0.zip \
  --title "v1.1.0" \
  --notes-file docs/store/RELEASE_NOTES_v1.1.0.md
```

Do **not** create the GitHub Release from a feature branch while `main` CI is red.
