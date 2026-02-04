'use client'

export default function QuoteSection() {
  return (
    <section className="relative min-h-[50vh] overflow-hidden py-24 px-4">
      {/* Animated Background Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-orange-100 to-yellow-100 animate-gradient-shift"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-orange-200/40 via-pink-200/40 to-yellow-200/40 animate-gradient-pulse"></div>
      </div>

      {/* Cubic Glass Gradient Container */}
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="group relative">
          {/* Glass morphism effect with cubic gradient */}
          <div className="relative backdrop-blur-xl bg-gradient-to-br from-white/60 via-white/40 to-white/30 rounded-3xl p-12 md:p-16 shadow-2xl border border-white/50">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-400/10 via-pink-400/10 to-yellow-400/10 animate-gradient-rotate opacity-70"></div>

            {/* Content */}
            <div className="relative z-10 text-center">
              <div className="mb-6">
                <svg
                  className="w-16 h-16 mx-auto text-brand-primary/30"
                  fill="currentColor"
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                >
                  <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
                </svg>
              </div>

              <blockquote>
                <p className="text-3xl md:text-4xl lg:text-5xl font-bold text-brand-dark mb-6 leading-tight">
                  What gets measured
                  <br />
                  gets managed.
                </p>
                <footer className="text-lg md:text-xl text-gray-600 font-medium">
                  — Peter Drucker
                </footer>
              </blockquote>
            </div>

            {/* Decorative gradient orbs */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-gradient-to-br from-orange-300/30 to-pink-300/30 rounded-full blur-3xl animate-pulse-slow"></div>
            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-gradient-to-br from-yellow-300/30 to-orange-300/30 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
          </div>

          {/* Floating shadow effect */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-orange-200/20 to-pink-200/20 rounded-3xl blur-2xl transform translate-y-4 group-hover:translate-y-6 transition-transform duration-500"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes gradient-shift {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        @keyframes gradient-pulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
        }

        @keyframes gradient-rotate {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        .animate-gradient-shift {
          animation: gradient-shift 8s ease-in-out infinite;
        }

        .animate-gradient-pulse {
          animation: gradient-pulse 6s ease-in-out infinite;
        }

        .animate-gradient-rotate {
          animation: gradient-rotate 20s linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </section>
  )
}
