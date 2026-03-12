import { InputHTMLAttributes, forwardRef } from 'react';

interface GlowInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
}

export const GlowInput = forwardRef<HTMLInputElement, GlowInputProps>(
  ({ icon, label, className = '', ...props }, ref) => {
    return (
      <div className="relative">
        {label && (
          <label className="block text-sm font-medium text-white/90 mb-2">
            {label}
          </label>
        )}
        <div className="relative h-11 overflow-hidden">
          <input
            ref={ref}
            className={`peer relative z-10 h-full w-full rounded-md border border-white/8 bg-white/2 ${
              icon ? 'pr-4 pl-11' : 'px-4'
            } duration-300 placeholder:text-white/20 focus:outline-0 text-white ${className}`}
            {...props}
          />
          {icon && (
            <div className="pointer-events-none absolute top-3 left-3.5 z-20 mt-px h-4.5 w-4.5 text-white/20 duration-300 peer-focus-visible:text-white">
              {icon}
            </div>
          )}
          <span className="absolute bottom-0 left-0 z-20 h-px w-full bg-gradient-to-r from-transparent from-5% via-white to-transparent to-95% opacity-0 transition-opacity duration-300 peer-focus-visible:opacity-40"></span>
          <span className="absolute inset-x-4 bottom-0 z-10 h-4 origin-bottom scale-y-0 -skew-x-12 bg-gradient-to-b from-white to-transparent opacity-0 blur-md duration-300 peer-focus-visible:scale-100 peer-focus-visible:opacity-30"></span>
        </div>
      </div>
    );
  }
);

GlowInput.displayName = 'GlowInput';

