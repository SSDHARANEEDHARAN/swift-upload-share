import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-display text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly, such as your email address when you create an account, and files you upload to our service. We also collect usage data to improve our service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
            <p>We use your information to provide and improve our file sharing service, communicate with you about your account, and ensure the security of our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">3. File Privacy</h2>
            <p>Files you upload are stored securely. Share links are generated with unique tokens, and only those with the link can access your files. We do not access or view your files except as required for service operation.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Data Retention</h2>
            <p>Files are retained according to the expiration settings you choose. After expiration, files are automatically deleted from our servers. Account data is retained until you delete your account.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">5. Data Security</h2>
            <p>We implement industry-standard security measures to protect your data, including encryption in transit and at rest. However, no system is completely secure, and we cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">6. Third-Party Services</h2>
            <p>We may use third-party services for analytics and infrastructure. These services have their own privacy policies and may collect data according to their terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">7. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data. You can manage your data through your account settings or by contacting us.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">8. Cookies</h2>
            <p>We use cookies to maintain your session and preferences. You can control cookies through your browser settings, though some features may not work without them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes through the service or via email.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
            <p>If you have questions about this Privacy Policy or your data, please contact us through our Help Center.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
