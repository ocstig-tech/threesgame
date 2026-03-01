import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-felt p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-6 text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 card-glow space-y-6 text-foreground">
          <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: "'Marcellus', serif" }}>Privacy Policy for THR33s — Dice Game</h1>
          <p className="text-sm text-muted-foreground">Effective Date: March 1, 2026</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            This Privacy Policy describes how THR33s ("we", "us", or "our") collects, uses, and shares information when you use our mobile application and related services.
          </p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you create a player account, we collect your chosen player name and a 4-digit PIN code. We do not collect your real name, email address, phone number, or any government-issued identification. We also collect basic gameplay data including game results, scores, and session activity to operate the game.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We use the information we collect to operate and maintain the THR33s game, allow you to sign in and participate in multiplayer games, display game results and leaderboards within the app, and improve the performance and features of the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">3. Data Storage</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your account information and game data are stored securely using Supabase, a third-party database provider. Data is stored on servers in the United States. We retain your data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">4. Information Sharing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We do not share your data with advertisers. Your player name may be visible to other players within a shared game room. We may disclose information if required by law or to protect the rights and safety of our users.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">5. Children's Privacy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              THR33s is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected information from a child under 13, please contact us immediately and we will delete it.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">6. Security</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We take reasonable measures to protect your information from unauthorized access, alteration, or disclosure. However, no method of transmission over the internet or electronic storage is 100% secure. We encourage you to use a unique PIN code and not share your account credentials.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">7. Third-Party Services</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              THR33s uses Supabase for backend database and authentication services. Their privacy policy is available at{" "}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary underline">supabase.com/privacy</a>.
              We do not use advertising networks, analytics SDKs, or any other third-party data collection services within the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">8. Your Rights</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may request access to, correction of, or deletion of your personal data at any time. To do so, contact us at the email address below. We will respond to all requests within 30 days.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">9. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any significant changes by updating the effective date at the top of this page. Continued use of the app after changes are posted constitutes your acceptance of the updated policy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">10. Contact Us</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground">THR33s — Dice Game</p>
              <p>Website: <a href="https://threes.app" target="_blank" rel="noopener noreferrer" className="text-primary underline">threes.app</a></p>
              <p>Email: <a href="mailto:support@threes.app" className="text-primary underline">support@threes.app</a></p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
