# Security policy

## Reporting a vulnerability

Please do not disclose vulnerabilities, credentials or personal information in public issues, pull requests or comments.

If GitHub displays **Security → Report a vulnerability**, use that private reporting channel. Its availability depends on the repository’s settings.

Otherwise, use the contact form linked from [masrexach.com](https://masrexach.com) to request a private security conversation with the website maintainer. In this initial message, include only a brief, non-sensitive description and a way to reply. Wait for a response and an agreed reporting channel before sending exploit details, credentials or personal data. If the form itself is affected, do not use it to transmit sensitive information.

A useful private report describes the affected URL or code, the potential impact and minimal reproduction steps. Redact secrets and personal information. Do not test against other people’s data, send bulk requests or disrupt the live website.

## Supported deployment

Security fixes target the current production website and current development on `main`. Older releases are not maintained as separate security branches.

This is a small, independently maintained project; there is no guaranteed response time or paid bug-bounty program.

Maintainer procedures are documented separately in the [security runbook](docs/security.md).
