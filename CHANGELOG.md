# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.6] - 2026-06-01

### 🐛 Fixed — "Invalid Syntax" when saving credentials / running any operation (#8)

A fresh install could not save the Portainer API credential ("Invalid Syntax") and every operation (e.g. List Environments) threw `Error: invalid syntax` at `Expression.renderExpression`. The same HTTP request worked from the core HTTP Request node, confirming the bug was in this node's expressions — not the server.

- **Root cause**: the trailing-slash strip added in 2.1.3 was written as a regex literal *inside a single-quoted string*: `'={{$credentials.baseUrl.replace(/\/+$/, "")}}/api'`. JavaScript string escaping collapses `\/` to `/`, so the value n8n actually parsed was `replace(//+$/, "")` — the `//` opens a comment / invalid regex, so the n8n expression engine rejected the whole expression as **invalid syntax**.
  - Hit at **credential save** via `test.request.url` in `PortainerApi.credentials.ts`.
  - Hit at **runtime** via `requestDefaults.baseURL` in `Portainer.node.ts` (broke every operation).
- **Fix**: strip the trailing slash with plain, parser-safe String methods (no regex literal):
  `={{$credentials.baseUrl.endsWith("/") ? $credentials.baseUrl.slice(0, -1) : $credentials.baseUrl}}/api`
  Both `https://host:9443` and `https://host:9443/` resolve correctly, and the SSL toggle from 2.1.3 is preserved.
- **Credit**: thanks to [@albus12138](https://github.com/albus12138) ([#9](https://github.com/ramonmatias19/n8n-nodes-portainer/pull/9)) for independently identifying the same root cause.

### 🧪 Tests
- Added `tests/expression.test.js` — a dependency-free regression guard asserting neither the credential nor the node embeds a regex-literal expression and that the trailing-slash logic resolves `host`, `host/`, and `host` identically. Run with `node tests/expression.test.js`.

## [2.1.5] - 2026-04-20

### 🐛 Fixed — System resource endpoints returning 404 on Portainer ≥ 2.40

End-to-end validation against a live Portainer 2.40.0 instance showed two System operations hitting non-existent paths.

- **Operation "System → Get Version"**
  - **PROBLEMA**: `GET /api/status/version` retornava `HTTP 404 — 404 page not found` no Portainer 2.40.0. O path correto migrou pra `/api/system/version`.
  - **SOLUÇÃO**: Rota atualizada pra `/system/version`. Validado contra Portainer 2.40.0 retornando `ServerVersion`, `VersionSupport`, `ServerEdition`, `DatabaseVersion`, `UpdateAvailable`.

- **Operation "System → Get Nodes"**
  - **PROBLEMA**: `GET /api/status/nodes` retornava `HTTP 404`. Path migrado pra `/api/system/nodes`.
  - **SOLUÇÃO**: Rota atualizada pra `/system/nodes`. Validado retornando `{ nodes: N }`.

A operação `System → Get Status` (`/status`) continua funcionando — não precisou mudar.

### 🔧 Technical
- Adicionada suite de smoke test (`tests/smoke.js`) cobrindo **23 endpoints read-only** em 13 resources (users, status, settings, teams, registries, templates, webhooks, stacks, edge_groups, edge_stacks, endpoints, containers, images, networks, volumes, services, secrets, configs, docker info)
- Credenciais consumidas via `.env.test` (gitignored), executa com `node tests/smoke.js`
- Resultado pós-fix: **23/23 endpoints PASS** contra Portainer 2.40.0
- Build TypeScript + ESLint passando sem erros

### 🧪 How to re-validate
```bash
cd n8n-nodes-portainer
# popular .env.test com PORTAINER_BASE_URL e PORTAINER_API_KEY
node tests/smoke.js
```

## [2.1.4] - 2026-04-20

### 🐛 Fixed
- **Expressions in Name/Value pairs were not evaluated at runtime** (#7): environment-variable pairs in Stacks (create/update), Edge Stacks (create/update), Containers (create), and Services (create/update) now evaluate n8n expressions (e.g. `{{$json.foo}}`) instead of sending literal strings. Switched the `Env`/`env` body fields from static declarative templates to `routing.send.preSend` hooks that resolve parameters via `this.getNodeParameter()`, which recursively resolves fixedCollection values.
- Covers both Docker-style `KEY=VALUE` string arrays (Services, Containers) and Portainer-style `{ name, value }` object arrays (Stacks, Edge Stacks).

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
