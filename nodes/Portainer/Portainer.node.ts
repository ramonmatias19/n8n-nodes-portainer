import {
	IExecuteSingleFunctions,
	IHttpRequestOptions,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

type EnvVarPair = { name: string; value: string };

async function collectEnvVars(
	this: IExecuteSingleFunctions,
	paramPath: string,
): Promise<EnvVarPair[]> {
	const raw = (this.getNodeParameter(paramPath, []) as unknown) ?? [];
	if (!Array.isArray(raw)) return [];
	return raw
		.map((item) => ({
			name: item?.name != null ? String(item.name) : '',
			value: item?.value != null ? String(item.value) : '',
		}))
		.filter((item) => item.name.length > 0);
}

function setBodyDeep(body: Record<string, unknown>, path: string[], value: unknown): void {
	let cursor: Record<string, unknown> = body;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (cursor[key] == null || typeof cursor[key] !== 'object') {
			cursor[key] = {};
		}
		cursor = cursor[key] as Record<string, unknown>;
	}
	cursor[path[path.length - 1]] = value;
}

function envPreSendPairs(paramPath: string, bodyPath: string[]) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const items = await collectEnvVars.call(this, paramPath);
		if (items.length === 0) return requestOptions;
		const body = (requestOptions.body as Record<string, unknown>) ?? {};
		setBodyDeep(body, bodyPath, items.map((e) => ({ name: e.name, value: e.value })));
		requestOptions.body = body;
		return requestOptions;
	};
}

function envPreSendStrings(paramPath: string, bodyPath: string[]) {
	return async function (
		this: IExecuteSingleFunctions,
		requestOptions: IHttpRequestOptions,
	): Promise<IHttpRequestOptions> {
		const items = await collectEnvVars.call(this, paramPath);
		if (items.length === 0) return requestOptions;
		const body = (requestOptions.body as Record<string, unknown>) ?? {};
		setBodyDeep(body, bodyPath, items.map((e) => `${e.name}=${e.value}`));
		requestOptions.body = body;
		return requestOptions;
	};
}

export class Portainer implements INodeType {
	description: INodeTypeDescription & { usableAsTool?: boolean } = {
		displayName: 'Portainer',
		name: 'portainer',
		icon: 'file:logo.svg',
		group: ['tool'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Portainer API data to manage Docker',
		defaults: {
			name: 'Portainer',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		// usableAsTool removido: structuredClone falha em preSend function refs (n8n recente)
		credentials: [
			{
				name: 'portainerApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl.endsWith("/") ? $credentials.baseUrl.slice(0, -1) : $credentials.baseUrl}}/api',
			skipSslCertificateValidation: '={{$credentials.ignoreSsl}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
		properties: [
			// Resource selector
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Config',
						value: 'configs',
						description: 'Manage Docker Swarm configs',
					},
					{
						name: 'Container',
						value: 'containers',
						description: 'Manage Docker containers',
					},
					{
						name: 'Edge Group',
						value: 'edgeGroups',
						description: 'Manage edge computing groups',
					},
					{
						name: 'Edge Stack',
						value: 'edgeStacks',
						description: 'Manage edge computing stacks',
					},
					{
						name: 'Environment',
						value: 'environments',
						description: 'Manage environments/endpoints',
					},
					{
						name: 'Image',
						value: 'images',
						description: 'Manage Docker images',
					},
					{
						name: 'Network',
						value: 'networks',
						description: 'Manage Docker networks',
					},
					{
						name: 'Node',
						value: 'nodes',
						description: 'Manage Docker Swarm nodes',
					},
					{
						name: 'Registry',
						value: 'registries',
						description: 'Manage image registries',
					},
					{
						name: 'Role',
						value: 'roles',
						description: 'Manage roles and permissions',
					},
					{
						name: 'Secret',
						value: 'secrets',
						description: 'Manage Docker Swarm secrets',
					},
					{
						name: 'Service',
						value: 'services',
						description: 'Manage Docker Swarm services',
					},
					{
						name: 'Setting',
						value: 'settings',
						description: 'Manage settings in Portainer',
					},
					{
						name: 'Stack',
						value: 'stacks',
						description: 'Manage Docker Compose stacks',
					},
					{
						name: 'System',
						value: 'system',
						description: 'System information and status',
					},
					{
						name: 'Team',
						value: 'teams',
						description: 'Manage teams and members',
					},
					{
						name: 'Template',
						value: 'templates',
						description: 'Manage application templates',
					},
					{
						name: 'User',
						value: 'users',
						description: 'Manage users',
					},
					{
						name: 'Volume',
						value: 'volumes',
						description: 'Manage Docker volumes',
					},
					{
						name: 'Webhook',
						value: 'webhooks',
						description: 'Manage webhooks',
					},
				],
				default: 'containers',
			},

			// ===========================================
			// TEMPLATES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['templates'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List templates',
						description: 'Retrieve all templates',
						routing: {
							request: {
								method: 'GET',
								url: '/templates',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get template',
						description: 'Get a template by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/templates/{{$parameter["templateId"]}}',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// REGISTRIES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['registries'],
					},
				},
							options: [
				{
					name: 'Create',
					value: 'create',
					action: 'Create registry',
					description: 'Create a new registry',
					routing: {
						request: {
							method: 'POST',
							url: '/registries',
							body: {
								Name: '={{$parameter["registryName"]}}',
								URL: '={{$parameter["registryUrl"]}}',
								Type: '={{parseInt($parameter["registryType"]) || 1}}',
								Username: '={{$parameter["username"] || ""}}',
								Password: '={{$parameter["password"] || ""}}',
							},
						},
					},
				},
				{
					name: 'Delete',
					value: 'delete',
					action: 'Delete registry',
					description: 'Delete a registry',
					routing: {
						request: {
							method: 'DELETE',
							url: '=/registries/{{$parameter["registryId"]}}',
						},
					},
				},
				{
					name: 'Get',
					value: 'get',
					action: 'Get registry',
					description: 'Get a registry by ID',
					routing: {
						request: {
							method: 'GET',
							url: '=/registries/{{$parameter["registryId"]}}',
						},
					},
				},
				{
					name: 'Get Many',
					value: 'getMany',
					action: 'List registries',
					description: 'Retrieve all registries',
					routing: {
						request: {
							method: 'GET',
							url: '/registries',
						},
					},
				},
				{
					name: 'Update',
					value: 'update',
					action: 'Update registry',
					description: 'Update a registry',
					routing: {
						request: {
							method: 'PUT',
							url: '=/registries/{{$parameter["registryId"]}}',
							body: {
								Name: '={{$parameter["registryName"]}}',
								URL: '={{$parameter["registryUrl"]}}',
								Username: '={{$parameter["username"] || ""}}',
								Password: '={{$parameter["password"] || ""}}',
							},
						},
					},
				},
			],
				default: 'getMany',
			},

			// ===========================================
			// TEAMS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['teams'],
					},
				},
							options: [
				{
					name: 'Create',
					value: 'create',
					action: 'Create team',
					description: 'Create a new team',
					routing: {
						request: {
							method: 'POST',
							url: '/teams',
							body: {
								Name: '={{$parameter["teamName"]}}',
							},
						},
					},
				},
				{
					name: 'Delete',
					value: 'delete',
					action: 'Delete team',
					description: 'Delete a team',
					routing: {
						request: {
							method: 'DELETE',
							url: '=/teams/{{$parameter["teamId"]}}',
						},
					},
				},
				{
					name: 'Get',
					value: 'get',
					action: 'Get team',
					description: 'Get a team by ID',
					routing: {
						request: {
							method: 'GET',
							url: '=/teams/{{$parameter["teamId"]}}',
						},
					},
				},
				{
					name: 'Get Many',
					value: 'getMany',
					action: 'List teams',
					description: 'Retrieve all teams',
					routing: {
						request: {
							method: 'GET',
							url: '/teams',
						},
					},
				},
				{
					name: 'Update',
					value: 'update',
					action: 'Update team',
					description: 'Update a team',
					routing: {
						request: {
							method: 'PUT',
							url: '=/teams/{{$parameter["teamId"]}}',
							body: {
								Name: '={{$parameter["teamName"]}}',
							},
						},
					},
				},
			],
				default: 'getMany',
			},

			// ===========================================
			// SETTINGS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['settings'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get settings',
						description: 'Get settings in Portainer',
						routing: {
							request: {
								method: 'GET',
								url: '/settings',
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update settings',
						description: 'Update settings in Portainer',
						routing: {
							request: {
								method: 'PUT',
								url: '/settings',
								body: {
									LogoURL: '={{$parameter["logoUrl"] || ""}}',
									BlackListedLabels: '={{$parameter["blacklistedLabels"] ? $parameter["blacklistedLabels"].split(",") : []}}',
									AuthenticationMethod: '={{parseInt($parameter["authMethod"]) || 1}}',
									InternalAuthSettings: {
										RequiredPasswordLength: '={{parseInt($parameter["passwordLength"]) || 8}}',
									},
									AllowContainerCapabilitiesForRegularUsers: '={{$parameter["allowCapabilities"] || false}}',
									AllowDeviceMappingForRegularUsers: '={{$parameter["allowDeviceMapping"] || false}}',
									AllowStackManagementForRegularUsers: '={{$parameter["allowStackManagement"] || true}}',
									AllowBindMountsForRegularUsers: '={{$parameter["allowBindMounts"] || false}}',
									AllowPrivilegedModeForRegularUsers: '={{$parameter["allowPrivilegedMode"] || false}}',
									AllowHostNamespaceForRegularUsers: '={{$parameter["allowHostNamespace"] || false}}',
									SnapshotInterval: '={{$parameter["snapshotInterval"] || "5m"}}',
									EnableEdgeComputeFeatures: '={{$parameter["enableEdgeCompute"] || false}}',
									UserSessionTimeout: '={{$parameter["sessionTimeout"] || "8h"}}',
								},
							},
						},
					},
				],
				default: 'get',
			},

			// ===========================================
			// WEBHOOKS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['webhooks'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create webhook',
						description: 'Create a new webhook',
						routing: {
							request: {
								method: 'POST',
								url: '/webhooks',
								body: {
									ResourceID: '={{$parameter["resourceId"]}}',
									EndpointID: '={{parseInt($parameter["environmentId"])}}',
									WebhookType: '={{parseInt($parameter["webhookType"])}}',
								},
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete webhook',
						description: 'Delete a webhook',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/webhooks/{{$parameter["webhookId"]}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List webhooks',
						description: 'Retrieve all webhooks',
						routing: {
							request: {
								method: 'GET',
								url: '/webhooks',
								qs: {
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// SYSTEM OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['system'],
					},
				},
				options: [
					{
						name: 'Get Status',
						value: 'getStatus',
						action: 'Get status',
						description: 'Get system status',
						routing: {
							request: {
								method: 'GET',
								url: '/status',
							},
						},
					},
					{
						name: 'Get Version',
						value: 'getVersion',
						action: 'Get version',
						description: 'Get Portainer version',
						routing: {
							request: {
								method: 'GET',
								url: '/system/version',
							},
						},
					},
					{
						name: 'Get Nodes',
						value: 'getNodes',
						action: 'Get nodes',
						description: 'Get node information',
						routing: {
							request: {
								method: 'GET',
								url: '/system/nodes',
							},
						},
					},
				],
				default: 'getStatus',
			},

			// ===========================================
			// EDGE GROUPS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['edgeGroups'],
					},
				},
							options: [
				{
					name: 'Create',
					value: 'create',
					action: 'Create edge group',
					description: 'Create a new edge computing group',
					routing: {
						request: {
							method: 'POST',
							url: '/edge_groups',
							body: {
								Name: '={{$parameter["edgeGroupName"]}}',
								Dynamic: '={{$parameter["isDynamic"] || false}}',
								TagIds: '={{$parameter["tagIds"] ? $parameter["tagIds"].split(",").map(id => parseInt(id.trim())) : []}}',
								Endpoints: '={{$parameter["endpointIds"] ? $parameter["endpointIds"].split(",").map(id => parseInt(id.trim())) : []}}',
							},
						},
					},
				},
				{
					name: 'Delete',
					value: 'delete',
					action: 'Delete edge group',
					description: 'Delete a edge computing group',
					routing: {
						request: {
							method: 'DELETE',
							url: '=/edge_groups/{{$parameter["edgeGroupId"]}}',
						},
					},
				},
				{
					name: 'Get',
					value: 'get',
					action: 'Get edge group',
					description: 'Get a edge computing group by ID',
					routing: {
						request: {
							method: 'GET',
							url: '=/edge_groups/{{$parameter["edgeGroupId"]}}',
						},
					},
				},
				{
					name: 'Get Many',
					value: 'getMany',
					action: 'List edge groups',
					description: 'Retrieve all edge computing groups',
					routing: {
						request: {
							method: 'GET',
							url: '/edge_groups',
						},
					},
				},
				{
					name: 'Update',
					value: 'update',
					action: 'Update edge group',
					description: 'Update a edge computing group',
					routing: {
						request: {
							method: 'PUT',
							url: '=/edge_groups/{{$parameter["edgeGroupId"]}}',
							body: {
								Name: '={{$parameter["edgeGroupName"]}}',
								Dynamic: '={{$parameter["isDynamic"] || false}}',
								TagIds: '={{$parameter["tagIds"] ? $parameter["tagIds"].split(",").map(id => parseInt(id.trim())) : []}}',
								Endpoints: '={{$parameter["endpointIds"] ? $parameter["endpointIds"].split(",").map(id => parseInt(id.trim())) : []}}',
							},
						},
					},
				},
			],
				default: 'getMany',
			},

			// ===========================================
			// EDGE STACKS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create edge stack',
						description: 'Create a new edge computing stack',
						routing: {
							request: {
								method: 'POST',
								url: '/edge_stacks',
								body: {
									Name: '={{$parameter["edgeStackName"]}}',
									StackFileContent: '={{$parameter["stackFileContent"]}}',
									EdgeGroups: '={{$parameter["edgeGroupIds"] ? $parameter["edgeGroupIds"].split(",").map(id => parseInt(id.trim())) : []}}',
									DeploymentType: '={{parseInt($parameter["deploymentType"]) || 0}}',
									PrePullImage: '={{$parameter["prePullImage"] || false}}',
									RetryDeploy: '={{$parameter["retryDeploy"] || false}}',
								},
							},
							send: {
								preSend: [envPreSendPairs('environmentVariables.envVar', ['Env'])],
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete edge stack',
						description: 'Delete a edge computing stack',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/edge_stacks/{{$parameter["edgeStackId"]}}',
							},
						},
					},
					{
					name: 'Get',
					value: 'get',
					action: 'Get edge stack',
					description: 'Get a edge computing stack by ID',
					routing: {
						request: {
							method: 'GET',
							url: '=/edge_stacks/{{$parameter["edgeStackId"]}}',
						},
					},
				},
				{
					name: 'Get Many',
					value: 'getMany',
					action: 'List edge stacks',
					description: 'Retrieve all edge computing stacks',
					routing: {
						request: {
							method: 'GET',
							url: '/edge_stacks',
						},
					},
				},
				{
					name: 'Get Status',
					value: 'getStatus',
					action: 'Get edge stack status',
					description: 'Get edge stack deployment status',
					routing: {
						request: {
							method: 'GET',
							url: '=/edge_stacks/{{$parameter["edgeStackId"]}}/status',
						},
					},
				},
					{
						name: 'Update',
						value: 'update',
						action: 'Update edge stack',
						description: 'Update a edge computing stack',
						routing: {
							request: {
								method: 'PUT',
								url: '=/edge_stacks/{{$parameter["edgeStackId"]}}',
								body: {
									StackFileContent: '={{$parameter["stackFileContent"]}}',
									EdgeGroups: '={{$parameter["edgeGroupIds"] ? $parameter["edgeGroupIds"].split(",").map(id => parseInt(id.trim())) : []}}',
									PrePullImage: '={{$parameter["prePullImage"] || false}}',
									RetryDeploy: '={{$parameter["retryDeploy"] || false}}',
									Prune: '={{$parameter["prune"] || false}}',
								},
							},
							send: {
								preSend: [envPreSendPairs('environmentVariables.envVar', ['Env'])],
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// CONTAINERS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['containers'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create container',
						description: 'Create a new container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/create',
								qs: {
									name: '={{$parameter["containerName"] || undefined}}',
								},
								body: {
									Image: '={{$parameter["image"]}}',
									Cmd: '={{$parameter["command"] ? $parameter["command"].split(" ") : undefined}}',
									ExposedPorts: '={{$parameter["exposedPorts"] ? Object.fromEntries($parameter["exposedPorts"].split(",").map(port => [port.trim() + "/tcp", {}])) : undefined}}',
									HostConfig: {
										PortBindings: '={{$parameter["portBindings"] ? Object.fromEntries($parameter["portBindings"].split(",").map(binding => { const [container, host] = binding.split(":"); return [container.trim() + "/tcp", [{ HostPort: host.trim() }]]; })) : undefined}}',
										RestartPolicy: {
											Name: '={{$parameter["restartPolicy"] || "no"}}',
										},
									},
								},
							},
							send: {
								preSend: [envPreSendStrings('environmentVariables.envVar', ['Env'])],
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete container',
						description: 'Delete a container',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}',
								qs: {
									force: '={{$parameter["forceDelete"] || false}}',
									v: '={{$parameter["removeVolumes"] || false}}',
								},
							},
						},
					},
					{
						name: 'Exec',
						value: 'exec',
						action: 'Execute command',
						description: 'Execute a command in the container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/exec',
								body: {
									AttachStdout: true,
									AttachStderr: true,
									Cmd: '={{$parameter["execCommand"].split(" ")}}',
									Tty: '={{$parameter["tty"] || false}}',
								},
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get container',
						description: 'Get a container by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/json',
							},
						},
					},
					{
						name: 'Get Logs',
						value: 'getLogs',
						action: 'Get logs',
						description: 'Get logs for the container',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/logs',
								qs: {
									stdout: '={{$parameter["includeStdout"] || true}}',
									stderr: '={{$parameter["includeStderr"] || true}}',
									tail: '={{$parameter["tailLines"] || "all"}}',
									timestamps: '={{$parameter["timestamps"] || false}}',
								},
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List containers',
						description: 'Retrieve multiple containers',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/json',
								qs: {
									all: '={{$parameter["includeAll"] || true}}',
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Get Stats',
						value: 'getStats',
						action: 'Get stats',
						description: 'Get container usage statistics',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/stats',
								qs: {
									stream: false,
								},
							},
						},
					},
					{
						name: 'Inspect',
						value: 'inspect',
						action: 'Inspect container',
						description: 'Inspect details of the container',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/json',
							},
						},
					},
					{
						name: 'Pause',
						value: 'pause',
						action: 'Pause container',
						description: 'Pause a running container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/pause',
							},
						},
					},
					{
						name: 'Restart',
						value: 'restart',
						action: 'Restart container',
						description: 'Restart a container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/restart',
								qs: {
									t: '={{$parameter["timeout"] || 10}}',
								},
							},
						},
					},
					{
						name: 'Start',
						value: 'start',
						action: 'Start container',
						description: 'Start a stopped container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/start',
							},
						},
					},
					{
						name: 'Stop',
						value: 'stop',
						action: 'Stop container',
						description: 'Stop a running container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/stop',
								qs: {
									t: '={{$parameter["timeout"] || 10}}',
								},
							},
						},
					},
					{
						name: 'Unpause',
						value: 'unpause',
						action: 'Unpause container',
						description: 'Unpause a paused container',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/containers/{{$parameter["containerId"]}}/unpause',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// ENVIRONMENTS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['environments'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List environments',
						description: 'Retrieve all environments available',
						routing: {
							request: {
								method: 'GET',
								url: '/endpoints',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get environment',
						description: 'Get a environment by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// STACKS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['stacks'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List stacks',
						description: 'Retrieve all stacks',
						routing: {
							request: {
								method: 'GET',
								url: '/stacks',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get stack',
						description: 'Get a stack by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/stacks/{{$parameter["stackId"]}}',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete stack',
						description: 'Delete a stack',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/stacks/{{$parameter["stackId"]}}',
								qs: {
									endpointId: '={{$parameter["environmentId"]}}',
								},
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update stack',
						description: 'Update an existing stack',
						routing: {
							request: {
								method: 'PUT',
								url: '=/stacks/{{$parameter["stackId"]}}',
								qs: {
									endpointId: '={{$parameter["environmentId"]}}',
								},
								body: {
									stackFileContent: '={{$parameter["stackFileContent"] || undefined}}',
									prune: '={{$parameter["prune"] || false}}',
								},
							},
							send: {
								preSend: [envPreSendPairs('env.envVar', ['env'])],
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// IMAGES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['images'],
					},
				},
				options: [
					{
						name: 'Build',
						value: 'build',
						action: 'Build image',
						description: 'Build an image from a Dockerfile',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/build',
								qs: {
									t: '={{$parameter["imageTag"]}}',
									dockerfile: '={{$parameter["dockerfileName"] || "Dockerfile"}}',
									rm: '={{$parameter["removeIntermediateContainers"] || true}}',
								},
								body: '={{$parameter["buildContext"]}}',
								headers: {
									'Content-Type': 'application/x-tar',
								},
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete image',
						description: 'Delete an image',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/{{$parameter["imageId"]}}',
								qs: {
									force: '={{$parameter["forceDelete"] || false}}',
									noprune: '={{$parameter["noprune"] || false}}',
								},
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get image',
						description: 'Get an image by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/{{$parameter["imageId"]}}/json',
							},
						},
					},
					{
						name: 'Get History',
						value: 'getHistory',
						action: 'Get history',
						description: 'Get image history',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/{{$parameter["imageId"]}}/history',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List images',
						description: 'Retrieve all images',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/json',
								qs: {
									all: '={{$parameter["includeAll"] || false}}',
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Inspect',
						value: 'inspect',
						action: 'Inspect image',
						description: 'Inspect details of the image',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/{{$parameter["imageId"]}}/json',
							},
						},
					},
					{
						name: 'Pull',
						value: 'pull',
						action: 'Pull image',
						description: 'Pull an image from a registry',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/create',
								qs: {
									fromImage: '={{$parameter["imageName"]}}',
									tag: '={{$parameter["imageTag"] || "latest"}}',
								},
								headers: {
									'X-Registry-Auth': '={{$parameter["registryAuth"] || ""}}',
								},
							},
						},
					},
					{
						name: 'Push',
						value: 'push',
						action: 'Push image',
						description: 'Push an image to a registry',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/{{$parameter["imageId"]}}/push',
								qs: {
									tag: '={{$parameter["imageTag"] || "latest"}}',
								},
								headers: {
									'X-Registry-Auth': '={{$parameter["registryAuth"] || ""}}',
								},
							},
						},
					},
					{
						name: 'Tag',
						value: 'tag',
						action: 'Tag image',
						description: 'Create a tag for an image',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/images/{{$parameter["imageId"]}}/tag',
								qs: {
									repo: '={{$parameter["repository"]}}',
									tag: '={{$parameter["newTag"]}}',
								},
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// VOLUMES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['volumes'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List volumes',
						description: 'Retrieve all volumes',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/volumes',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete volume',
						description: 'Delete a volume',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/volumes/{{$parameter["volumeName"]}}',
								qs: {
									force: '={{$parameter["forceDelete"] || false}}',
								},
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// NETWORKS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['networks'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List networks',
						description: 'Retrieve all networks',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/networks',
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete network',
						description: 'Delete a network',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/networks/{{$parameter["networkId"]}}',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// USERS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['users'],
					},
				},
				options: [
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List users',
						description: 'Retrieve all users',
						routing: {
							request: {
								method: 'GET',
								url: '/users',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get user',
						description: 'Get a user by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/users/{{$parameter["userId"]}}',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// SERVICES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['services'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create service',
						description: 'Create a new Docker Swarm service',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services/create',
								body: {
									Name: '={{$parameter["serviceName"]}}',
									TaskTemplate: {
										ContainerSpec: {
											Image: '={{$parameter["image"]}}',
											Args: '={{$parameter["args"] ? $parameter["args"].split(" ") : undefined}}',
										},
										RestartPolicy: {
											Condition: '={{$parameter["restartCondition"] || "any"}}',
										},
									},
									Mode: {
										Replicated: {
											Replicas: '={{parseInt($parameter["replicas"]) || 1}}',
										},
									},
									EndpointSpec: {
										Ports: '={{$parameter["ports"] ? $parameter["ports"].split(",").map(port => { const [published, target] = port.split(":"); return { Protocol: "tcp", PublishedPort: parseInt(published.trim()), TargetPort: parseInt(target.trim()) }; }) : undefined}}',
									},
								},
							},
							send: {
								preSend: [envPreSendStrings('environmentVariables.envVar', ['TaskTemplate', 'ContainerSpec', 'Env'])],
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete service',
						description: 'Delete a Docker Swarm service',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services/{{$parameter["serviceId"]}}',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get service',
						description: 'Get a service by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services/{{$parameter["serviceId"]}}',
							},
						},
					},
					{
						name: 'Get Logs',
						value: 'getLogs',
						action: 'Get logs',
						description: 'Get logs for the service',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services/{{$parameter["serviceId"]}}/logs',
								qs: {
									stdout: '={{$parameter["includeStdout"] || true}}',
									stderr: '={{$parameter["includeStderr"] || true}}',
									tail: '={{$parameter["tailLines"] || "all"}}',
									timestamps: '={{$parameter["timestamps"] || false}}',
								},
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List services',
						description: 'Retrieve all Docker Swarm services',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services',
								qs: {
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Scale',
						value: 'scale',
						action: 'Escalar service',
						description: 'Scale a Docker Swarm service',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services/{{$parameter["serviceId"]}}/update',
								qs: {
									version: '={{$parameter["version"]}}',
								},
								body: {
									Mode: {
										Replicated: {
											Replicas: '={{parseInt($parameter["replicas"])}}',
										},
									},
								},
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update service',
						description: 'Update a Docker Swarm service',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/services/{{$parameter["serviceId"]}}/update',
								qs: {
									version: '={{$parameter["version"]}}',
								},
								body: {
									TaskTemplate: {
										ContainerSpec: {
											Image: '={{$parameter["image"]}}',
										},
									},
								},
							},
							send: {
								preSend: [envPreSendStrings('environmentVariables.envVar', ['TaskTemplate', 'ContainerSpec', 'Env'])],
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// SECRETS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['secrets'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create secret',
						description: 'Create a new secret Docker Swarm',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/secrets/create',
								body: {
									Name: '={{$parameter["secretName"]}}',
									Data: '={{Buffer.from($parameter["secretData"], "utf8").toString("base64")}}',
									Labels: '={{$parameter["labels"] ? JSON.parse($parameter["labels"]) : undefined}}',
								},
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete secret',
						description: 'Delete a secret Docker Swarm',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/secrets/{{$parameter["secretId"]}}',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get secret',
						description: 'Get a secret by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/secrets/{{$parameter["secretId"]}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List secrets',
						description: 'Retrieve all Docker Swarm secrets',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/secrets',
								qs: {
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Inspect',
						value: 'inspect',
						action: 'Inspect secret',
						description: 'Inspect details of the secret',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/secrets/{{$parameter["secretId"]}}',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// CONFIGS OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['configs'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						action: 'Create config',
						description: 'Create a new config Docker Swarm',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/configs/create',
								body: {
									Name: '={{$parameter["configName"]}}',
									Data: '={{Buffer.from($parameter["configData"], "utf8").toString("base64")}}',
									Labels: '={{$parameter["labels"] ? JSON.parse($parameter["labels"]) : undefined}}',
								},
							},
						},
					},
					{
						name: 'Delete',
						value: 'delete',
						action: 'Delete config',
						description: 'Delete a config Docker Swarm',
						routing: {
							request: {
								method: 'DELETE',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/configs/{{$parameter["configId"]}}',
							},
						},
					},
					{
						name: 'Get',
						value: 'get',
						action: 'Get config',
						description: 'Get a config by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/configs/{{$parameter["configId"]}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List configs',
						description: 'Retrieve all configs Docker Swarm',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/configs',
								qs: {
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Inspect',
						value: 'inspect',
						action: 'Inspect config',
						description: 'Inspect details of the config',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/configs/{{$parameter["configId"]}}',
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// NODES OPERATIONS
			// ===========================================
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['nodes'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get node',
						description: 'Get a node by ID',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/nodes/{{$parameter["nodeId"]}}',
							},
						},
					},
					{
						name: 'Get Many',
						value: 'getMany',
						action: 'List nodes',
						description: 'Retrieve all nodes Docker Swarm',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/nodes',
								qs: {
									filters: '={{$parameter["filters"] || undefined}}',
								},
							},
						},
					},
					{
						name: 'Inspect',
						value: 'inspect',
						action: 'Inspect node',
						description: 'Inspect details of the node',
						routing: {
							request: {
								method: 'GET',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/nodes/{{$parameter["nodeId"]}}',
							},
						},
					},
					{
						name: 'Update',
						value: 'update',
						action: 'Update node',
						description: 'Update a node Docker Swarm',
						routing: {
							request: {
								method: 'POST',
								url: '=/endpoints/{{$parameter["environmentId"]}}/docker/nodes/{{$parameter["nodeId"]}}/update',
								qs: {
									version: '={{$parameter["version"]}}',
								},
								body: {
									Role: '={{$parameter["role"]}}',
									Availability: '={{$parameter["availability"]}}',
									Labels: '={{$parameter["labels"] ? JSON.parse($parameter["labels"]) : undefined}}',
								},
							},
						},
					},
				],
				default: 'getMany',
			},

			// ===========================================
			// COMMON PARAMETERS
			// ===========================================
			{
				displayName: 'Environment ID',
				name: 'environmentId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['containers', 'images', 'volumes', 'networks', 'stacks', 'services', 'secrets', 'configs', 'nodes'],
						operation: ['getMany', 'get', 'start', 'stop', 'restart', 'delete', 'update', 'create', 'exec', 'getLogs', 'getStats', 'inspect', 'pause', 'unpause', 'build', 'pull', 'push', 'tag', 'getHistory', 'scale'],
					},
				},
				default: '1',
				description: 'The ID of the environment/endpoint in Portainer',
				placeholder: '1',
			},
			{
				displayName: 'Container ID',
				name: 'containerId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['get', 'start', 'stop', 'restart', 'delete', 'exec', 'getLogs', 'getStats', 'inspect', 'pause', 'unpause'],
					},
				},
				default: '',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'Stack ID',
				name: 'stackId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['stacks'],
						operation: ['get', 'delete', 'update'],
					},
				},
				default: '',
				description: 'The ID of the stack',
				placeholder: '1',
			},
			{
				displayName: 'Image ID',
				name: 'imageId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['images'],
						operation: ['delete', 'get', 'getHistory', 'inspect', 'push', 'tag'],
					},
				},
				default: '',
				description: 'The ID of the image',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'Volume Name',
				name: 'volumeName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['volumes'],
						operation: ['delete'],
					},
				},
				default: '',
				description: 'The name of the volume',
				placeholder: 'my_volume',
			},
			{
				displayName: 'Network ID',
				name: 'networkId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['networks'],
						operation: ['delete'],
					},
				},
				default: '',
				description: 'The ID of the network',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'User ID',
				name: 'userId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['users'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'The ID of the user',
				placeholder: '1',
			},
			{
				displayName: 'Service ID',
				name: 'serviceId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['services'],
						operation: ['get', 'delete', 'getLogs', 'scale', 'update'],
					},
				},
				default: '',
				description: 'The ID of the Docker Swarm service',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'Secret ID',
				name: 'secretId',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				displayOptions: {
					show: {
						resource: ['secrets'],
						operation: ['get', 'delete', 'inspect'],
					},
				},
				default: '',
				description: 'The ID of the Docker Swarm secret',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'Config ID',
				name: 'configId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['configs'],
						operation: ['get', 'delete', 'inspect'],
					},
				},
				default: '',
				description: 'The ID of the Docker Swarm config',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'Node ID',
				name: 'nodeId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['nodes'],
						operation: ['get', 'inspect', 'update'],
					},
				},
				default: '',
				description: 'The ID of the node Docker Swarm',
				placeholder: 'abc123def456',
			},
			{
				displayName: 'Template ID',
				name: 'templateId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['templates'],
						operation: ['get'],
					},
				},
				default: '',
				description: 'The ID of the template',
				placeholder: '1',
			},
			{
				displayName: 'Registry ID',
				name: 'registryId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['registries'],
						operation: ['get', 'delete', 'update'],
					},
				},
				default: '',
				description: 'The ID of the registry',
				placeholder: '1',
			},
			{
				displayName: 'Team ID',
				name: 'teamId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['teams'],
						operation: ['get', 'delete', 'update'],
					},
				},
				default: '',
				description: 'The ID of the team',
				placeholder: '1',
			},
			{
				displayName: 'Webhook ID',
				name: 'webhookId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['webhooks'],
						operation: ['delete'],
					},
				},
				default: '',
				description: 'The ID of the webhook',
				placeholder: '1',
			},

			// ===========================================
			// ADDITIONAL OPTIONS
			// ===========================================
			{
				displayName: 'Include All',
				name: 'includeAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['getMany'],
					},
				},
				default: true,
				description: 'Whether to include stopped containers in the listing',
			},
			{
				displayName: 'Force Delete',
				name: 'forceDelete',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['delete'],
					},
				},
				default: false,
				description: 'Whether to force deletion even if the resource is in use',
			},
			{
				displayName: 'Remove Volumes',
				name: 'removeVolumes',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['delete'],
					},
				},
				default: false,
				description: 'Whether to remove associated volumes when deleting container',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['restart', 'stop'],
					},
				},
				default: 10,
				description: 'Number of seconds to wait before forcefully stopping',
			},

			// ===========================================
			// CONTAINER CREATION PARAMETERS
			// ===========================================
			{
				displayName: 'Container Name',
				name: 'containerName',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['create'],
					},
				},
				default: '',
			},
			{
				displayName: 'Image',
				name: 'image',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['containers', 'services'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Docker image to use',
				placeholder: 'nginx:latest',
			},
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Command to execute in the container',
			},
			{
				displayName: 'Environment Variables',
				name: 'environmentVariables',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['containers', 'services'],
						operation: ['create', 'update'],
					},
				},
				default: {},
				options: [
					{
						name: 'envVar',
						displayName: 'Environment Variable',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Variable name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Variable value',
							},
						],
					},
				],
			},
			{
				displayName: 'Exposed Ports',
				name: 'exposedPorts',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Exposed ports (comma-separated)',
				placeholder: '80,443',
			},
			{
				displayName: 'Port Bindings',
				name: 'portBindings',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Port mapping in the format container:host',
				placeholder: '80:8080,443:8443',
			},
			{
				displayName: 'Restart Policy',
				name: 'restartPolicy',
				type: 'options',
				options: [
					{ name: 'No', value: 'no' },
					{ name: 'Always', value: 'always' },
					{ name: 'Unless Stopped', value: 'unless-stopped' },
					{ name: 'On Failure', value: 'on-failure' },
				],
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['create'],
					},
				},
				default: 'no',
			},

			// ===========================================
			// EXEC COMMAND PARAMETERS
			// ===========================================
			{
				displayName: 'Exec Command',
				name: 'execCommand',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['exec'],
					},
				},
				default: '/bin/sh',
				description: 'Command to execute in the container',
			},
			{
				displayName: 'TTY',
				name: 'tty',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['containers'],
						operation: ['exec'],
					},
				},
				default: false,
				description: 'Whether to allocate a pseudo-TTY',
			},

			// ===========================================
			// LOGS PARAMETERS
			// ===========================================
			{
				displayName: 'Include Stdout',
				name: 'includeStdout',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['containers', 'services'],
						operation: ['getLogs'],
					},
				},
				default: true,
				description: 'Whether to include stdout in logs',
			},
			{
				displayName: 'Include Stderr',
				name: 'includeStderr',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['containers', 'services'],
						operation: ['getLogs'],
					},
				},
				default: true,
				description: 'Whether to include stderr in logs',
			},
			{
				displayName: 'Tail Lines',
				name: 'tailLines',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['containers', 'services'],
						operation: ['getLogs'],
					},
				},
				default: 'all',
				description: 'Number of lines from the end (or "all")',
			},
			{
				displayName: 'Timestamps',
				name: 'timestamps',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['containers', 'services'],
						operation: ['getLogs'],
					},
				},
				default: false,
				description: 'Whether to show timestamps in logs',
			},

			// ===========================================
			// IMAGE PARAMETERS
			// ===========================================
			{
				displayName: 'Image Tag',
				name: 'imageTag',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['images'],
						operation: ['build', 'pull', 'push'],
					},
				},
				default: 'latest',
			},
			{
				displayName: 'Image Name',
				name: 'imageName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['images'],
						operation: ['pull'],
					},
				},
				default: '',
				description: 'Image name to pull',
				placeholder: 'nginx',
			},
			{
				displayName: 'Repository',
				name: 'repository',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['images'],
						operation: ['tag'],
					},
				},
				default: '',
				description: 'Repository name',
			},
			{
				displayName: 'New Tag',
				name: 'newTag',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['images'],
						operation: ['tag'],
					},
				},
				default: '',
				description: 'New tag for the image',
			},

			// ===========================================
			// SERVICE PARAMETERS
			// ===========================================
			{
				displayName: 'Service Name',
				name: 'serviceName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['services'],
						operation: ['create'],
					},
				},
				default: '',
			},
			{
				displayName: 'Replicas',
				name: 'replicas',
				type: 'number',
				displayOptions: {
					show: {
						resource: ['services'],
						operation: ['create', 'scale'],
					},
				},
				default: 1,
				description: 'Number of replicas',
			},
			{
				displayName: 'Version',
				name: 'version',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['services', 'nodes'],
						operation: ['scale', 'update'],
					},
				},
				default: 0,
				description: 'Object version for update',
			},

			// ===========================================
			// SECRET AND CONFIG PARAMETERS
			// ===========================================
			{
				displayName: 'Secret Name',
				name: 'secretName',
				type: 'string',
				typeOptions: { password: true },
				required: true,
				displayOptions: {
					show: {
						resource: ['secrets'],
						operation: ['create'],
					},
				},
				default: '',
			},
			{
				displayName: 'Secret Data',
				name: 'secretData',
				type: 'string',
				typeOptions: {
					rows: 4,
					password: true,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['secrets'],
						operation: ['create'],
					},
				},
				default: '',
			},
			{
				displayName: 'Config Name',
				name: 'configName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['configs'],
						operation: ['create'],
					},
				},
				default: '',
			},
			{
				displayName: 'Config Data',
				name: 'configData',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['configs'],
						operation: ['create'],
					},
				},
				default: '',
			},

			// ===========================================
			// REGISTRY PARAMETERS
			// ===========================================
			{
				displayName: 'Registry Name',
				name: 'registryName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['registries'],
						operation: ['create', 'update'],
					},
				},
				default: '',
			},
			{
				displayName: 'Registry URL',
				name: 'registryUrl',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['registries'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'URL of the registry',
			},
			{
				displayName: 'Registry Type',
				name: 'registryType',
				type: 'options',
				options: [
					{ name: 'Quay.io', value: '1' },
					{ name: 'Azure', value: '2' },
					{ name: 'Custom', value: '3' },
					{ name: 'Gitlab', value: '4' },
					{ name: 'ProGet', value: '5' },
					{ name: 'DockerHub', value: '6' },
					{ name: 'ECR', value: '7' },
				],
				displayOptions: {
					show: {
						resource: ['registries'],
						operation: ['create'],
					},
				},
				default: '3',
				description: 'Type of the registry',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['registries'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Username for the registry',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: {
					password: true,
				},
				displayOptions: {
					show: {
						resource: ['registries'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Password for the registry',
			},

			// ===========================================
			// TEAM PARAMETERS
			// ===========================================
			{
				displayName: 'Team Name',
				name: 'teamName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['teams'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Name of the team',
			},

			// ===========================================
			// EDGE GROUP PARAMETERS
			// ===========================================
			{
				displayName: 'Edge Group ID',
				name: 'edgeGroupId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['edgeGroups'],
						operation: ['get', 'delete', 'update'],
					},
				},
				default: '',
				description: 'Edge computing group ID',
			},
			{
				displayName: 'Edge Group Name',
				name: 'edgeGroupName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['edgeGroups'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Name of the edge computing group',
			},
			{
				displayName: 'Is Dynamic',
				name: 'isDynamic',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['edgeGroups'],
						operation: ['create', 'update'],
					},
				},
				default: false,
				description: 'Whether the group is dynamic (tag-based)',
			},
			{
				displayName: 'Tag IDs',
				name: 'tagIds',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['edgeGroups'],
						operation: ['create', 'update'],
						isDynamic: [true],
					},
				},
				default: '',
				description: 'Tag IDs for the dynamic group (comma-separated)',
				placeholder: '1,2,3',
			},
			{
				displayName: 'Endpoint IDs',
				name: 'endpointIds',
				type: 'string',
				displayOptions: {
					show: {
						resource: ['edgeGroups'],
						operation: ['create', 'update'],
						isDynamic: [false],
					},
				},
				default: '',
				description: 'Endpoint IDs for the static group (comma-separated)',
				placeholder: '1,2,3',
			},

			// ===========================================
			// EDGE STACK PARAMETERS
			// ===========================================
			{
				displayName: 'Edge Stack ID',
				name: 'edgeStackId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['get', 'delete', 'update', 'getStatus'],
					},
				},
				default: '',
				description: 'Edge computing stack ID',
			},
			{
				displayName: 'Edge Stack Name',
				name: 'edgeStackName',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create'],
					},
				},
				default: '',
				description: 'Name of the edge computing stack',
			},
			{
				displayName: 'Edge Group IDs',
				name: 'edgeGroupIds',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Edge group IDs where the stack will be deployed (comma-separated)',
				placeholder: '1,2,3',
			},
			{
				displayName: 'Deployment Type',
				name: 'deploymentType',
				type: 'options',
				options: [
					{ name: 'Docker Compose', value: '0' },
					{ name: 'Docker Swarm', value: '1' },
					{ name: 'Kubernetes', value: '2' },
				],
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create'],
					},
				},
				default: '0',
				description: 'Tipo de deployment',
			},
			{
				displayName: 'Pre Pull Image',
				name: 'prePullImage',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create', 'update'],
					},
				},
				default: false,
				description: 'Whether to pre-pull images before deployment',
			},
			{
				displayName: 'Retry Deploy',
				name: 'retryDeploy',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create', 'update'],
					},
				},
				default: false,
				description: 'Whether retentar deployment em caso de falha',
			},
			{
				displayName: 'Stack File Content',
				name: 'stackFileContent',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				required: true,
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create', 'update'],
					},
				},
				default: '',
				description: 'Contents of the docker-compose.yml file or stack file',
				placeholder: 'version: "3.8"\nservices:\n  web:\n    image: nginx:latest',
			},
			{
				displayName: 'Environment Variables',
				name: 'environmentVariables',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['edgeStacks'],
						operation: ['create', 'update'],
					},
				},
				default: {},
				options: [
					{
						name: 'envVar',
						displayName: 'Environment Variable',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Environment variable name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Environment variable value',
							},
						],
					},
				],
				description: 'Environment variables for the edge stack',
			},

			// ===========================================
			// WEBHOOK PARAMETERS
			{
				displayName: 'Resource ID',
				name: 'resourceId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['webhooks'],
						operation: ['create'],
					},
				},
				default: '',
			},
			{
				displayName: 'Webhook Type',
				name: 'webhookType',
				type: 'options',
				options: [
					{ name: 'Service', value: '1' },
					{ name: 'Stack', value: '2' },
				],
				displayOptions: {
					show: {
						resource: ['webhooks'],
						operation: ['create'],
					},
				},
				default: '2',
				description: 'Type of the webhook',
			},

			// ===========================================
			// STACK UPDATE PARAMETERS
			// ===========================================
			{
				displayName: 'Stack File Content',
				name: 'stackFileContent',
				type: 'string',
				typeOptions: {
					rows: 10,
				},
				displayOptions: {
					show: {
						resource: ['stacks'],
						operation: ['update'],
					},
				},
				default: '',
				description: 'Contents of the docker-compose.yml file or stack file',
				placeholder: 'version: "3.8"\nservices:\n  web:\n    image: nginx:latest',
			},
			{
				displayName: 'Environment Variables',
				name: 'env',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				displayOptions: {
					show: {
						resource: ['stacks'],
						operation: ['update'],
					},
				},
				default: {},
				options: [
					{
						name: 'envVar',
						displayName: 'Environment Variable',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: '',
								description: 'Environment variable name',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'Environment variable value',
							},
						],
					},
				],
				description: 'Environment variables for the stack',
			},
			{
				displayName: 'Prune Services',
				name: 'prune',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['stacks'],
						operation: ['update'],
					},
				},
				default: false,
				description: 'Whether to prune services that are no longer referenced',
			},
		],
	};
}
