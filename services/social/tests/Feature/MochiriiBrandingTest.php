<?php

namespace Tests\Feature;

use App\Mail\AdminInviteEmail;
use App\Models\AdminInvite;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class MochiriiBrandingTest extends TestCase
{
    #[Test]
    public function public_email_subject_does_not_use_the_technical_application_name(): void
    {
        config([
            'app.name' => 'Mochirii',
            'mochirii-branding.display_name' => 'Mōchirīī Social',
        ]);

        $mail = new AdminInviteEmail(new AdminInvite());

        $this->assertSame(
            'You\'ve been invited to join Mōchirīī Social!',
            $mail->envelope()->subject,
        );
    }
}
