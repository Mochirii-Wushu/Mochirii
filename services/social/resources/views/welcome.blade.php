@extends('layouts.app')

@section('content')
    <div class="jumbotron jumbotron-fluid bg-pixelfed text-white my-0">
      <div class="container text-center my-5 py-5">
        <h1 class="display-4">{{ config('mochirii-branding.display_name') }}</h1>
        <p class="lead">{{ config('mochirii-branding.description') }}</p>
      </div>
    </div>
@endsection

@push('meta')
<meta property="og:description" content="{{ config('mochirii-branding.description') }}">
@endpush
