<?php

namespace App\Services;

use Stevebauman\Purify\Facades\Purify;

class SanitizeService
{
    public function purify($html)
    {
        $cleaned = Purify::clean($html);

        return $cleaned;
    }

    public function html($html)
    {
        return $this->richText($html);
    }

    public function richText($html): string
    {
        return $this->cleanHtmlWithSpacing((string) $html);
    }

    public function plainText($html): string
    {
        $plainText = strip_tags(Purify::clean((string) $html));

        return str_replace(["\r\n", "\r"], "\n", $plainText);
    }

    public function cssText($css): string
    {
        // This contains trusted administrator CSS inside a style element. It is
        // not a general-purpose CSS sanitizer.
        return str_replace('<', '\\3C ', (string) $css);
    }

    public function cleanHtmlWithSpacing($html)
    {
        $blockTags = ['a', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i', 'img', 'li', 'ol', 'p', 'pre', 's', 'strike', 'strong', 'u', 'ul'];

        foreach ($blockTags as $tag) {
            $html = preg_replace("/<\/{$tag}>/i", "</{$tag}> ", $html);
        }

        $html = preg_replace("/<br\s*\/?>/i", '<br /> ', $html);

        $cleaned = Purify::config('mochirii_rich_text')->clean($html);

        $cleaned = preg_replace('/\s+/', ' ', $cleaned);
        $cleaned = trim($cleaned);

        return $cleaned;
    }
}
