# Contributing

Small, focused code fixes and clear bug reports are welcome. This repository maintains a specific artist’s official website; it is not a general-purpose portfolio template.

## Before making a change

- Explain the problem and keep unrelated changes separate. Discuss substantial changes with the maintainer before investing in an implementation.
- Artwork, photographs, translations and biographical or exhibition information require editorial review. Provide reliable sources where appropriate; do not invent missing dates, credits or artwork details.
- Do not include personal information or credentials in reports. Follow the [security policy](SECURITY.md) for vulnerabilities.

## Local setup and checks

Follow the [README](README.md#local-development) for Node, pnpm and development setup. Keep contact-form testing pointed at your own inbox; configured tests can send real email.

Run relevant checks before submitting a pull request. The pre-push hook runs `pnpm verify`; its additional tool requirements and full browser/Lighthouse mode are described in the [verification guide](docs/ci-verification.md) and [security runbook](docs/security.md#local-verification-before-publication--2026-11-06). Do not bypass checks to submit a change.

For artwork layout, thumbnail sizing or image-loading changes, read [image performance](docs/image-performance.md) first and verify both the homepage and catalogue.

## Pull requests

- Use a feature branch and describe what changed, why, and how you tested it.
- Include before-and-after screenshots for visible changes and review the affected languages.
- Use a conventional commit title. Documentation-only changes use `docs:`; internal tooling uses `chore:`, `ci:` or another appropriate internal type. Reserve `feat:` and `fix:` for changes visitors receive. See [release conventions](docs/releases.md).
- Do not manually edit `CHANGELOG.md`, `.release-please-manifest.json` or the package version; release automation owns them.

## Rights

Original code contributions must be compatible with the project’s [MIT License](LICENSE), and you must have the right to contribute them. Artwork and editorial assets are not covered by that license; see [asset rights](ASSET_RIGHTS.md). Do not copy third-party material into the repository without the necessary permission and notices.
