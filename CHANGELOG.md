# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3]

### Added
- Initial release of chat backend with N8N integration
- User authentication and registration
- Message handling with WebSocket support
- Health check endpoint
- CORS configuration via environment variables
- new environment variable: ALLOWED_ORIGINS

### Changed
- Updated CORS to use ALLOWED_ORIGINS environment variable

### Fixed
- CORS issues for cross-origin requests