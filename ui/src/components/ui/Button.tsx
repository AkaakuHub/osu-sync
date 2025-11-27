import React from "react";
import { tv } from "tailwind-variants";

const button = tv({
	base: "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 shadow-sm hover:shadow-md",
	variants: {
		variant: {
			primary:
				"bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary/50 shadow-lg hover:shadow-xl",
			secondary:
				"bg-surface text-surface-foreground hover:bg-surface-variant border border-border focus-visible:ring-accent/50",
			ghost: "hover:bg-surface/50 text-text hover:text-text-secondary focus-visible:ring-accent/30",
			outline:
				"border border-border bg-transparent hover:bg-surface/50 text-text focus-visible:ring-primary/30",
			success:
				"bg-success text-success-foreground hover:bg-success/90 focus-visible:ring-success/50",
			warning:
				"bg-warning text-warning-foreground hover:bg-warning/90 focus-visible:ring-warning/50",
			error: "bg-error text-error-foreground hover:bg-error/90 focus-visible:ring-error/50",
			osu: "bg-gradient-to-r from-accent to-osu-pink text-osu-foreground hover:from-accent/90 hover:to-osu-pink/90 focus-visible:ring-accent/50 shadow-lg hover:shadow-xl",
		},
		size: {
			sm: "text-xs px-3 py-1.5",
			md: "text-sm px-4 py-2",
			lg: "text-base px-6 py-3",
		},
	},
	defaultVariants: {
		variant: "primary",
		size: "md",
	},
});

const Button = React.forwardRef<
	HTMLButtonElement,
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		variant?:
			| "primary"
			| "secondary"
			| "ghost"
			| "outline"
			| "success"
			| "warning"
			| "error"
			| "osu";
		size?: "sm" | "md" | "lg";
		isLoading?: boolean;
		children: React.ReactNode;
	}
>(({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
	return (
		<button
			className={button({ variant, size, className })}
			ref={ref}
			disabled={disabled || isLoading}
			{...props}
		>
			{isLoading && (
				<svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
					<circle
						className="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						strokeWidth="4"
					/>
					<path
						className="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					/>
				</svg>
			)}
			{children}
		</button>
	);
});

Button.displayName = "Button";

export default Button;
