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
			description:
				'Full URL of your Portainer server including protocol and port. Examples: https://portainer.example.com:9443, http://192.168.1.10:9000. Must start with http:// or https://.',
			placeholder: 'https://portainer.example.com:9443',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Your Portainer API key. Get it from Settings > Access Tokens in your Portainer account.',
			placeholder: 'ptr_xxxxxxxxxxxxxxxxxxxxxxxx',
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'ignoreSsl',
			type: 'boolean',
			default: false,
			description:
				'Whether to connect even if SSL certificate validation fails. Enable this when your Portainer instance uses a self-signed certificate (common on port 9443).',
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
			method: 'GET',
			url: '={{$credentials.baseUrl.endsWith("/") ? $credentials.baseUrl.slice(0, -1) : $credentials.baseUrl}}/api/users/me',
			skipSslCertificateValidation: '={{$credentials.ignoreSsl}}',
		},
		rules: [
			{
				type: 'responseSuccessBody',
				properties: {
					key: 'Id',
					value: undefined,
					message:
						'Invalid API key or server unreachable. Check the URL, the API key, and (for self-signed certificates) enable "Ignore SSL Issues".',
				},
			},
		],
	};
}
