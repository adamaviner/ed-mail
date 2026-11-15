// The package's own few primitives, on @base-ui/react, so it never imports an app's components.
// They use the shadcn theme token names (bg-primary, bg-muted, ...) the apps define.
import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cn } from '../cn.js'

const VARIANTS = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/80',
  outline: 'border-border bg-background hover:bg-muted',
  ghost: 'hover:bg-muted',
  destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
  link: 'text-primary underline-offset-4 hover:underline',
}

const SIZES = {
  sm: 'h-7 gap-1 px-2.5 text-[0.8rem]',
  icon: 'size-7',
}

export type ButtonProps = Omit<ButtonPrimitive.Props, 'className'> & { className?: string; variant?: keyof typeof VARIANTS; size?: keyof typeof SIZES }

export function Button({ className, variant = 'default', size = 'sm', ...props }: ButtonProps) {
  return (
    <ButtonPrimitive
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
}
