<template>
	<span class="display-name-content">
		<span
			v-for="(segment, index) in segments"
			:key="`${segment.type}-${index}`"
			class="display-name-segment">
			<img
				v-if="segment.type === 'emoji'"
				:src="segment.url"
				:alt="`:${segment.shortcode}:`"
				:title="`:${segment.shortcode}:`"
				:data-original="segment.url"
				:data-static="segment.staticUrl"
				class="emojione custom-emoji"
				draggable="false"
				width="16"
				height="16"
				@error="useMissingEmoji" />
			<span v-else v-text="segment.text"></span>
		</span>
	</span>
</template>

<script type="text/javascript">
	const SHORTCODE_PATTERN = /^[A-Za-z0-9_+-]{1,64}$/;
	const SHORTCODE_TOKEN_PATTERN = /:([A-Za-z0-9_+-]{1,64}):/g;
	const MISSING_EMOJI_URL = '/storage/emoji/missing.png';

	export default {
		name: 'DisplayName',

		props: {
			profile: {
				type: Object,
				required: true
			},

			emojis: {
				type: Array,
				default: () => []
			}
		},

		computed: {
			displayName() {
				const displayName = typeof this.profile.display_name === 'string'
					? this.profile.display_name.trim()
					: '';
				const username = typeof this.profile.username === 'string'
					? this.profile.username
					: '';
				return displayName || username;
			},

			emojiByShortcode() {
				const emojiByShortcode = new Map();
				for (const emoji of this.emojis) {
					const shortcode = typeof emoji?.shortcode === 'string' ? emoji.shortcode : '';
					const url = this.safeEmojiUrl(emoji?.url);
					if (!SHORTCODE_PATTERN.test(shortcode) || !url || emojiByShortcode.has(shortcode)) {
						continue;
					}
					emojiByShortcode.set(shortcode, {
						shortcode,
						url,
						staticUrl: this.safeEmojiUrl(emoji?.static_url) || url
					});
				}
				return emojiByShortcode;
			},

			segments() {
				const segments = [];
				let cursor = 0;
				let match;
				SHORTCODE_TOKEN_PATTERN.lastIndex = 0;

				while ((match = SHORTCODE_TOKEN_PATTERN.exec(this.displayName)) !== null) {
					const emoji = this.emojiByShortcode.get(match[1]);
					if (!emoji) {
						continue;
					}
					if (match.index > cursor) {
						segments.push({ type: 'text', text: this.displayName.slice(cursor, match.index) });
					}
					segments.push({ type: 'emoji', ...emoji });
					cursor = match.index + match[0].length;
				}

				if (cursor < this.displayName.length || segments.length === 0) {
					segments.push({ type: 'text', text: this.displayName.slice(cursor) });
				}
				return segments;
			}
		},

		methods: {
			safeEmojiUrl(value) {
				if (typeof value !== 'string' || !value.trim()) {
					return null;
				}
				try {
					const url = new URL(value, window.location.origin);
					const allowedProtocol = url.protocol === 'https:' || (url.protocol === 'http:' && url.origin === window.location.origin);
					if (allowedProtocol && !url.username && !url.password) {
						return url.href;
					}
				} catch (error) {
					return null;
				}
				return null;
			},

			useMissingEmoji(event) {
				const image = event.currentTarget;
				if (image && image.getAttribute('src') !== MISSING_EMOJI_URL) {
					image.removeAttribute('data-original');
					image.removeAttribute('data-static');
					image.setAttribute('src', MISSING_EMOJI_URL);
				}
			}
		}
	}
</script>

<style scoped>
	.display-name-content,
	.display-name-segment {
		display: inline;
	}

	.custom-emoji {
		display: inline-block;
		vertical-align: text-bottom;
	}
</style>
