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
          <h1 className="text-2xl font-bold text-primary" style={{ fontFamily: "'Marcellus', serif" }}>Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Last updated: March 1, 2026</p>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Information We Collect</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              When you create an account, we collect your chosen display name and a PIN for authentication. We do not collect email addresses, phone numbers, or other personal identifying information.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Game Data</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              We store game-related data including scores, chip balances, and game history to provide the gaming experience. This data is associated with your player account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your information is used solely to operate the game, maintain your account, and track game statistics. We do not sell, share, or distribute your information to third parties.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Data Storage</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your data is stored securely on cloud servers. PINs are hashed and never stored in plain text.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">For Exhibition Only</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              THR33s is for exhibition purposes only. No real money is involved. Chips have no monetary value.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you have questions about this privacy policy, please contact the game administrator.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
