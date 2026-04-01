import { clsx } from "clsx";

export function Card({
  children,
  className,
  title,
  subtitle,
  actions,
  padding = true,
  hoverable = false,
  variant = "default",
  glass = false,
  gradient = false,
  gradientType = "glass",
  onClick,
  ...props
}) {
  const variants = {
    default: "bg-white border border-gray-100 shadow-sm",
    // Material elevation — slightly deeper shadow for clearer separation from page bg
    elevated:
      "bg-white border-0 shadow-[0_3px_16px_rgba(15,23,42,0.10),0_2px_5px_rgba(15,23,42,0.06)]",
    outlined: "bg-white border border-gray-200",
    ghost: "bg-transparent border-0",
    glass: "bg-white/95 backdrop-blur-xl border border-white/30 shadow-lg",
    "glass-strong":
      "bg-white/98 backdrop-blur-2xl border border-white/40 shadow-xl",
  };

  const gradientVariants = {
    glass:
      "bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl",
    warm: "bg-gradient-to-br from-white/90 via-orange-50/80 to-amber-50/70 backdrop-blur-xl",
    sunset:
      "bg-gradient-to-br from-white/90 via-orange-100/80 to-red-50/70 backdrop-blur-xl",
    coral:
      "bg-gradient-to-br from-white/90 via-rose-50/80 to-orange-50/70 backdrop-blur-xl",
    peach:
      "bg-gradient-to-br from-white/90 via-peach-50/80 to-orange-50/70 backdrop-blur-xl",
  };

  const getVariantClasses = () => {
    if (gradient && gradientType) {
      return `${gradientVariants[gradientType]} border border-white/20 shadow-xl`;
    }
    if (glass) {
      return variants.glass;
    }
    return variants[variant] || variants.default;
  };

  const getHoverClasses = () => {
    if (glass || gradient) {
      return "hover:shadow-2xl hover:border-white/40 hover:scale-[1.02] hover:bg-white/95";
    }
    if (variant === "elevated") {
      return "hover:shadow-[0_6px_26px_rgba(15,23,42,0.13),0_3px_8px_rgba(15,23,42,0.07)]";
    }
    return "hover:shadow-md hover:border-gray-200";
  };

  return (
    <div
      className={clsx(
        "rounded-xl transition-all duration-300",
        getVariantClasses(),
        hoverable && `${getHoverClasses()} cursor-pointer`,
        padding && "p-6",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between mb-6">
          <div>
            {title && (
              <h3
                className={clsx(
                  "text-lg font-semibold",
                  glass || gradient ? "text-gray-800" : "text-gray-900"
                )}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                className={clsx(
                  "text-sm mt-1",
                  glass || gradient ? "text-gray-600" : "text-gray-600"
                )}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export default Card;
