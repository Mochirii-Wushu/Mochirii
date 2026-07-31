<template>
	<span class="account-username">
		<span v-text="username"></span>
		<span v-if="remoteDomain" class="text-lighter font-weight-bold">
			<span v-if="remoteFormat === 'from'" class="font-weight-normal"> from </span>
			<span v-else-if="remoteFormat === 'custom'" v-text="customConnector"></span>
			<span v-else>@</span><span v-text="remoteDomain"></span>
		</span>
	</span>
</template>

<script type="text/javascript">
	export default {
		name: 'AccountUsername',

		props: {
			account: {
				type: Object,
				required: true
			}
		},

		computed: {
			username() {
				return typeof this.account.username === 'string' ? this.account.username : '';
			},

			remoteFormat() {
				const format = window.App?.config?.username?.remote?.format;
				return ['@', 'from', 'custom'].includes(format) ? format : '@';
			},

			customConnector() {
				const connector = window.App?.config?.username?.remote?.custom;
				return ` ${typeof connector === 'string' ? connector : ''} `;
			},

			remoteDomain() {
				if (this.account.local === true || typeof this.account.url !== 'string' || !this.account.url.trim()) {
					return '';
				}
				try {
					const url = new URL(this.account.url.trim(), window.location.origin);
					const allowedProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === window.location.origin);
					return allowedProtocol && !url.username && !url.password ? url.hostname : '';
				} catch (error) {
					return '';
				}
			}
		}
	}
</script>
