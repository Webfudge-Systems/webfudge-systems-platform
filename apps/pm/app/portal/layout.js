export const metadata = {
  title: 'Client portal',
  description: 'Follow your projects, approve deliverables and send requests to your project team.',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }) {
  return <div className="min-h-screen bg-[#F7F6F3] text-gray-900">{children}</div>;
}
