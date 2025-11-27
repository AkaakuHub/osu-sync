import React from "react";
import { tv } from "tailwind-variants";

const badge = tv({
	base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2",
	variants: {
		variant: {
			default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
			secondary:
				"border-transparent bg-surface-variant text-surface-variant-foreground hover:bg-surface",
			success: "border-transparent bg-success text-success-foreground hover:bg-success/90",
			warning: "border-transparent bg-warning text-warning-foreground hover:bg-warning/90",
			error: "border-transparent bg-error text-error-foreground hover:bg-error/90",
		},
	},
	defaultVariants: {
		variant: "default",
	},
});

const Badge = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & {
		variant?: "default" | "secondary" | "success" | "warning" | "error";
		children: React.ReactNode;
	}
>(({ className, variant, children, ...props }, ref) => {
	return (
		<div ref={ref} className={badge({ variant, className })} {...props}>
			{children}
		</div>
	);
});

Badge.displayName = "Badge";

export default Badge;
