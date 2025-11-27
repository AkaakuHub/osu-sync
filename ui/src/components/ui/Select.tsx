import React from "react";
import { tv } from "tailwind-variants";

const select = tv({
	base: "flex h-12 w-full rounded-xl border border-border bg-surface px-4 py-3 text-base ring-offset-surface placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 hover:border-border/80 shadow-sm hover:shadow-md",
});

const Select = React.forwardRef<
	HTMLSelectElement,
	React.SelectHTMLAttributes<HTMLSelectElement> & {
		children: React.ReactNode;
	}
>(({ className, children, ...props }, ref) => {
	return (
		<select className={select({ className })} ref={ref} {...props}>
			{children}
		</select>
	);
});

Select.displayName = "Select";

export default Select;
