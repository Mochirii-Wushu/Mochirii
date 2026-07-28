@extends('layouts.blank')

@section('content')
<div class="container mt-5">
  <div class="col-12 px-0">
    <h1 class="h3 font-weight-bold">Privacy Policy</h1>
    <div class="card shadow-none">
      <div class="card-body p-md-5 text-justify mx-md-3">
        @include('site.partial.privacy-contract')
      </div>
    </div>
  </div>
</div>
@endsection

@push('meta')
<meta name="description" content="How Mōchirīī Social protects and uses guild member information.">
<meta property="og:description" content="How Mōchirīī Social protects and uses guild member information.">
@endpush

@push('styles')
<style type="text/css">
    body {
        background-color: #fff;
    }
</style>
@endpush
