<style>
    :root {
        --mochirii-safe-top: env(safe-area-inset-top, 0px);
        --mochirii-safe-right: env(safe-area-inset-right, 0px);
        --mochirii-safe-bottom: env(safe-area-inset-bottom, 0px);
        --mochirii-safe-left: env(safe-area-inset-left, 0px);
    }

    html {
        min-width: 0;
        min-height: 100%;
    }

    body.mochirii-social-entry-page {
        min-width: 0;
        min-height: 100vh;
        min-height: 100dvh;
        margin: 0;
        overflow-x: hidden;
        overflow-y: auto;
        overscroll-behavior-y: contain;
        scroll-padding-top: max(1rem, var(--mochirii-safe-top));
        scroll-padding-bottom: max(1rem, var(--mochirii-safe-bottom));
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
    }

    body.mochirii-social-entry-page--login {
        display: flex;
        flex-direction: column;
    }

    body.mochirii-social-entry-page--login > nav,
    body.mochirii-social-entry-page--login > footer {
        flex: 0 0 auto;
    }

    body.mochirii-social-entry-page--login > #content {
        display: flex;
        flex: 1 0 auto;
        min-width: 0;
        min-height: 0;
    }

    .mochirii-social-entry-shell {
        width: 100%;
        min-width: 0;
        padding-top: max(clamp(1rem, 4vh, 3rem), var(--mochirii-safe-top));
        padding-right: max(clamp(1rem, 4vw, 3rem), var(--mochirii-safe-right));
        padding-bottom: max(clamp(1rem, 4vh, 3rem), var(--mochirii-safe-bottom));
        padding-left: max(clamp(1rem, 4vw, 3rem), var(--mochirii-safe-left));
    }

    body.mochirii-social-entry-page--landing .mochirii-social-entry-shell {
        display: grid;
        min-height: 100vh;
        min-height: 100dvh;
        place-items: center;
    }

    body.mochirii-social-entry-page--login .mochirii-social-entry-shell {
        display: flex;
        flex: 1 0 auto;
        align-items: center;
        justify-content: center;
    }

    body.mochirii-social-entry-page :is(a, button, input, select, textarea):focus {
        scroll-margin-top: max(1rem, var(--mochirii-safe-top));
        scroll-margin-bottom: max(1rem, var(--mochirii-safe-bottom));
    }

    @media (max-height: 600px) {
        .mochirii-social-entry-shell {
            padding-top: max(0.75rem, var(--mochirii-safe-top));
            padding-bottom: max(0.75rem, var(--mochirii-safe-bottom));
        }

        body.mochirii-social-entry-page--login .mochirii-social-entry-shell {
            align-items: flex-start;
        }
    }

    @media (max-width: 640px) {
        body.mochirii-social-entry-page {
            background-attachment: scroll !important;
        }

        body.mochirii-social-entry-page input,
        body.mochirii-social-entry-page select,
        body.mochirii-social-entry-page textarea {
            font-size: 1rem;
        }
    }
</style>
