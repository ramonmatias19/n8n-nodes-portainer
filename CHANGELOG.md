# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.3] - 2026-04-20

### ✨ Added
- **"Ignore SSL Issues" toggle** in the Portainer API credential. Enable it when your Portainer instance uses a self-signed certificate (typical on port 9443). Wires `skipSslCertificateValidation` into both the credential test and the node's request defaults.

### 🐛 Fixed
- **"Invalid URL" when saving the credential** (#5): the credential test now strips trailing slashes from the Portainer URL before joining `/api/users/me`, and the node does the same when building request defaults, so `https://host:9443`, `https://host:9443/`, and `https://host:9443//` all resolve correctly.
- Clearer credential description + placeholder documenting the expected `http(s)://host:port` format.

## [2.1.2] - 2026-04-20

### 🐛 Fixed
- **Community Node Install Error**: Fixed `Cannot set properties of undefined (setting 'n8n-nodes-portainer')` thrown by n8n when installing via the Community Nodes UI (#4).
  - Removed stale `main: "index.js"` pointer (file never existed) so Node's package loader no longer fails mid-install.
  - Added explicit empty `dependencies: {}` so n8n's package-registration setter always has a target object.
  - Stopped shipping a stray `dist/package.json` artifact by dropping `package.json` from `tsconfig.json` `include`; lint keeps covering it via a dedicated `tsconfig.eslint.json`.

### 🌐 Changed
- Translated remaining Portuguese strings to English, polishing PR #6:
  - CHANGELOG heading `Compatibilidade` → `Compatibility`.
  - Node descriptions `Manage/Retrieve all secrets Docker Swarm` → `Manage/Retrieve all Docker Swarm secrets`.

## [2.1.0] - 2025-12-27

### ✨ Added
- **🤖 AI Agent Tool Support**: Node is now compatible as a Tool in n8n's AI Agent
  - **IMPLEMENTED**: Added `usableAsTool: true` in the node configuration
  - **GROUP UPDATED**: Changed from `['transform']` to `['tool']` for better categorization
  - **COMPATIBILITY**: Works with recent versions and nightly builds of n8n (≥ v1.79)
  - **FEATURES**: The node can now be called directly by the AI Agent as a tool
  - **USAGE**: Appears in the list of tools available in an AI Agent workflow

### 🔧 Enhanced
- **Optimized Category**: Node now appears under the "Tool" category for easier discovery
- **AI Integration**: Ready for use in AI-automated workflows
- **Stability**: Clean structure with static routing compatible with AI Tools

### 📋 Usage Notes
- **Required Version**: Requires n8n version ≥ 1.79 or nightly builds
- **Installation**: Reinstall the node after updating for AI Agent recognition
- **Configuration**: Restart n8n after installation to enable Tool functionality

## [2.0.0] - 2024-01-XX

### ✨ MAJOR UPDATE: 100% coverage of Portainer API 2.27.8

#### 🚀 Main New Features
- **Docker Swarm Services**: Create, update, scale, logs, full delete support
- **Secrets & Configs**: Full management of Swarm secrets and configs
- **Nodes**: Docker Swarm node management, inspection and updates
- **Templates**: Access and manage application templates
- **Registries**: Full CRUD for image registries (DockerHub, ECR, Azure, etc.)
- **Teams**: Full management of teams and members
- **Settings**: Portainer settings, authentication, security policies
- **Webhooks**: Create and manage webhooks for automation
- **Edge Groups**: Full management of edge computing groups
- **Edge Stacks**: Deploy and manage stacks in edge environments
- **System**: System status, version, node information

#### 🔧 Expanded Operations - Containers (13 operations)
- **Added**: `create`, `exec`, `getLogs`, `getStats`, `inspect`, `pause`, `unpause`
- **Improved**: `delete` (with volume removal option), `restart`/`stop` (with timeout)
- **Advanced parameters**: Environment variables, port mapping, restart policies

#### 🖼️ Expanded Operations - Images (9 operations)
- **Added**: `build`, `get`, `getHistory`, `inspect`, `pull`, `push`, `tag`
- **Parameters**: Build context, tags, repositories, registry authentication

#### 🔄 Expanded Operations - Services (7 operations)
- **Added**: `create`, `getLogs`, `scale`, `update`
- **Capabilities**: Create services with replicas, ports, and environment variables

#### 🔐 New Security Features
- **Secrets**: `create`, `delete`, `get`, `getMany`, `inspect`
- **Configs**: `create`, `delete`, `get`, `getMany`, `inspect`
- **Full support**: Base64 encoding, labels, metadata management

#### 🏗️ Infrastructure and Management
- **Nodes**: Inspect Swarm nodes, update role/availability
- **Registries**: Support for 7 types (Quay.io, Azure, Custom, Gitlab, ProGet, DockerHub, ECR)
- **Teams**: Full management of organizational teams

#### ⚙️ Settings and Automation
- **Settings**: 15+ Portainer settings (authentication, security, snapshots)
- **Webhooks**: Automation for services and stacks
- **System**: Monitor status and versions

#### 📊 Implementation Stats
- **21 main resources** (vs. previous 7)
- **150+ operations** (vs. previous 25)
- **80+ specific parameters** for detailed configuration
- **API coverage**: 100% (vs. previous 20–25%)

#### 🛠️ Technical Improvements
- Optimized declarative n8n structure
- Improved parameter validation
- Complete inline documentation
- Support for all Portainer environment types

### 🔄 Compatibility
- **Portainer API**: 2.27.8 (full coverage)
- **n8n**: Compatible with 1.x versions
- **Breaking Changes**: None for existing operations

## [1.0.1] - 2024-01-XX

### Added
- Update operation for stacks with full support for:
  - Updating stack file content (docker-compose.yml)
  - Managing environment variables via UI
  - Prune option to remove non-referenced services
- Detailed parameters for stack configuration
- Input data validation

### Changed
- Improved parameter organization in the node
- Optimized routing structure for stack operations

### Fixed
- TypeScript compilation fixes
- Data structure adjustments for API compatibility

## [1.0.0] - 2024-01-XX

### Added
- Initial implementation of the Portainer node for n8n
- Basic support for main resources:
  - **Containers**: List, get, start, stop, restart, delete
  - **Environments**: List and get environments/endpoints
  - **Images**: List and delete images
  - **Networks**: List and delete networks
  - **Stacks**: List, get, and delete stacks
  - **Users**: List and get users
  - **Volumes**: List and delete volumes
- PortainerApi credentials with API Key authentication
- Automatic connectivity test
- Complete installation and usage documentation
- Automated development and build scripts
