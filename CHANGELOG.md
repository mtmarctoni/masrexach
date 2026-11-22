# Changelog

## [1.4.0](https://github.com/mtmarctoni/masrexach/compare/v1.3.1...v1.4.0) (2026-11-22)


### Features

* **site:** show paintings in textured floating oak frames ([b35e29d](https://github.com/mtmarctoni/masrexach/commit/b35e29de02a4420d58c537468809586309280221))


### Bug Fixes

* **site:** keep equal spacing around paintings ([c7175b6](https://github.com/mtmarctoni/masrexach/commit/c7175b6ebe676aa99877c2017b714ae87d0130db))
* **site:** make the floating gap around paintings black ([0e1b861](https://github.com/mtmarctoni/masrexach/commit/0e1b86136d6362e6b6f3e379c9656171ba9491f0))

## [1.3.1](https://github.com/mtmarctoni/masrexach/compare/v1.3.0...v1.3.1) (2026-11-14)


### Bug Fixes

* **site:** restore old wordpress painting links ([c89fb5a](https://github.com/mtmarctoni/masrexach/commit/c89fb5aace0cc2b2dd1f687c24c8d4e39041923d))
* **site:** use painting names in artwork urls ([dd752bc](https://github.com/mtmarctoni/masrexach/commit/dd752bc772c404c25ed795038d61ab9314144e2b))

## [1.3.0](https://github.com/mtmarctoni/masrexach/compare/v1.2.0...v1.3.0) (2026-11-07)


### Features

* **site:** replace phone contact with the official email ([25a83da](https://github.com/mtmarctoni/masrexach/commit/25a83da31401397842c54620bb76ad032223c5e7))


### Performance Improvements

* **site:** use smaller artwork detail images on mobile ([a99b60b](https://github.com/mtmarctoni/masrexach/commit/a99b60b8f7fc08d8388c67046b54f5a41bace9e2))
* **site:** use smaller artwork previews on home and catalogue pages ([2b52b71](https://github.com/mtmarctoni/masrexach/commit/2b52b71731f2fff0ad02ea230992b4dcccd021aa))
* **site:** use smaller homepage hero images on smaller screens ([b3584a8](https://github.com/mtmarctoni/masrexach/commit/b3584a8a91888b41a3667d9aac84d15ed0b29f7f))

## [1.2.0](https://github.com/mtmarctoni/masrexach/compare/v1.1.0...v1.2.0) (2026-11-06)


### Features

* **agents:** add playwright browser tooling ([755c2e6](https://github.com/mtmarctoni/masrexach/commit/755c2e6d54a23289f5137c9d5e6a70c6d47f9f2c))
* **seo:** add localized sharing images ([5db2ceb](https://github.com/mtmarctoni/masrexach/commit/5db2cebb2e82c45361d987956451d810723234eb))


### Bug Fixes

* **deploy:** allow large artwork previews in search ([74fdd5b](https://github.com/mtmarctoni/masrexach/commit/74fdd5bbf7844605caa9ce3767e9ac7fbdb95027))
* **seo:** update painting and exhibition search descriptions ([55e24a3](https://github.com/mtmarctoni/masrexach/commit/55e24a341e56cd0c1792035da972ac0b39a5551f))
* **seo:** use a shared artist identity in painting metadata ([60f85ae](https://github.com/mtmarctoni/masrexach/commit/60f85ae62ce4cacfb0661db3c9db78d684f0482e))
* **site:** use canonical page urls without redirect hops ([66d25aa](https://github.com/mtmarctoni/masrexach/commit/66d25aa97ac35b169819f0856c51f110c17baffa))

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
