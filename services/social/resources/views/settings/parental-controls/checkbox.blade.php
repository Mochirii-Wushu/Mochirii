@php
$id = str_random(6) . '_' . str_slug($name);
@endphp<div class="custom-control custom-checkbox">
                <input type="checkbox" class="custom-control-input" id="{{$id}}" name="{{$name}}" @checked(isset($checked) && $checked)>
                <label class="custom-control-label pl-2" for="{{$id}}">{{ $title }}</label>
            </div>
