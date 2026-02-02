export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-black text-zinc-300 p-8 font-mono">
      <div className="max-w-3xl mx-auto border border-zinc-800 p-8 bg-zinc-950">
        <h1 className="text-3xl text-white mb-6 border-b border-zinc-800 pb-4">
          Privacy Policy
        </h1>
        <p className="mb-4 text-sm">Last Updated: February 2, 2026</p>

        <section className="space-y-6">
          <div>
            <h2 className="text-white text-lg mb-2 underline">1. Overview</h2>
            <p>
              The **Seat Finder for Cinemark** extension and web app are tools designed to help users find contiguous seating. We prioritize transparency and do not collect personal data.
            </p>
          </div>

          <div>
            <h2 className="text-white text-lg mb-2 underline">2. Data Access</h2>
            <p>
              The extension accesses **Website Content** from cinemark.com strictly to retrieve showtime and seat availability. This data is passed directly to the web app and is not stored or logged.
            </p>
          </div>

          <div>
            <h2 className="text-white text-lg mb-2 underline">3. No Data Collection</h2>
            <p>
              We do **not** collect, store, or share:
            </p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
              <li>Personally Identifiable Information (PII)</li>
              <li>Browsing History</li>
              <li>Location Data or IP addresses</li>
            </ul>
          </div>

          <div>
            <h2 className="text-white text-lg mb-2 underline">4. Contact</h2>
            <p>
              For questions regarding this policy, please visit the project repository on GitHub.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}