import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-3xl font-bold mb-8">Terms & Conditions</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>By accessing and using Rise to Live, you accept and agree to be bound by these Terms and Conditions. If you do not agree, please do not use our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Use of Service</h2>
            <p>You may use our file sharing service for lawful purposes only. You agree not to upload, share, or distribute any content that is illegal, harmful, or violates the rights of others.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. File Storage</h2>
            <p>Files uploaded to our service are stored temporarily and may be deleted after the expiration period. We are not responsible for any data loss. Please keep backups of your important files.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. User Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account. You must not share malware, viruses, or any harmful content.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property</h2>
            <p>You retain ownership of any content you upload. By using our service, you grant us a limited license to store and transmit your files for the purpose of providing the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Limitation of Liability</h2>
            <p>Rise to Live is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Continued use of the service after changes constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Contact</h2>
            <p>If you have any questions about these Terms & Conditions, please contact us through our Help Center.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
