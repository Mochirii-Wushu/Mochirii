<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="mobile-web-app-capable" content="yes">

	<title>{{ $title ?? config('mochirii-branding.display_name') }}</title>
	<link rel="manifest" href="{{url('/manifest.json')}}">

	<meta property="og:site_name" content="{{ config('mochirii-branding.display_name') }}">
	<meta property="og:title" content="{{ $title ?? config('mochirii-branding.display_name') }}">
	<meta property="og:type" content="article">
	<meta property="og:url" content="{{url(request()->url())}}">
	@stack('meta')

	<meta name="medium" content="image">
	<meta name="theme-color" content="#172a23">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<link rel="shortcut icon" type="image/png" href="{{url('/img/mochirii-icon.png?v=3')}}">
	<link rel="apple-touch-icon" type="image/png" href="{{url('/img/mochirii-icon.png?v=3')}}">
	<link rel="canonical" href="{{url(request()->url())}}">
	<link href="{{ mix('css/app.css') }}" rel="stylesheet" data-stylesheet="light">
	@stack('styles')
</head>
<body>
	@include('layouts.partial.nav')
	<main id="content">
		@yield('content')
	</main>
	@include('layouts.partial.footer')
	<script type="text/javascript" src="{{ mix('js/manifest.js') }}"></script>
	<script type="text/javascript" src="{{ mix('js/vendor.js') }}"></script>
	<script type="text/javascript" src="{{ mix('js/app.js') }}"></script>
	<script type="text/javascript" src="{{ mix('js/components.js') }}"></script>
	@stack('scripts')
</body>
</html>
