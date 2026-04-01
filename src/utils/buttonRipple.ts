import { useCallback, useRef, type MouseEvent, type RefObject } from 'react';

/** Classe base (index.css — animação ripple-animate). */
export const RIPPLE_DEFAULT = 'ripple-effect';

/** Ripple um pouco mais claro sobre fundos pink-500 (Saturno). */
export const RIPPLE_SATURNO_PINK = 'ripple-effect ripple-effect-saturno-pink';

export function appendButtonRipple(
  e: MouseEvent<HTMLButtonElement>,
  ref: RefObject<HTMLButtonElement | null>,
  rippleClassName: string = RIPPLE_DEFAULT,
): void {
  const button = ref.current;
  if (!button || button.disabled) return;

  const rect = button.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const ripple = document.createElement('span');
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.className = rippleClassName;

  button.appendChild(ripple);

  window.setTimeout(() => {
    ripple.remove();
  }, 1000);
}

export function useButtonRipple(rippleClassName: string = RIPPLE_DEFAULT) {
  const ref = useRef<HTMLButtonElement>(null);
  const onMouseEnter = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      appendButtonRipple(e, ref, rippleClassName);
    },
    [rippleClassName],
  );
  return { ref, onMouseEnter };
}
