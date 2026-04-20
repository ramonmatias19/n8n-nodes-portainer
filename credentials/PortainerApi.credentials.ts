import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PortainerApi implements ICredentialType {
	name = 'portainerApi';
	displayName = 'Portainer API';
	documentationUrl = 'https://docs.portainer.io/api/access';
	properties: INodeProperties[] = [
		{
			displayName: 'Portainer URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			required: true,
			description: 'URL of your Portainer server (e.g. https://portainer.example.com:9443)',
			placeholder: 'https://portainer.example.com:9443',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your Portainer API key. Get it from Settings > Access Tokens in your Portainer account.',
			placeholder: 'ptr_xxxxxxxxxxxxxxxxxxxxxxxx',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-API-Key': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/users/me',
			method: 'GET',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'Id',
					value: undefined,
					message: 'Invalid API key or server unreachable. Check the URL and the API key.',
				},
			},
		],
	};
} 