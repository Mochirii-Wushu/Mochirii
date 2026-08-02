<?php

namespace Tests\Unit;

use App\Services\SanitizeService;
use App\Util\Lexer\Autolink;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class SanitizeServiceTest extends TestCase
{
    #[Test]
    public function plainTextRemovesActiveMarkupWithoutChangingOrdinaryText(): void
    {
        $service = app(SanitizeService::class);
        $payload = '<img src=x onerror=alert(1)>Visible<script>alert(2)</script>';
        $plainText = $service->plainText($payload);

        $this->assertStringNotContainsString('<', $plainText);
        $this->assertStringNotContainsString('onerror', $plainText);
        $this->assertStringContainsString('Visible', $plainText);
        $this->assertSame("First line\nSecond line", $service->plainText("First line\nSecond line"));
    }

    #[Test]
    public function richTextUsesTheFixedMochiriiAllowlistForHostileStoredHtml(): void
    {
        $service = app(SanitizeService::class);
        $payload = <<<'HTML'
<p class="mention unknown" onclick="alert(1)">Hello <strong>guild</strong><script>alert(2)</script><a href="javascript:alert(3)">bad</a><a href="https://example.com/path" onclick="alert(4)">safe</a><img src=x onerror="alert(5)"><svg><animate onbegin="alert(6)"></animate></svg></p>
HTML;

        $cleaned = $service->richText($payload);

        foreach (['<script', 'onclick', 'javascript:', '<img', 'onerror', '<svg', '<animate', 'class="mention unknown"'] as $forbidden) {
            $this->assertStringNotContainsString($forbidden, $cleaned);
        }
        $this->assertStringContainsString('class="mention"', $cleaned);
        $this->assertStringContainsString('<strong>guild</strong>', $cleaned);
        $this->assertStringContainsString('href="https://example.com/path"', $cleaned);
        $this->assertStringContainsString('rel="nofollow noreferrer noopener"', $cleaned);
        $this->assertStringContainsString('target="_blank"', $cleaned);
    }

    #[Test]
    public function autolinkEscapesHostileCaptionMarkupBeforeRichTextRendering(): void
    {
        $payload = '<img src=x onerror=alert(1)> Visit https://example.com/path';
        $autolinked = Autolink::create()->autolink($payload);
        $rendered = app(SanitizeService::class)->richText($autolinked);

        $this->assertStringNotContainsString('<img', $rendered);
        $this->assertStringNotContainsString('onerror', $rendered);
        $this->assertStringContainsString('Visit', $rendered);
        $this->assertStringContainsString('href="https://example.com/path"', $rendered);
    }

    #[Test]
    public function richTextAllowlistCannotBeExpandedByRuntimeEnvironment(): void
    {
        $config = config('purify.configs.mochirii_rich_text');

        $this->assertSame(
            'a[href|title|rel|class],p[class],span[class],strong,em,del,b,i,s,strike,blockquote,code,pre,h1,h2,h3,h4,h5,h6,ul,ol,li,br',
            $config['HTML.Allowed']
        );
        $this->assertSame(['http' => true, 'https' => true], $config['URI.AllowedSchemes']);
        $this->assertTrue($config['URI.DisableExternalResources']);
        $this->assertTrue($config['URI.DisableResources']);
    }

    #[Test]
    public function richTextIsIdempotentForReviewedFormattingAndHostileMarkup(): void
    {
        $service = app(SanitizeService::class);
        $payload = <<<'HTML'
<h2>Guild update</h2><p class="mention">Hello <strong>members</strong><br>See <a href="https://example.com/path">details</a>.</p><blockquote><code>sample</code></blockquote><ul><li>One</li><li>Two</li></ul><script>alert(1)</script>
HTML;

        $once = $service->richText($payload);

        $this->assertSame($once, $service->richText($once));
        $this->assertStringContainsString('<h2>Guild update</h2>', $once);
        $this->assertStringContainsString('<ul><li>One</li>', $once);
        $this->assertStringNotContainsString('<script', $once);
    }

    #[Test]
    public function cssTextCannotBreakOutOfItsStyleElement(): void
    {
        $service = app(SanitizeService::class);
        $css = 'body { color: #fff; } </style><script>alert(1)</script>';
        $cleaned = $service->cssText($css);

        $this->assertStringNotContainsString('<', $cleaned);
        $this->assertStringNotContainsString('</style', strtolower($cleaned));
        $this->assertStringContainsString('\\3C /style>', $cleaned);
        $this->assertSame('body { color: #fff; }', $service->cssText('body { color: #fff; }'));
        $this->assertSame($cleaned, $service->cssText($cleaned));
        $this->assertStringNotContainsString('<', $service->cssText('</StYlE><img src=x onerror=alert(2)>'));
    }
}
