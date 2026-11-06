# Changelog

## [1.1.0](https://github.com/mtmarctoni/masrexach/compare/v1.0.0...v1.1.0) (2026-11-06)


### Features

* **release:** deploy the exact release commit to production ([86bd702](https://github.com/mtmarctoni/masrexach/commit/86bd7023e87d51a5887fb1476fea702eb17ecabb))
* **release:** maintain release PRs with Release Please ([9afcc6c](https://github.com/mtmarctoni/masrexach/commit/9afcc6ca313aca2a7a621a5771b0528350bc5054))


### Bug Fixes

* **ci:** exclude the generated CHANGELOG.md from Biome ([fd0c326](https://github.com/mtmarctoni/masrexach/commit/fd0c326cd7063bd140499c829e10ffe23c0f50d1))
* **deploy:** keep release App settings out of Worker vars ([9cb3a49](https://github.com/mtmarctoni/masrexach/commit/9cb3a4907c912f6051d49f04b162aec78a3dccb4))
* **deploy:** refuse to deploy outside GitHub Actions ([26a4e50](https://github.com/mtmarctoni/masrexach/commit/26a4e503c65ed05d09cf94511dd8b3f7a0bde7ec))
* **deploy:** sync only an explicit list of Worker secrets ([5e6cc92](https://github.com/mtmarctoni/masrexach/commit/5e6cc9263dad363adfb9798403912ac21c80c1f3))
* **deploy:** upload Worker secrets atomically with the deploy ([1339b4f](https://github.com/mtmarctoni/masrexach/commit/1339b4f950ffdcee08d30f2b3923e16f1e1b304b))
* **release:** stamp the release commit when rolling back to v1.0.0 ([63da571](https://github.com/mtmarctoni/masrexach/commit/63da5712354c046ae62f82f57c1223f9f81094ef))
* **test:** check the release manifest matches package.json ([7116d18](https://github.com/mtmarctoni/masrexach/commit/7116d18f28c0fc5fcde1f4162ba687e24b1b68bd))
