@extends('layouts.app')

@section('content')
<div class="container mt-5">
  <div class="col-12">
    <p class="font-weight-bold text-lighter text-uppercase">Privacy Policy</p>
    <div class="card border shadow-none">
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
