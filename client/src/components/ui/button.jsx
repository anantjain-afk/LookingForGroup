import { cn } from "../../lib/utils.js";

/**
 * Button Component
 * Reusable button with variants
 */
export const Button = ({
  children,
  variant = "default",
  size = "default",
  className,
  ...props
}) => {
  const variants = {
    default: "bg-primary-500 hover:bg-primary-600 text-white",
    outline: "border border-gray-700 hover:bg-dark-lighter text-white",
    ghost: "hover:bg-dark-lighter text-white",
  };

  const sizes = {
    default: "px-4 py-2 text-sm",
    sm: "px-3 py-1.5 text-xs",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button
      className={cn(
        "rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-dark disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Avatar Component
 * User avatar with fallback
 */
export const Avatar = ({ src, alt, fallback, className }) => {
  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        <div className="w-full h-full rounded-full bg-dark-lighter border border-gray-700 flex items-center justify-center text-gray-400 text-sm font-medium">
          {fallback || alt?.[0]?.toUpperCase()}
        </div>
      )}
    </div>
  );
};

/**
 * Spinner Component
 * Loading spinner
 */
export const Spinner = ({ className, size = "default" }) => {
  const sizes = {
    sm: "w-4 h-4 border-2",
    default: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-3",
  };

  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full border-primary-500 border-r-transparent",
        sizes[size],
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};
