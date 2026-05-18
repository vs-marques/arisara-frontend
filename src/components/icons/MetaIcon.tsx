import { siMeta } from 'simple-icons';
import { cn } from '@/lib/utils';

interface MetaIconProps {
  className?: string;
  size?: number;
}

/** Logo Meta — path oficial do pacote [Simple Icons](https://simpleicons.org/) (CC0). */
export function MetaIcon({ className, size = 24 }: MetaIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      role="img"
      aria-label={siMeta.title}
    >
      <path fill="currentColor" d={siMeta.path} />
    </svg>
  );
}
