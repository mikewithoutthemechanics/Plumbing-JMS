import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(37,99,235,0.30)] hover:bg-primary/90 hover:-translate-y-0.5',
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_8px_20px_rgba(239,68,68,0.25)] hover:bg-destructive/90 hover:-translate-y-0.5',
        outline:
          'border border-input bg-white/70 hover:bg-white hover:text-primary',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-secondary/70 hover:text-secondary-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 py-2 px-4',
        sm: 'h-9 px-3 rounded-md',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Change the base component to render (e.g., 'a' for links) */
  asChild?: boolean;
  /** Override or extend the styles applied to the component */
  className?: string;
}

const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Component = asChild ? 'a' : 'button';
  return (
    <Component
      className={twMerge(buttonVariants({ variant, size, className }))}
      ref={ref as unknown as React.Ref<HTMLAnchorElement> & React.Ref<HTMLButtonElement>}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    />
  );
});
Button.displayName = 'Button';

export { Button };