import React from "react";
import { tv } from "tailwind-variants";

const badge = tv({
	base: "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
	variants: {
		variant: {
			default: "border-transparent bg-blue-600 text-white hover:bg-blue-700",
			secondary:
				"border-transparent bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600",
			success: "border-transparent bg-green-500 text-white hover:bg-green-600",
			warning: "border-transparent bg-yellow-500 text-white hover:bg-yellow-600",
			error: "border-transparent bg-red-500 text-white hover:bg-red-600",
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
