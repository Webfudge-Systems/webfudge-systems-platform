export default function AccountsHome() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-light to-light-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-brand-dark mb-4">
            Account Management
          </h1>
          <p className="text-xl text-dark-600 mb-8">
            Billing, Subscriptions & Organization
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
            <div className="bg-brand-white p-6 rounded-lg shadow-soft hover:shadow-brand-sm transition-shadow">
              <h3 className="text-2xl font-semibold text-brand-primary mb-2">Users</h3>
              <p className="text-dark-600">Manage user accounts</p>
            </div>
            <div className="bg-brand-white p-6 rounded-lg shadow-soft hover:shadow-brand-sm transition-shadow">
              <h3 className="text-2xl font-semibold text-brand-primary mb-2">Subscriptions</h3>
              <p className="text-dark-600">Handle subscriptions</p>
            </div>
            <div className="bg-brand-white p-6 rounded-lg shadow-soft hover:shadow-brand-sm transition-shadow">
              <h3 className="text-2xl font-semibold text-brand-primary mb-2">Invoices</h3>
              <p className="text-dark-600">Track invoices</p>
            </div>
            <div className="bg-brand-white p-6 rounded-lg shadow-soft hover:shadow-brand-sm transition-shadow">
              <h3 className="text-2xl font-semibold text-brand-primary mb-2">Audit Logs</h3>
              <p className="text-dark-600">Monitor activities</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
