<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\Test;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;
use SplFileInfo;
use Tests\TestCase;

class CsrfBootstrapContractTest extends TestCase
{
    #[Test]
    public function every_blade_layout_that_loads_the_app_bundle_emits_a_csrf_meta_token(): void
    {
        $views = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator(resource_path('views')),
        );
        $checkedLayouts = [];

        foreach ($views as $view) {
            if (! $view instanceof SplFileInfo || ! $view->isFile() || $view->getExtension() !== 'php') {
                continue;
            }

            $source = file_get_contents($view->getPathname());
            if (! is_string($source) || ! str_contains($source, "mix('js/app.js')")) {
                continue;
            }

            $checkedLayouts[] = $view->getPathname();
            $this->assertStringContainsString(
                '<meta name="csrf-token" content="{{ csrf_token() }}">',
                $source,
                "{$view->getPathname()} loads the application bundle without providing its CSRF token.",
            );
        }

        $this->assertNotEmpty($checkedLayouts);
    }

    #[Test]
    public function the_app_bootstrap_only_sets_the_csrf_header_when_the_token_exists(): void
    {
        $source = file_get_contents(resource_path('assets/js/app.js'));

        $this->assertIsString($source);
        $this->assertMatchesRegularExpression(
            "/let token = document\\.head\\.querySelector\\('meta\\[name=\"csrf-token\"\\]'\\);\\s*if \\(token\\) \\{\\s*window\\.axios\\.defaults\\.headers\\.common\\['X-CSRF-TOKEN'\\] = token\\.content;/s",
            $source,
        );
    }
}
