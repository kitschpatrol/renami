# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.4] - 2026-11-02

### Maintenance

- Upgrade pretty-ms to 10 and raise the declared Zod requirement to `^4.6.7`.
- Refresh pnpm, shared configuration, build/test tooling, and release/dependency automation, with behavior-preserving lint refactors.
- Build before lint/fix commands and move skill synchronization from a prepare hook into pnpm workspace settings.

## [0.3.3] - 2026-10-14

### Added

- Export `FileRenameReport`, `FileRenameTask`, `Transform`, `FileAdapter`, `GlobAdapter`, `GlobAdapterOptions`, `PathObject`, `CaseType`, and `TimeZone` from the package root.

### Maintenance

- Refresh pnpm, shared configuration, build/test tooling, CLI-help generation, and GitHub Actions.
- Run dependency-update automation monthly and make link checks ignore loopback URLs and succeed when no links are found.

## [0.3.2] - 2026-10-06

### Changed

- **Breaking:** Restrict supported Node.js versions to `^24.16.0 || >=26.3.0`, excluding Node.js 25 and early Node.js 26 releases.

### Fixed

- Remove trailing delimiters even when their trailing whitespace has already been trimmed.
- Retain the default-name fallback when filenamify 7 produces `!` for an unusable name, while preserving literal exclamation marks.

### Documentation

- Correct the documented Node.js requirement and expand installation guidance for npx, scoped global npm installation, Homebrew, and library use.

### Maintenance

- Upgrade filenamify to 7 and refresh nanoid requirements.
- Refresh pnpm, shared configuration, brewpub, CLI-help generation, and test tooling; simplify build configuration and add delimiter regression tests.
- Add scheduled dependency-update pull requests and correct error capture in the website link-check workflow.

## [0.3.1] - 2026-09-21

### Added

- Support Homebrew installation with `brew install kitschpatrol/tap/renami`.

### Documentation

- Document global Homebrew installation alongside local npm installation for CLI and library use.

### Maintenance

- Refresh cosmiconfig, yargs, and Zod runtime requirements.
- Upgrade pnpm to 12 and Vitest to 5, refresh build/lint tooling and GitHub Actions, and automate Homebrew formula updates during releases with brewpub.

## [0.3.0] - 2026-09-01

### Changed

- **Breaking:** Require Node.js 24.16.0 or later, dropping Node.js 22 and 23 support.
- Separate multiple glob patterns with commas and spaces in CLI reports.

### Fixed

- Leave values unchanged for invalid inline truncation formats such as `2x`, instead of accepting a leading numeric prefix.
- Preserve literal `$` replacement sequences when collapsing repeated custom delimiters.

### Documentation

- Refresh npm package and license links in the README.

### Maintenance

- Refresh runtime dependencies, including cosmiconfig 10, deepmerge-ts 8, nanoid 6, date-fns, globby, yargs, and Zod.
- Upgrade TypeScript to 6 and refresh pnpm and development tooling, with internal refactoring for stricter lint and type checks.
- Add scheduled repository and website link checks and tighten release-tag validation against the repository's default branch.

## [0.2.0] - 2026-05-16

### Changed

- **Breaking:** Require Node.js 22.18.0 or later, dropping Node.js 20 support.

### Documentation

- Refresh README license and maintainer links.

### Maintenance

- Refresh runtime requirements, including @sindresorhus/is 8, cosmiconfig-typescript-loader, nanoid, and Zod.
- Upgrade pnpm to 11 and refresh build, lint, test, and CI tooling; make cleanup portable and support release tags with or without a `v` prefix.

## [0.1.1] - 2026-04-07

### Fixed

- Interpret date strings without explicit offsets in the configured time zone, keeping generated dates consistent across host time zones.
- Accept `UTC` in time-zone configuration and defaults, preventing configuration rejection on UTC hosts.
- Recognize Windows drive-letter paths as absolute during validation and path resolution.

### Documentation

- Add a CI status badge to the README.

### Maintenance

- Refresh globby and nanoid requirements and constrain filenamify to the 6.0.x series.
- Add build, lint, and test CI on Linux, macOS, and Windows; normalize test paths and line endings and relax fragile timing assertions.
- Refresh pnpm and development tooling, declare Node.js 22.18+ for contributors, and update CLI-help generation and release workflows.

## [0.1.0] - 2026-03-12

### Added

- Ship `@kitschpatrol/renami` as an ESM package with the `renami()` API, TypeScript declarations, configuration helpers and defaults, and locale/time-zone validators for Node.js 20.19+.
- Provide the `renami` CLI with automatic configuration discovery, `--config`/`-c`, verbose reporting, help, and version output.
- Support validated configuration objects and files, global and per-rule options, multiple glob patterns relative to the configuration file, and last-matching-rule precedence.
- Chain template strings or asynchronous transform functions, with `transformHelper` callbacks providing file contents, metadata, Markdown frontmatter, and syntax trees.
- Allow custom file and glob adapters for integration with environments such as Obsidian.
- Generate Markdown filenames from nested frontmatter fields and CSS-like content selectors, with array/object serialization, readable link labels, and escaped template delimiters.
- Support chained inline case, number, date, and truncation formatters, including configurable locales and time zones.
- Sanitize unsafe filename characters, normalize Unicode, convert case including slugs, and configure whitespace trimming, whitespace collapse, and surplus delimiter removal.
- Provide configurable filename length limits, word-boundary truncation, and custom truncation markers while accounting for file extensions.
- Validate input paths and existing targets, resolve case-insensitive filename collisions with numeric suffixes, preserve existing suffixes where possible, and use temporary paths for conflicting renames.
- Rename files on disk or simulate operations with `dryRun`, returning per-rule and per-file statuses, original and target paths, and timings.
- Provide strict mode that uses `defaultName` when every user transform returns undefined, instead of retaining the original name.
- Allow folder notes whose names match their containing directories to be excluded from renaming.

### Documentation

- Document npm installation, configuration options, Markdown templates, inline formatting, and CLI/library usage with examples.

### Maintenance

- Establish tsdown builds, automated tests, shared lint tooling, generated documentation, and publishing and GitHub release workflows.

[0.1.0]: https://github.com/kitschpatrol/renami/releases/tag/v0.1.0
[0.1.1]: https://github.com/kitschpatrol/renami/compare/v0.1.0...v0.1.1
[0.2.0]: https://github.com/kitschpatrol/renami/compare/v0.1.1...v0.2.0
[0.3.0]: https://github.com/kitschpatrol/renami/compare/v0.2.0...v0.3.0
[0.3.1]: https://github.com/kitschpatrol/renami/compare/v0.3.0...v0.3.1
[0.3.2]: https://github.com/kitschpatrol/renami/compare/v0.3.1...v0.3.2
[0.3.3]: https://github.com/kitschpatrol/renami/compare/v0.3.2...v0.3.3
[0.3.4]: https://github.com/kitschpatrol/renami/compare/v0.3.3...v0.3.4
