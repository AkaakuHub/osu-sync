import React from "react";
import { tv } from "tailwind-variants";

const button = tv({
	base: "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50",
	variants: {
		variant: {
			primary: "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-500",
			secondary:
				"bg-slate-100 text-slate-900 hover:bg-slate-200 focus-visible:ring-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
			ghost:
				"hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-100",
			outline:
				"border border-slate-300 bg-white hover:bg-slate-50 focus-visible:ring-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800",
		},
		size: {
			sm: "text-xs px-2.5 py-1.5",
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
		variant?: "primary" | "secondary" | "ghost" | "outline";
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
