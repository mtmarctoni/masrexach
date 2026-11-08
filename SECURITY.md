# Security policy

## Reporting a vulnerability

Please do not disclose vulnerabilities, credentials or personal information in public issues, pull requests or comments.

If GitHub displays **Security → Report a vulnerability**, use that private reporting channel. Its availability depends on the repository’s settings.

Otherwise, email the maintainer at [mtmarctoni@protonmail.com](mailto:mtmarctoni@protonmail.com). This route is independent of the website contact form. Do not use the artwork-enquiry address for security or development reports.

A useful private report describes the affected URL or code, the potential impact and minimal reproduction steps. Redact secrets and personal information. Do not test against other people’s data, send bulk requests or disrupt the live website.

## Scope

Reports should identify whether they affect the current production website, `main`, or an older revision. Include a commit or release identifier when possible so the maintainer can assess the affected code; this is not a promise of support for a particular release.

This is a small, independently maintained project; there is no guaranteed response time or paid bug-bounty program.

Maintainer procedures are documented separately in the [security runbook](docs/security.md).
