import { Button as ButtonPrimitive } from '@base-ui/react/button';
declare const VARIANTS: {
    default: string;
    outline: string;
    ghost: string;
    destructive: string;
    link: string;
};
declare const SIZES: {
    sm: string;
    icon: string;
};
export type ButtonProps = Omit<ButtonPrimitive.Props, 'className'> & {
    className?: string;
    variant?: keyof typeof VARIANTS;
    size?: keyof typeof SIZES;
};
export declare function Button({ className, variant, size, ...props }: ButtonProps): import("react").JSX.Element;
export {};
//# sourceMappingURL=button.d.ts.map