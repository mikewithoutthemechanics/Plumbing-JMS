import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { twMerge } from 'tailwind-merge';

const cardVariants = cva(
  'rounded-lg border bg-white text-shadow-dark ring-offset-background',
  {
    variants: {
      variant: {
        default: '',
        destructive: 'border-destructive/50 bg-destructive text-destructive',
        outline: 'border-primary/20',
        secondary: 'border-secondary/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface CardProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof cardVariants> {
  children?: React.ReactNode;
  className?: string;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      className={cardVariants({ variant, className })}
      ref={ref}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const cardHeaderVariants = cva('flex flex-col space-y-1.5 p-6', {
  variants: {
    variant: {
      default: 'border-b pb-4',
      empty: 'p-0',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface CardHeaderProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof cardHeaderVariants> {
  children?: React.ReactNode;
  className?: string;
}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      className={cardHeaderVariants({ variant, className })}
      ref={ref}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const cardTitleVariants = cva('text-lg font-semibold leading-none tracking-tight', {
  variants: {
    variant: {
      default: '',
      destructive: 'text-destructive',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof cardTitleVariants> {
  children?: React.ReactNode;
  className?: string;
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, variant, ...props }, ref) => (
    <h3
      className={cardTitleVariants({ variant, className })}
      ref={ref}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const cardContentVariants = cva('p-6 pt-0', {
  variants: {
    variant: {
      default: '',
      dotted: 'border-dotted border-t',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardContentVariants> {
  children?: React.ReactNode;
  className?: string;
}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      className={cardContentVariants({ variant, className })}
      ref={ref}
      {...props}
    />
  )
);
CardContent.displayName = 'CardContent';